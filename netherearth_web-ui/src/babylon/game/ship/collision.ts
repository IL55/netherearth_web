import type { ShipObstacle } from './types';
import { SHIP_RADIUS, MIN_HEIGHT } from './constants';
import { ROBOT_COLLISION_DISTANCE, ROBOT_HEIGHT } from '../core/occupancy';

export function hitsObstacle(x: number, y: number, height: number, obstacles: ShipObstacle[]): boolean {
    return obstacles.some(o =>
        height < o.height && // Only blocked if ship is strictly below the obstacle's top
        x + SHIP_RADIUS > o.x0 && x - SHIP_RADIUS < o.x1 &&
        y + SHIP_RADIUS > o.y0 && y - SHIP_RADIUS < o.y1,
    );
}

export function shipHitsObstacle(shipX: number, shipY: number, height: number, obstacles: ShipObstacle[]): boolean {
    return hitsObstacle(shipX, shipY, height, obstacles);
}

export function getFloorHeight(x: number, y: number, obstacles: ShipObstacle[], robots: {x: number, y: number}[]): number {
    let maxH = MIN_HEIGHT;
    
    // Create a strict footprint buffer slightly smaller than radius to avoid getting stuck at edges
    const BUFFER = 0.01;
    const footprintR = SHIP_RADIUS - BUFFER;

    for (const o of obstacles) {
        if (x + footprintR > o.x0 && x - footprintR < o.x1 &&
            y + footprintR > o.y0 && y - footprintR < o.y1) {
            maxH = Math.max(maxH, o.height);
        }
    }
    for (const r of robots) {
        if (Math.max(Math.abs(r.x - x), Math.abs(r.y - y)) < ROBOT_COLLISION_DISTANCE) {
            maxH = Math.max(maxH, ROBOT_HEIGHT);
        }
    }
    return maxH;
}
