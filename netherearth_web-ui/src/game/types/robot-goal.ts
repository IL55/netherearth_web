/**
 * Defines the high-level objectives assigned to a robot's AI.
 * These goals determine the targeting and movement prioritization systems.
 */
export enum RobotGoal {
    /** Hunt and attack the nearest enemy robot. */
    ATTACK_ROBOTS           = 'attack_robots',
    /** Capture the nearest non-owned factory (enemy or neutral). */
    CAPTURE_FACTORY         = 'capture_factory',
    /** Capture the nearest enemy-owned factory only. */
    CAPTURE_ENEMY_FACTORY   = 'capture_enemy_factory',
    /** Capture the nearest neutral (unowned) factory only. */
    CAPTURE_NEUTRAL_FACTORY = 'capture_neutral_factory',
    /** Capture the nearest non-owned warbase (enemy or neutral). */
    CAPTURE_WARBASE         = 'capture_warbase',
    /** Capture the nearest enemy-owned warbase only. */
    CAPTURE_ENEMY_WARBASE   = 'capture_enemy_warbase',
    /** Capture the nearest neutral (unowned) warbase only. */
    CAPTURE_NEUTRAL_WARBASE = 'capture_neutral_warbase',
    /** Navigate toward an enemy factory and detonate nuclear bomb when in kill range. */
    NUKE_FACTORY            = 'nuke_factory',
    /** Navigate toward an enemy warbase and detonate nuclear bomb when in kill range. */
    NUKE_WARBASE            = 'nuke_warbase',
    /** Stay in place; no movement target. Will still defend if attacked. */
    DEFEND                  = 'defend',
    /** Move a fixed number of tiles toward the enemy base, then stop. */
    MOVE_FORWARD            = 'move_forward',
    /** Move a fixed number of tiles toward own base, then stop. */
    MOVE_BACKWARD           = 'move_backward',
}
