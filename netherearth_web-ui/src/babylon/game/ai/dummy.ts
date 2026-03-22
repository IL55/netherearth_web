import type { WarMap, WarObject } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { isOccupied } from '../occupancy';
import { type RobotAction, type Direction, rotationToDirection, directionToRotation, MOVE_STEP } from '../actions';

// Directions in priority order for each goal direction
const ALL_DIRS: Direction[] = ['N', 'E', 'S', 'W'];

function findTarget(robot: WarObject, warMap: WarMap): WarObject | undefined {
    const candidates = warMap.objects.filter(o => {
        if (robot.goal === 'attack_robots')           return o.type === 'robot'   && o.owner !== robot.owner;
        if (robot.goal === 'capture_factory')         return o.type === 'factory' && o.owner !== robot.owner;
        if (robot.goal === 'capture_enemy_factory')   return o.type === 'factory' && o.owner !== undefined && o.owner !== robot.owner;
        if (robot.goal === 'capture_neutral_factory') return o.type === 'factory' && o.owner === undefined;
        if (robot.goal === 'capture_warbase')         return o.type === 'warbase' && o.owner !== robot.owner;
        if (robot.goal === 'capture_enemy_warbase')   return o.type === 'warbase' && o.owner !== undefined && o.owner !== robot.owner;
        if (robot.goal === 'capture_neutral_warbase') return o.type === 'warbase' && o.owner === undefined;
        return false;
    });
    if (candidates.length === 0) return undefined;
    // pick closest by Manhattan distance
    return candidates.reduce((best, c) => {
        const d  = Math.abs(c.x - robot.x) + Math.abs(c.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? c : best;
    });
}

function preferredDirs(robot: WarObject, target: WarObject): Direction[] {
    const dx = target.x - robot.x;
    const dy = target.y - robot.y;
    const primary:   Direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
    const secondary: Direction = Math.abs(dx) >= Math.abs(dy) ? (dy > 0 ? 'S' : 'N') : (dx > 0 ? 'E' : 'W');
    const rest = ALL_DIRS.filter(d => d !== primary && d !== secondary);
    return [primary, secondary, ...rest];
}

// Compute the action for one dummy robot for this tick.
export function dummyAI(robot: WarObject, warMap: WarMap, occupancy: OccupancyMap): RobotAction {
    const target = findTarget(robot, warMap);
    if (!target) return { type: 'idle' };

    const dirs = preferredDirs(robot, target);
    const facing = rotationToDirection(robot.rotation ?? 0);

    // Try to move in the preferred direction; rotate toward it if not already facing
    for (const dir of dirs) {
        const delta = dir === 'N' ? { dx: 0,         dy: -MOVE_STEP }
                    : dir === 'S' ? { dx: 0,         dy:  MOVE_STEP }
                    : dir === 'E' ? { dx: MOVE_STEP,  dy:  0 }
                    :               { dx: -MOVE_STEP, dy:  0 };
        const tx = robot.x + delta.dx;
        const ty = robot.y + delta.dy;
        if (isOccupied(occupancy, tx, ty, robot.id)) continue;

        if (facing === dir) {
            return { type: 'move', direction: dir };
        }
        // Need to rotate toward this direction
        const currentAngle = directionToRotation(facing);
        const targetAngle  = directionToRotation(dir);
        const diff = ((targetAngle - currentAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        return { type: 'rotate', direction: diff > 0 ? 'right' : 'left' };
    }

    return { type: 'idle' };
}
