/**
 * Shared navigation primitives used by all AI algorithms.
 *
 * Provides direction helpers (dirDelta, rightOf, leftOf, backOf),
 * passability checks (isPassable, tileAt), and goal-direction sorting
 * (preferredDirs). All higher-level algorithms import from here.
 */
import { CW_DIRS } from '../warmap';
import { Direction } from '../warmap';
import type { WarMap, MapObject, RobotObject } from '../warmap';

export { CW_DIRS };
import type { OccupancyMap } from '../occupancy';
import { isOccupied } from '../occupancy';
import { MOVE_STEP } from '../actions';
import { getTerrainRule, Chassis } from '../terrain';


export function dirDelta(dir: Direction): { dx: number; dy: number } {
    return dir === Direction.N ? { dx:  0,         dy: -MOVE_STEP }
         : dir === Direction.S ? { dx:  0,         dy:  MOVE_STEP }
         : dir === Direction.E ? { dx:  MOVE_STEP, dy:  0         }
         :               { dx: -MOVE_STEP, dy:  0         };
}

export function rightOf(d: Direction): Direction { return ({ N:Direction.E, E:Direction.S, S:Direction.W, W:Direction.N } as Record<Direction,Direction>)[d]; }
export function leftOf (d: Direction): Direction { return ({ N:Direction.W, W:Direction.S, S:Direction.E, E:Direction.N } as Record<Direction,Direction>)[d]; }
export function backOf (d: Direction): Direction { return ({ N:Direction.S, S:Direction.N, E:Direction.W, W:Direction.E } as Record<Direction,Direction>)[d]; }

export function tileAt(warMap: WarMap, x: number, y: number): string {
    return (warMap.objects.find(
        (o): o is MapObject => o.type === 'tile' && o.x === Math.floor(x) && o.y === Math.floor(y),
    ))?.subtype ?? 'G';
}

// True if the robot can step to (x, y): within bounds, terrain passable, not occupied.
export function isPassable(
    warMap: WarMap,
    occupancy: OccupancyMap,
    robot: RobotObject,
    x: number,
    y: number,
): boolean {
    if (x < 0 || y < 0 || x > warMap.width - 1 || y > warMap.height - 1) return false;
    const chassis = robot.robotConfig?.chassis ?? Chassis.TRACKS;
    if (!getTerrainRule(tileAt(warMap, x, y), chassis).passable) return false;
    if (isOccupied(occupancy, x, y, robot.id)) return false;
    return true;
}

export function preferredDirs(robot: RobotObject, tx: number, ty: number): Direction[] {
    const dx = tx - robot.x;
    const dy = ty - robot.y;
    const primary:   Direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? Direction.E: Direction.W) : (dy > 0 ? Direction.S: Direction.N);
    const secondary: Direction = Math.abs(dx) >= Math.abs(dy) ? (dy > 0 ? Direction.S: Direction.N) : (dx > 0 ? Direction.E: Direction.W);
    const rest = CW_DIRS.filter(d => d !== primary && d !== secondary);
    return [primary, secondary, ...rest];
}
