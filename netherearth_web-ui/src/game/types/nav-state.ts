import { NavMode } from './nav-mode';

/**
 * Runtime navigation + movement state.
 * Kept in one sub-object so it is easy to inspect or reset.
 */
export interface NavState {
    /** The coordinate where the robot was originally spawned */
    spawnPos?: { x: number; y: number };
    /** Terrain speed accumulator (all chassis types) */
    slowCounter?: number;
    /** Bug2 wall-follow state (h-electronics / e-electronics) */
    stuckTicks?: number;
    navMode?: NavMode;
    /**
     * Best (most forward) position along the primary axis recorded since
     * wall-follow started.  Used to detect excessive backtrack and exit early.
     * wallFollowBestPos is the coordinate value (robot.x or robot.y).
     * wallFollowPrimaryFwd is +1 if forward = increasing coord, -1 if decreasing.
     */
    wallFollowBestPos?: number;
    wallFollowPrimaryIsX?: boolean;  // true = primary axis is X (E/W goal)
    wallFollowPrimaryFwd?: 1 | -1;
    /** Trémaux state: visit count per position key (0.25-cell resolution, permanent) */
    visitCounts?: Map<string, number>;
    /** Temporary target coordinate given when the robot is built to move away from the spawn point */
    moveOutTarget?: { x: number; y: number };
    /** Health of the robot at the end of the previous tick, used to detect incoming damage */
    lastHealth?: number;
    /** Consecutive ticks spent on DEFEND with no active order. Resets when goal changes. */
    idleTicks?: number;
}
