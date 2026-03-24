/**
 * NavAlgo enum — navigation algorithm selector.
 *
 * Placed in its own file so it can be imported by both game data (RobotConfig)
 * and AI logic without circular dependencies.
 * Set `robotConfig.navAlgo` to choose which algorithm a robot uses.
 */
/** Navigation algorithm selection for a robot. Set via RobotConfig.navAlgo. */
export enum NavAlgo {
    /** Bug2 wall-follow: greedy toward goal, right-hand wall-follow when stuck. */
    BUG2    = 'bug2',
    /** Trémaux: sliding window of recently visited positions; prefer less-visited directions. */
    TREMAUX = 'tremaux',
}
