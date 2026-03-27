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
    /** Trémaux state: visit count per position key (0.25-cell resolution, permanent) */
    visitCounts?: Map<string, number>;
}
