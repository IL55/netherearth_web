export interface ShipState {
    x: number;
    y: number;
    height: number;
}

export interface ShipInput {
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    ascend: boolean;
}

// Axis-aligned bounding box in game XY coordinates.
export interface ShipObstacle {
    x0: number; y0: number;
    x1: number; y1: number;
}

export function createShipInput(): ShipInput {
    return { left: false, right: false, forward: false, backward: false, ascend: false };
}

const SPEED         = 0.05;  // cells per sub-tick (horizontal)
const ASCEND_SPEED  = 0.05;  // height units per sub-tick
const DESCENT_SPEED = 0.01;  // automatic descent per sub-tick
const MIN_HEIGHT    = 1.0;  // ground level — ship can land on grass
const MAX_HEIGHT    = 6.0;
const SHIP_RADIUS   = 0.5;
// Ship can fly over walls when above this world-Y height.
const WALL_HEIGHT   = 3.5;

// Warbase block offsets — mirrors STRUCTURE_PARTS['warbase'] in occupancy.ts.
// Kept here so the ship module has no dependency on occupancy internals.
export const WARBASE_BLOCK_OFFSETS: ShipObstacle[] = [
    { x0:  0.0, y0: -0.5, x1:  1.0, y1:  0.5 },  // xo=0.5, yo=0
    { x0:  1.0, y0: -0.5, x1:  2.0, y1:  0.5 },  // xo=1.5, yo=0
    { x0: -0.5, y0:  0.5, x1:  0.5, y1:  1.5 },  // xo=0,   yo=1
    { x0:  0.5, y0:  0.5, x1:  1.5, y1:  1.5 },  // xo=1,   yo=1
    { x0:  1.5, y0:  0.5, x1:  2.5, y1:  1.5 },  // xo=2,   yo=1
    { x0:  2.5, y0:  0.5, x1:  3.5, y1:  1.5 },  // xo=3,   yo=1
    { x0:  0.0, y0:  1.5, x1:  1.0, y1:  2.5 },  // xo=0.5, yo=2
    { x0:  1.0, y0:  1.5, x1:  2.0, y1:  2.5 },  // xo=1.5, yo=2
    { x0:  2.0, y0:  1.5, x1:  3.0, y1:  2.5 },  // xo=2.5, yo=2
    { x0: -0.5, y0:  2.5, x1:  0.5, y1:  3.5 },  // xo=0,   yo=3
    { x0:  0.5, y0:  2.5, x1:  1.5, y1:  3.5 },  // xo=1,   yo=3
    { x0:  1.5, y0:  2.5, x1:  2.5, y1:  3.5 },  // xo=2,   yo=3
    { x0:  2.5, y0:  2.5, x1:  3.5, y1:  3.5 },  // xo=3,   yo=3
    { x0:  0.0, y0:  3.5, x1:  1.0, y1:  4.5 },  // xo=0.5, yo=4
    { x0:  1.0, y0:  3.5, x1:  2.0, y1:  4.5 },  // xo=1.5, yo=4
];

import { ROBOT_COLLISION_DISTANCE } from './core/occupancy';

function hitsObstacle(x: number, y: number, obstacles: ShipObstacle[]): boolean {
    return obstacles.some(o =>
        x + SHIP_RADIUS > o.x0 && x - SHIP_RADIUS < o.x1 &&
        y + SHIP_RADIUS > o.y0 && y - SHIP_RADIUS < o.y1,
    );
}

export function tickShip(ship: ShipState, input: ShipInput, obstacles: ShipObstacle[] = [], robots: {x: number, y: number}[] = []): void {
    // Above WALL_HEIGHT the ship can fly over base walls freely.
    const canPassWalls = ship.height > WALL_HEIGHT;

    const dx = (input.right ? SPEED : 0) - (input.left ? SPEED : 0);
    const dy = (input.backward ? SPEED : 0) - (input.forward ? SPEED : 0);

    const checkCollision = (nx: number, ny: number) => {
        if (!canPassWalls && hitsObstacle(nx, ny, obstacles)) return true;
        return robots.some(r => Math.max(Math.abs(r.x - nx), Math.abs(r.y - ny)) < ROBOT_COLLISION_DISTANCE);
    };

    // Check axes independently so the ship can slide along walls.
    if (dx !== 0 && !checkCollision(ship.x + dx, ship.y)) ship.x += dx;
    if (dy !== 0 && !checkCollision(ship.x, ship.y + dy)) ship.y += dy;

    if (input.ascend) ship.height += ASCEND_SPEED;
    ship.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, ship.height - DESCENT_SPEED));
}

export function shipHitsObstacle(shipX: number, shipY: number, obstacles: ShipObstacle[]): boolean {
    return hitsObstacle(shipX, shipY, obstacles);
}
