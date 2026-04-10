import type { ShipState, ShipInput, ShipObstacle } from './types';
import { BASE_SPEED, MAX_SPEED, ACCEL, ASCEND_SPEED, DESCENT_SPEED, MIN_HEIGHT, MAX_HEIGHT } from './constants';
import { hitsObstacle, getFloorHeight } from './collision';
import { ROBOT_COLLISION_DISTANCE, ROBOT_HEIGHT } from '../core/occupancy';

export function tickShip(
    ship: ShipState,
    input: ShipInput,
    mapWidth: number,
    mapHeight: number,
    obstacles: ShipObstacle[] = [],
    robots: {x: number, y: number, height?: number}[] = []
): void {
    if (input.right) {
        ship.vx = (ship.vx !== undefined && ship.vx >= BASE_SPEED) ? Math.min(ship.vx + ACCEL, MAX_SPEED) : BASE_SPEED;
    } else if (input.left) {
        ship.vx = (ship.vx !== undefined && ship.vx <= -BASE_SPEED) ? Math.max(ship.vx - ACCEL, -MAX_SPEED) : -BASE_SPEED;
    } else {
        ship.vx = 0;
    }

    if (input.backward) {
        ship.vy = (ship.vy !== undefined && ship.vy >= BASE_SPEED) ? Math.min(ship.vy + ACCEL, MAX_SPEED) : BASE_SPEED;
    } else if (input.forward) {
        ship.vy = (ship.vy !== undefined && ship.vy <= -BASE_SPEED) ? Math.max(ship.vy - ACCEL, -MAX_SPEED) : -BASE_SPEED;
    } else {
        ship.vy = 0;
    }

    const dx = ship.vx;
    const dy = ship.vy;

    const checkCollision = (nx: number, ny: number) => {
        if (nx < 0 || nx > mapWidth - 1 || ny < 0 || ny > mapHeight - 1) return true;
        if (hitsObstacle(nx, ny, ship.height, obstacles)) return true;
        return robots.some(r => {
            const h = r.height ?? ROBOT_HEIGHT;
            if (ship.height < h) {
                return Math.max(Math.abs(r.x - nx), Math.abs(r.y - ny)) < ROBOT_COLLISION_DISTANCE;
            }
            return false;
        });
    };

    // Check axes independently so the ship can slide along walls.
    if (dx !== 0 && !checkCollision(ship.x + dx, ship.y)) ship.x += dx;
    if (dy !== 0 && !checkCollision(ship.x, ship.y + dy)) ship.y += dy;

    if (input.ascend) {
        ship.height += ASCEND_SPEED;
    }
    
    // The ship can't descend below the obstacle it is currently over
    const floorHeight = getFloorHeight(ship.x, ship.y, obstacles, robots);
    ship.height = Math.max(floorHeight, Math.min(MAX_HEIGHT, ship.height - DESCENT_SPEED));
}
