import { RobotGoal } from './core/warmap';
import type { RobotObject } from './core/warmap';

/** Goals the player can assign via "CHANGE ORDER". */
export const ORDERABLE_GOALS: RobotGoal[] = [
    RobotGoal.ATTACK_ROBOTS,
    RobotGoal.CAPTURE_ENEMY_FACTORY,
    RobotGoal.CAPTURE_NEUTRAL_FACTORY,
    RobotGoal.CAPTURE_ENEMY_WARBASE,
    RobotGoal.CAPTURE_NEUTRAL_WARBASE,
    RobotGoal.NUKE_FACTORY,
    RobotGoal.NUKE_WARBASE,
    RobotGoal.DEFEND,
];

/** Advances the robot's goal to the next entry in ORDERABLE_GOALS. */
export function cycleRobotGoal(robot: RobotObject): void {
    const idx = ORDERABLE_GOALS.indexOf(robot.goal);
    robot.goal = ORDERABLE_GOALS[(idx + 1) % ORDERABLE_GOALS.length];
}

/**
 * Switches the robot to DEFEND and clears its move-out target.
 * Direct nav mutation is intentional — player command overrides AI immediately.
 */
export function setManualControl(robot: RobotObject): void {
    robot.goal = RobotGoal.DEFEND;
    if (robot.nav) robot.nav.moveOutTarget = undefined;
}

/** Assigns a goal to the robot, clearing any waypoint position. */
export function setRobotGoal(robot: RobotObject, goal: RobotGoal): void {
    robot.goal = goal;
    robot.goalPosition = undefined;
}

export function setMoveGoal(robot: RobotObject, goal: RobotGoal, dx: number): void {
    robot.goal = goal;
    robot.goalPosition = { x: robot.x + dx, y: robot.y };
}
