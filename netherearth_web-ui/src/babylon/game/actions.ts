import type { WarMap, WarObject } from './warmap';
import type { OccupancyMap } from './occupancy';
import { isOccupied, updateRobotPosition } from './occupancy';
import { getTerrainRule, chassisTypeOf } from './terrain';
import { WEAPON_DAMAGE, WEAPON_RANGE, calcDamageFalloff } from '../data/robot';
import { spawnProjectile } from './projectile';

export type Direction = 'N' | 'E' | 'S' | 'W';

export type RobotAction =
    | { type: 'move'; direction: Direction }
    | { type: 'rotate'; direction: 'left' | 'right' }
    | { type: 'fire'; targetId: string }
    | { type: 'idle' };

// Robots move in 1/4 grid increments per tick (4 ticks to cross one cell)
export const MOVE_STEP = 0.25;

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
    N: { dx:  0, dy: -MOVE_STEP },
    S: { dx:  0, dy:  MOVE_STEP },
    E: { dx:  MOVE_STEP, dy:  0 },
    W: { dx: -MOVE_STEP, dy:  0 },
};

// Convert a rotation (radians) to the nearest cardinal Direction.
// Weapon is along local +X: rotation=0 → world +X → East.
export function rotationToDirection(rotation: number): Direction {
    const normalized = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.round(normalized / (Math.PI / 2)) % 4;
    return (['E', 'N', 'W', 'S'] as Direction[])[idx];
}

// Primary cardinal direction from (fromX, fromY) toward (toX, toY).
function directionToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
    return dy > 0 ? 'S' : 'N';
}

export function directionToRotation(dir: Direction): number {
    return { E: 0, N: Math.PI / 2, W: Math.PI, S: -Math.PI / 2 }[dir];
}

function getTileSubtype(warMap: WarMap, x: number, y: number): string {
    // Tile lookup uses integer cell coordinates
    const tile = warMap.objects.find(o => o.type === 'tile' && o.x === Math.floor(x) && o.y === Math.floor(y));
    return tile?.subtype ?? 'G';
}

// Apply an action to a robot, respecting terrain + occupancy.
// Returns true if the action was executed, false if blocked.
export function applyAction(
    robot: WarObject,
    action: RobotAction,
    warMap: WarMap,
    occupancy: OccupancyMap,
): boolean {
    if (action.type === 'idle') return false;

    if (action.type === 'rotate') {
        const delta = action.direction === 'right' ? Math.PI / 2 : -Math.PI / 2;
        robot.rotation = (robot.rotation ?? 0) + delta;
        return true;
    }

    if (action.type === 'fire') {
        robot.lastFiredAt = warMap.tick ?? 0;
        const target = warMap.objects.find(o => o.id === action.targetId);
        if (target) {
            const weapon = robot.robotConfig?.weapon;
            if (weapon && target.health !== undefined) {
                const baseDmg  = WEAPON_DAMAGE[weapon] ?? 0;
                const maxRange = WEAPON_RANGE[weapon]  ?? 1;
                const dist     = Math.abs(target.x - robot.x) + Math.abs(target.y - robot.y);
                const dmg      = Math.round(baseDmg * calcDamageFalloff(dist, maxRange));
                target.health  = Math.max(0, target.health - dmg);
            }
            // Target immediately rotates to face the attacker
            target.rotation = directionToRotation(directionToward(target.x, target.y, robot.x, robot.y));
            spawnProjectile(warMap, robot, target);
        }
        return true;
    }

    // move — robot must be facing the requested direction
    if (rotationToDirection(robot.rotation ?? 0) !== action.direction) return false;

    const chassis = chassisTypeOf(robot.robotConfig?.chassis ?? 'tracks');
    const { dx, dy } = DIR_DELTA[action.direction];
    const tx = robot.x + dx;
    const ty = robot.y + dy;

    if (tx < 0 || tx >= warMap.width || ty < 0 || ty >= warMap.height) return false;

    const tileSubtype = getTileSubtype(warMap, tx, ty);
    const rule = getTerrainRule(tileSubtype, chassis);

    if (!rule.passable) return false;
    if (isOccupied(occupancy, tx, ty, robot.id)) return false;

    // Terrain speed penalty: skip move on some ticks
    if (rule.speedFactor < 1) {
        robot.slowCounter = (robot.slowCounter ?? 0) + rule.speedFactor;
        if (robot.slowCounter < 1) return false;
        robot.slowCounter -= 1;
    }

    // Update position
    robot.x = tx;
    robot.y = ty;
    updateRobotPosition(occupancy, robot.id, tx, ty);

    return true;
}
