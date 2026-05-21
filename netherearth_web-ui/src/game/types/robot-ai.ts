/**
 * Specifies the artificial intelligence profile controlling a robot.
 * Different profiles determine the complexity of a robot's decision-making.
 */
export enum RobotAI {
    /** A simplistic AI that only performs basic tasks, often ignoring obstacles. */
    SIMPLE = 'simple',
    /** A more capable AI that handles pathfinding, combat prioritization, and objective tracking. */
    ADVANCED = 'advanced',
}
