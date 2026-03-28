import { RotateDir } from '../types/rotate-dir';
import type { Direction } from '../core/warmap';

export type { Direction };
export { RotateDir };

export enum ActionType {
    /** Move one step forward in the current facing direction. */
    MOVE   = 'move',
    /** Rotate 90° clockwise (right) or counter-clockwise (left). */
    ROTATE = 'rotate',
    /** Fire the equipped weapon at a target robot. */
    FIRE   = 'fire',
    /** Do nothing this tick. */
    IDLE   = 'idle',
}

export type RobotAction =
    | { type: ActionType.MOVE;   direction: Direction }
    | { type: ActionType.ROTATE; direction: RotateDir }
    | { type: ActionType.FIRE;   targetId: string }
    | { type: ActionType.IDLE };

// Robots move in 1/4 grid increments per tick (4 ticks to cross one cell)
export const MOVE_STEP = 0.25;

// Minimum ticks between consecutive move / rotate actions.
// At 500 ms/tick: MOVE_COOLDOWN=2 → 1 move/s; ROTATE_COOLDOWN=4 → 1 rotation/2 s.
export const MOVE_COOLDOWN   = 2;
export const ROTATE_COOLDOWN = 4;
