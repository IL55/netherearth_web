/**
 * Specifies the operational mode for the pathfinding and navigation AI.
 * Used internally to distinguish between direct approaches and obstacle handling.
 */
export enum NavMode {
    /** Greedy movement: head directly toward the goal by Manhattan distance. */
    GOAL        = 'goal',
    /** Bug2 wall-follow: hug the obstacle (right-hand rule) until the path to the goal is clear. */
    WALL_FOLLOW = 'wall_follow',
}
