import { NavMode } from './nav-mode';

/**
 * Runtime navigation + movement state.
 * Kept in one sub-object so it is easy to inspect or reset.
 */
export interface NavState {
    /** Terrain speed accumulator (all chassis types) */
    slowCounter?: number;
    /** Bug2 wall-follow state (h-electronics / e-electronics) */
    stuckTicks?: number;
    stuckCheckDist?: number;
    navMode?: NavMode;
    wallFollowStartDist?: number;
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
}
