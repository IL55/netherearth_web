/**
 * Combat logic for the dummy AI.
 *
 * Handles weapon firing (range check, cooldown, line-of-sight) and
 * advancing toward a visible enemy when out of range.
 * Returns a RobotAction if combat is appropriate this tick, or null
 * to let the navigation layer decide.
 */
import { ObjectType } from '../../game/warmap';
import { Direction } from '../warmap';
import type { WarMap, WarObject, RobotObject } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { isOccupied, isLOSBlocked } from '../occupancy';
import { ActionType, type RobotAction } from '../actions';
import { SIGHT_RANGE, WEAPON_RANGE, WEAPON_COOLDOWN } from '../../data/robot';
import { dirDelta } from './nav';

// Nearest living enemy robot ahead within sight range and unblocked LOS.
function scanForwardEnemy(
    robot: RobotObject,
    dir: Direction,
    sightRange: number,
    warMap: WarMap,
    occupancy: OccupancyMap,
): WarObject | undefined {
    const enemies = warMap.objects.filter(
        o => o.type === ObjectType.ROBOT && o.owner !== robot.owner && o.dyingTicks === undefined,
    );

    const inSight = enemies.filter(e => {
        const dx = e.x - robot.x;
        const dy = e.y - robot.y;
        let along: number, perp: number;
        if      (dir === Direction.E) { along =  dx; perp = Math.abs(dy); }
        else if (dir === Direction.W) { along = -dx; perp = Math.abs(dy); }
        else if (dir === Direction.S) { along =  dy; perp = Math.abs(dx); }
        else                  { along = -dy; perp = Math.abs(dx); } // N
        return along > 0 && along <= sightRange && perp < 0.5;
    });

    if (inSight.length === 0) return undefined;

    const closest = inSight.reduce((best, e) => {
        const d  = Math.abs(e.x - robot.x) + Math.abs(e.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? e : best;
    });

    return isLOSBlocked(occupancy, robot.x, robot.y, closest.x, closest.y)
        ? undefined
        : closest;
}

// Returns a combat action (fire / advance / idle) when an enemy is in sight; undefined otherwise.
export function fightAction(
    robot: RobotObject,
    warMap: WarMap,
    occupancy: OccupancyMap,
): RobotAction | undefined {
    const weapon     = robot.robotConfig?.weapon;
    const sightRange = robot.robotConfig?.electronics ? SIGHT_RANGE[robot.robotConfig.electronics] : 0;
    if (!weapon || sightRange <= 0) return undefined;

    const facing = robot.facing ?? Direction.N;
    const enemy  = scanForwardEnemy(robot, facing, sightRange, warMap, occupancy);
    if (!enemy) return undefined;

    const dist      = Math.abs(enemy.x - robot.x) + Math.abs(enemy.y - robot.y);
    const weapRange = WEAPON_RANGE[weapon] ?? 0;

    if (dist <= weapRange) {
        const cooldown  = WEAPON_COOLDOWN[weapon] ?? 3;
        const inFlight  = warMap.projectiles?.some(p => p.ownerId === robot.id) ?? false;
        const lastFired = robot.lastFiredAt ?? -(cooldown + 1);
        if (!inFlight && (warMap.tick ?? 0) - lastFired >= cooldown) {
            return { type: ActionType.FIRE, targetId: enemy.id };
        }
    }

    // Enemy visible but out of range or reloading — step toward it
    const { dx, dy } = dirDelta(facing);
    const nx = robot.x + dx;
    const ny = robot.y + dy;
    if (nx >= 0 && ny >= 0 && nx < warMap.width && ny < warMap.height
            && !isOccupied(occupancy, nx, ny, robot.id)) {
        return { type: ActionType.MOVE, direction: facing };
    }

    return { type: ActionType.IDLE };
}
