import { RobotGoal } from '../../game/core/warmap';

export const RC_LAYER_MASK = 0x20000000;
export const RC_FONT = "bold 70px Arial";

/** Trigger conditions for ship → robot interaction. */
export const HOVER_DISTANCE = 0.6;  // Chebyshev radius in game tiles — ship must be over the robot tile
export const HOVER_GAP      = 0.5;  // Gap between robot's visual top and ship's underside while panel is open

export { ORDERABLE_GOALS } from '../../game/robot-mutations';

/** Human-readable labels for every RobotGoal value. */
export const GOAL_LABELS: Record<string, string> = {
    [RobotGoal.ATTACK_ROBOTS]:           'Attack Robots',
    [RobotGoal.CAPTURE_FACTORY]:         'Capture Factory',
    [RobotGoal.CAPTURE_ENEMY_FACTORY]:   'Capture Enemy Factory',
    [RobotGoal.CAPTURE_NEUTRAL_FACTORY]: 'Capture Neutral Factory',
    [RobotGoal.CAPTURE_WARBASE]:         'Capture Warbase',
    [RobotGoal.CAPTURE_ENEMY_WARBASE]:   'Capture Enemy Warbase',
    [RobotGoal.CAPTURE_NEUTRAL_WARBASE]: 'Capture Neutral Warbase',
    [RobotGoal.NUKE_FACTORY]:            'Nuke Factory',
    [RobotGoal.NUKE_WARBASE]:            'Nuke Warbase',
    [RobotGoal.DEFEND]:                  'Defend',
    [RobotGoal.MOVE_FORWARD]:            'Move Forward',
    [RobotGoal.MOVE_BACKWARD]:           'Move Backward',
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
