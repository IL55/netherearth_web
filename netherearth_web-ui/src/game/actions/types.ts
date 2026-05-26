import { RotateDir } from '../types/rotate-dir';
import type { Direction } from '../core/warmap';
import type { Weapon } from '../../data/robot';

export type { Direction };
export { RotateDir };

export enum ActionType {
    /** Move one step forward in the current facing direction. */
    MOVE   = 'move',
    /** Rotate 90° clockwise (right) or counter-clockwise (left). */
    ROTATE = 'rotate',
    /** Fire the equipped weapon at a target robot. */
    FIRE   = 'fire',
    /** Detonate the equipped nuclear bomb. */
    DETONATE = 'detonate',
    /** Do nothing this tick. */
    IDLE   = 'idle',
}

export type RobotAction =
    | { type: ActionType.MOVE;   direction: Direction }
    | { type: ActionType.ROTATE; direction: RotateDir }
    | { type: ActionType.FIRE;   targetId?: string; weapon: Weapon }
    | { type: ActionType.DETONATE }
    | { type: ActionType.IDLE };

import { MOVE_STEP, MOVE_COOLDOWN, ROTATE_COOLDOWN } from '../config';
export { MOVE_STEP, MOVE_COOLDOWN, ROTATE_COOLDOWN };
