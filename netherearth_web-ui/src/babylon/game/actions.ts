import { CW_DIRS } from './warmap';
import type { WarMap, RobotObject, MapObject, Direction } from './warmap';
import type { OccupancyMap } from './occupancy';
import { RotateDir } from './rotate-dir';
import { isOccupied, updateRobotPosition } from './occupancy';
import { getTerrainRule, Chassis } from './terrain';
import { WEAPON_DAMAGE, WEAPON_RANGE, calcDamageFalloff } from '../data/robot';
import { spawnProjectile } from './projectile';

export type { Direction };

export enum ActionType {
    /** Move one step forward in the current facing direction. */
    MOVE   = 'move',
    /** Rotate 90° clockwise (right) or counter-clockwise (left). */
    ROTATE = 'rotate',
    /** Fire the equipped weapon at a target robot. */
    FIRE   = 'fire',
    /** Do nothing this tick. */
    IDLE   = 'idle',
}

export { RotateDir };

export type RobotAction =
    | { type: ActionType.MOVE;   direction: Direction }
    | { type: ActionType.ROTATE; direction: RotateDir }
    | { type: ActionType.FIRE;   targetId: string }
    | { type: ActionType.IDLE };

// Robots move in 1/4 grid increments per tick (4 ticks to cross one cell)
export const MOVE_STEP = 0.25;

// Map coordinate system:
//   x: 0 = west edge, increases eastward,  max center = width−1
//   y: 0 = north edge, increases southward, max center = height−1
// Tiles are centered at integer positions, so tile (x,y) occupies [x−0.5, x+0.5] in world space.
// Robot center is kept in [0, width−1] × [0, height−1]; body (±0.5) then stays within the tile grid.
const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
    N: { dx:  0, dy: -MOVE_STEP },
    S: { dx:  0, dy:  MOVE_STEP },
    E: { dx:  MOVE_STEP, dy:  0 },
    W: { dx: -MOVE_STEP, dy:  0 },
};

// Primary cardinal direction from (fromX, fromY) toward (toX, toY).
function directionToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
    return dy > 0 ? 'S' : 'N';
}

function getTileSubtype(warMap: WarMap, x: number, y: number): string {
    const tile = warMap.objects.find(
        (o): o is MapObject => o.type === 'tile' && o.x === Math.floor(x) && o.y === Math.floor(y),
    );
    return tile?.subtype ?? 'G';
}

// Apply an action to a robot, respecting terrain + occupancy.
// Returns true if the action was executed, false if blocked.
export function applyAction(
    robot: RobotObject,
    action: RobotAction,
    warMap: WarMap,
    occupancy: OccupancyMap,
): boolean {
    if (action.type === ActionType.IDLE) return false;

    if (action.type === ActionType.ROTATE) {
        const idx = CW_DIRS.indexOf(robot.facing ?? 'N');
        robot.facing = CW_DIRS[(idx + (action.direction === RotateDir.RIGHT ? 1 : 3)) % 4];
        return true;
    }

    if (action.type === ActionType.FIRE) {
        robot.lastFiredAt = warMap.tick ?? 0;
        const target = warMap.objects.find(
            (o): o is RobotObject => o.id === action.targetId && o.type === 'robot',
        );
        if (target) {
            const weapon = robot.robotConfig?.weapon;
            if (weapon && target.health !== undefined) {
                const baseDmg  = WEAPON_DAMAGE[weapon] ?? 0;
                const maxRange = WEAPON_RANGE[weapon]  ?? 1;
                const dist     = Math.abs(target.x - robot.x) + Math.abs(target.y - robot.y);
                const dmg      = Math.round(baseDmg * calcDamageFalloff(dist, maxRange));
                target.health  = Math.max(0, target.health - dmg);
            }
            target.facing = directionToward(target.x, target.y, robot.x, robot.y);
            spawnProjectile(warMap, robot, target);
        }
        return true;
    }

    // move — robot must be facing the requested direction
    if ((robot.facing ?? 'N') !== action.direction) return false;

    const chassis = robot.robotConfig?.chassis ?? Chassis.TRACKS;
    const { dx, dy } = DIR_DELTA[action.direction];
    const tx = robot.x + dx;
    const ty = robot.y + dy;

    if (tx < 0 || tx > warMap.width - 1 || ty < 0 || ty > warMap.height - 1) return false;

    const tileSubtype = getTileSubtype(warMap, tx, ty);
    const rule = getTerrainRule(tileSubtype, chassis);

    if (!rule.passable) return false;
    if (isOccupied(occupancy, tx, ty, robot.id)) return false;

    if (rule.speedFactor < 1) {
        robot.nav ??= {};
        robot.nav.slowCounter = (robot.nav.slowCounter ?? 0) + rule.speedFactor;
        if (robot.nav.slowCounter < 1) return false;
        robot.nav.slowCounter -= 1;
    }

    robot.x = tx;
    robot.y = ty;
    updateRobotPosition(occupancy, robot.id, tx, ty);

    return true;
}
