/**
 * RotateDir — robot rotation direction enum.
 *
 * Placed in its own file so it can be imported by both the action layer
 * (actions.ts) and any AI module (dummy.ts, bug2.ts, …) without creating
 * circular dependencies between those files.
 */
export enum RotateDir {
    /** Rotate 90° clockwise — advances facing N→E→S→W→N. */
    RIGHT = 'right',
    /** Rotate 90° counter-clockwise — advances facing N→W→S→E→N. */
    LEFT  = 'left',
}
