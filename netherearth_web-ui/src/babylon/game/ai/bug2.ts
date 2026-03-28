/**
 * Bug2 navigation algorithm.
 *
 * Greedy goal-directed movement: head straight toward the target.
 * When blocked for 3+ consecutive ticks, switch to right-hand wall-follow
 * until the direct path to the goal is clear again.
 * Exports a single function: bug2Dirs — returns an ordered list of directions
 * to try this tick, updating robot.nav state as a side-effect.
 */
import { NavMode } from '../warmap';
import { Direction } from '../warmap';
import type { WarMap, RobotObject } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { MOVE_STEP } from '../actions';
import { dirDelta, rightOf, leftOf, backOf, isPassable, preferredDirs } from './nav';

/** Bug2 wall-follow: greedy toward goal, right-hand wall-follow when stuck. */
export function bug2Dirs(
    robot: RobotObject,
    warMap: WarMap,
    occupancy: OccupancyMap,
    tx: number,
    ty: number,
    distToGoal: number,
): Direction[] {
    const facing = robot.facing ?? Direction.N;
    const [primaryDir] = preferredDirs(robot, tx, ty);
    const { dx: pdx, dy: pdy } = dirDelta(primaryDir);

    // Check if primary direction is blocked for the next full grid cell (4 steps)
    let primaryBlocked = false;
    for (let step = 1; step <= 4; step++) {
        if (!isPassable(warMap, occupancy, robot, robot.x + pdx * step, robot.y + pdy * step)) {
            primaryBlocked = true;
            break;
        }
    }

    const nav = robot.nav ??= {};

    // Exit wall-follow when the primary direction is clear all the way to the goal
    if (nav.navMode === NavMode.WALL_FOLLOW) {
        const primaryGoalDist = primaryDir === Direction.E ? tx - robot.x
                              : primaryDir === Direction.W ? robot.x - tx
                              : primaryDir === Direction.S ? ty - robot.y
                              :                     robot.y - ty; // N
        const exitSteps = Math.max(0, Math.ceil(primaryGoalDist / MOVE_STEP));
        let clearToGoal = true;
        for (let step = 1; step <= exitSteps; step++) {
            if (!isPassable(warMap, occupancy, robot, robot.x + pdx * step, robot.y + pdy * step)) {
                clearToGoal = false;
                break;
            }
        }
        if (clearToGoal) {
            nav.navMode = NavMode.GOAL;
            nav.stuckTicks = 0;
        }
    }

    // Stuck detection in goal mode
    if (nav.navMode !== NavMode.WALL_FOLLOW) {
        if (primaryBlocked) {
            nav.stuckTicks = (nav.stuckTicks ?? 0) + 1;
            if (nav.stuckTicks >= 3) {
                nav.navMode = NavMode.WALL_FOLLOW;
                nav.wallFollowStartDist = distToGoal;
            }
        } else {
            nav.stuckTicks = 0;
        }
    }

    return nav.navMode === NavMode.WALL_FOLLOW
        ? [facing, rightOf(facing), leftOf(facing), backOf(facing)]
        : preferredDirs(robot, tx, ty).slice(0, 2);
}
