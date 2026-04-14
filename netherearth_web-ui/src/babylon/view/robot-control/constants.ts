import { RobotGoal } from '../../game/core/warmap';

export const RC_LAYER_MASK = 0x20000000;
export const RC_FONT = "bold 70px Arial";

/** Trigger conditions for ship → robot interaction. */
export const HOVER_DISTANCE = 1.0;  // Chebyshev radius in game tiles
export const HOVER_HEIGHT   = 2.0;  // max ship height to trigger

/** Goals the player can assign via "CHANGE ORDER". */
export const ORDERABLE_GOALS: RobotGoal[] = [
    RobotGoal.ATTACK_ROBOTS,
    RobotGoal.CAPTURE_FACTORY,
    RobotGoal.CAPTURE_WARBASE,
    RobotGoal.DEFEND,
];

/** Human-readable labels for every RobotGoal value. */
export const GOAL_LABELS: Record<string, string> = {
    [RobotGoal.ATTACK_ROBOTS]:           'Attack Robots',
    [RobotGoal.CAPTURE_FACTORY]:         'Capture Factory',
    [RobotGoal.CAPTURE_ENEMY_FACTORY]:   'Enemy Factory',
    [RobotGoal.CAPTURE_NEUTRAL_FACTORY]: 'Neutral Factory',
    [RobotGoal.CAPTURE_WARBASE]:         'Capture Warbase',
    [RobotGoal.CAPTURE_ENEMY_WARBASE]:   'Enemy Warbase',
    [RobotGoal.CAPTURE_NEUTRAL_WARBASE]: 'Neutral Warbase',
    [RobotGoal.DEFEND]:                  'Defend',
};

/** Left-panel layout (orthographic camera space, same scale as CY). */
export const RC_LAYOUT = {
    panelX:           -13,   // x center of all panel elements
    titleY:            10,
    infoY:              7,   // robot chassis/weapon description
    goalLabelY:         4,   // "GOAL: ..." dynamic text
    changeOrderBtnY:    1,   // CHANGE ORDER button
    manualControlBtnY: -2,   // MANUAL CONTROL button
    exitBtnY:          -9,
    // Semi-transparent background covers the left strip only
    bgX:              -13,
    bgY:                0,
    bgWidth:           14,
    bgHeight:          24,
    cameraZ:          -10,
    orthoHeight:       12,
};
