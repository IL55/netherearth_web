import type { ShipObstacle } from './types';

export const BASE_SPEED    = 0.05;  // starting speed
export const MAX_SPEED     = 0.20;  // maximum speed
export const ACCEL         = 0.02;  // speed increase per sub-tick while key is held
export const ASCEND_SPEED  = 0.05;  // height units per sub-tick
export const DESCENT_SPEED = 0.01;  // automatic descent per sub-tick
export const MIN_HEIGHT    = 0.0;  // logical ground level
export const MAX_HEIGHT    = 5.0;  // max flying height
export const SHIP_RADIUS   = 0.5;

// Warbase block offsets — mirrors STRUCTURE_PARTS['warbase'] in occupancy.ts.
// Kept here so the ship module has no dependency on occupancy internals.
export const WARBASE_BLOCK_OFFSETS: ShipObstacle[] = [
    { x0:  0.0, y0: -0.5, x1:  1.0, y1:  0.5, height: 2.0 },  // highwall1 (xo=0.5, yo=0)
    { x0:  1.0, y0: -0.5, x1:  2.0, y1:  0.5, height: 2.0 },  // highwall2 (xo=1.5, yo=0)
    { x0: -0.5, y0:  0.5, x1:  0.5, y1:  1.5, height: 2.0 },  // highwall1 (xo=0, yo=1)
    { x0:  0.5, y0:  0.5, x1:  1.5, y1:  1.5, height: 0.5 },  // lowwall1  (xo=1, yo=1)
    { x0:  1.5, y0:  0.5, x1:  2.5, y1:  1.5, height: 0.5 },  // lowwall1  (xo=2, yo=1)
    { x0:  2.5, y0:  0.5, x1:  3.5, y1:  1.5, height: 0.5 },  // lowwall2  (xo=3, yo=1)
    { x0:  0.0, y0:  1.5, x1:  1.0, y1:  2.5, height: 2.0 },  // highwall1 (xo=0.5, yo=2)
    { x0:  1.0, y0:  1.5, x1:  2.0, y1:  2.5, height: 1.0 },  // warbase   (xo=1.5, yo=2)
    { x0:  2.0, y0:  1.5, x1:  3.0, y1:  2.5, height: 0.5 },  // lowwall2  (xo=2.5, yo=2)
    { x0: -0.5, y0:  2.5, x1:  0.5, y1:  3.5, height: 2.0 },  // highwall1 (xo=0, yo=3)
    { x0:  0.5, y0:  2.5, x1:  1.5, y1:  3.5, height: 0.5 },  // lowwall1  (xo=1, yo=3)
    { x0:  1.5, y0:  2.5, x1:  2.5, y1:  3.5, height: 0.5 },  // lowwall1  (xo=2, yo=3)
    { x0:  2.5, y0:  2.5, x1:  3.5, y1:  3.5, height: 0.5 },  // lowwall2  (xo=3, yo=3)
    { x0:  0.0, y0:  3.5, x1:  1.0, y1:  4.5, height: 2.0 },  // highwall1 (xo=0.5, yo=4)
    { x0:  1.0, y0:  3.5, x1:  2.0, y1:  4.5, height: 2.0 },  // highwall2 (xo=1.5, yo=4)
];
