/**
 * Bug2 navigation algorithm.
 *
 * Greedy goal-directed movement: head straight toward the target.
 * When blocked for 3+ consecutive ticks, switch to right-hand wall-follow
 * until either (a) the next 6 tiles ahead in the primary direction are clear,
 * or (b) the robot has retreated more than MAX_BACKTRACK cells from its
 * furthest-forward position during this wall-follow phase.
 * Exports a single function: bug2Dirs — returns an ordered list of directions
 * to try this tick, updating robot.nav state as a side-effect.
 */
import { NavMode } from '../core/warmap';
import { Direction } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';
import type { OccupancyMap } from '../core/occupancy';
import { MOVE_STEP } from '../actions';
import { dirDelta, rightOf, leftOf, backOf, isPassable, preferredDirs } from './nav';

/** Maximum cells the robot may retreat (opposite to primary direction) before
 *  wall-follow is forcibly exited and goal-mode is retried. */
const MAX_BACKTRACK = 4; // grid cells
/** Consecutive ticks with the primary direction blocked before wall-follow activates. */
const STUCK_TICKS = 3;

/** Bug2 wall-follow: greedy toward goal, right-hand wall-follow when stuck. */
export function bug2Dirs(
    robot: RobotObject,
    warMap: WarMap,
    occupancy: OccupancyMap,
    tx: number,
    ty: number,
): Direction[] {
    const facing = robot.facing;
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

    if (nav.navMode === NavMode.WALL_FOLLOW) {
        // ── Exit condition A: primary direction clear for EXIT_LOOKAHEAD steps ──
        // Checking all the way to the goal was too strict: it forced robots to
        // loop around the entire map perimeter before finding a nearby gap.
        const primaryGoalDist = primaryDir === Direction.E ? tx - robot.x
                              : primaryDir === Direction.W ? robot.x - tx
                              : primaryDir === Direction.S ? ty - robot.y
                              :                     robot.y - ty; // N
        const exitSteps = Math.max(0, Math.ceil(primaryGoalDist / MOVE_STEP));
        let clearAhead = true;
        for (let step = 1; step <= exitSteps; step++) {
            if (!isPassable(warMap, occupancy, robot, robot.x + pdx * step, robot.y + pdy * step)) {
                clearAhead = false;
                break;
            }
        }

        // ── Exit condition B: robot has retreated too far from best position ──
        // Track the furthest-forward coordinate reached during this wall-follow
        // phase. If the robot moves more than MAX_BACKTRACK cells in the
        // backward direction, exit and retry goal mode — even if no gap is
        // visible. This prevents the "huge loop around the whole map" problem.
        const primaryIsX = nav.wallFollowPrimaryIsX ?? (primaryDir === Direction.E || primaryDir === Direction.W);
        const primaryPos = primaryIsX ? robot.x : robot.y;

        if (nav.wallFollowBestPos === undefined) {
            nav.wallFollowBestPos = primaryPos;
            nav.wallFollowPrimaryIsX = primaryIsX;
            nav.wallFollowPrimaryFwd = primaryIsX ? (primaryDir === Direction.E ? 1 : -1) : (primaryDir === Direction.S ? 1 : -1);
        } else {
            // Update best if robot made forward progress
            if (nav.wallFollowPrimaryFwd === 1 && primaryPos > nav.wallFollowBestPos) nav.wallFollowBestPos = primaryPos;
            if (nav.wallFollowPrimaryFwd === -1 && primaryPos < nav.wallFollowBestPos) nav.wallFollowBestPos = primaryPos;
        }
        const backtrack = (nav.wallFollowBestPos - primaryPos) * nav.wallFollowPrimaryFwd!;
        const tooFarBack = backtrack > MAX_BACKTRACK;

        if (clearAhead || tooFarBack) {
            nav.navMode = NavMode.GOAL;
            nav.stuckTicks = 0;
            nav.wallFollowBestPos = undefined;
            nav.wallFollowPrimaryIsX = undefined;
            nav.wallFollowPrimaryFwd = undefined;
        }
    }

    // Stuck detection in goal mode
    if (nav.navMode !== NavMode.WALL_FOLLOW) {
        if (primaryBlocked) {
            nav.stuckTicks = (nav.stuckTicks ?? 0) + 1;
            if (nav.stuckTicks >= STUCK_TICKS) {
                nav.navMode = NavMode.WALL_FOLLOW;
                nav.wallFollowBestPos = undefined;
                nav.wallFollowPrimaryIsX = undefined;
                nav.wallFollowPrimaryFwd = undefined;
            }
        } else {
            nav.stuckTicks = 0;
        }
    }

    return nav.navMode === NavMode.WALL_FOLLOW
        ? [facing, rightOf(facing), leftOf(facing), backOf(facing)]
        : preferredDirs(robot, tx, ty).slice(0, 2);
}
