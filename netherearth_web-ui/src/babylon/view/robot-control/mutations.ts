import { RobotGoal, Owner } from '../../game/core/warmap';
import type { RobotObject } from '../../game/core/warmap';
import { ORDERABLE_GOALS } from './constants';

/**
 * Advances the robot's goal to the next entry in ORDERABLE_GOALS.
 * If the current goal is not in the list, starts from the beginning.
 */
export function cycleRobotGoal(robot: RobotObject): void {
    const idx = ORDERABLE_GOALS.indexOf(robot.goal);
    robot.goal = ORDERABLE_GOALS[(idx + 1) % ORDERABLE_GOALS.length];
}

/**
 * Switches the robot to DEFEND mode and clears its move-out target so it
 * stops in place immediately. Represents "manual control" hand-off.
 * 
 * Note: Directly mutating robot.nav bypasses the AI's standard AIStateUpdate 
 * pattern. This is intentional because this action is player-driven and 
 * forces an immediate halt, overriding the AI's current navigation state.
 */
export function setManualControl(robot: RobotObject): void {
    robot.goal = RobotGoal.DEFEND;
    if (robot.nav) robot.nav.moveOutTarget = undefined;
}

/** Assigns one of the orderable goals to the robot, clearing any waypoint position. */
export function setRobotGoal(robot: RobotObject, goal: RobotGoal): void {
    robot.goal = goal;
    robot.goalPosition = undefined;
}

export function setMoveGoal(robot: RobotObject, goal: RobotGoal, dx: number): void {
    robot.goal = goal;
    robot.goalPosition = { x: robot.x + dx, y: robot.y };
}
