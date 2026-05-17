import { describe, it, expect, beforeEach } from 'vitest';
import { tickShip } from '../../../game/ship/movement';
import type { ShipState, ShipInput, ShipObstacle } from '../../../game/ship/types';
import { BASE_SPEED, MAX_SPEED, ACCEL, ASCEND_SPEED, DESCENT_SPEED, MIN_HEIGHT } from '../../../game/ship/constants';

describe('Ship Movement', () => {
    let ship: ShipState;
    let input: ShipInput;
    const mapWidth = 10;
    const mapHeight = 10;
    const obstacles: ShipObstacle[] = [];
    const robots: {x: number, y: number}[] = [];

    beforeEach(() => {
        ship = { x: 5, y: 5, height: 1.0 };
        input = { left: false, right: false, forward: false, backward: false, ascend: false };
    });

    it('should stay in place when no input is active', () => {
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.x).toBe(5);
        expect(ship.y).toBe(5);
        expect(ship.vx).toBe(0);
        expect(ship.vy).toBe(0);
    });

    it('should move right with BASE_SPEED initially and accelerate', () => {
        input.right = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.vx).toBe(BASE_SPEED);
        expect(ship.x).toBeCloseTo(5 + BASE_SPEED, 5);

        // Keep holding right, should accelerate
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.vx).toBeCloseTo(BASE_SPEED + ACCEL, 5);
        expect(ship.x).toBeCloseTo(5 + BASE_SPEED + BASE_SPEED + ACCEL, 5);
    });

    it('should not exceed MAX_SPEED', () => {
        input.right = true;
        // Fast forward multiple ticks
        for (let i = 0; i < 20; i++) {
            tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        }
        expect(ship.vx).toBeCloseTo(MAX_SPEED, 5);
    });

    it('should stop immediately when key is released', () => {
        input.right = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.vx).toBe(BASE_SPEED);

        input.right = false;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.vx).toBe(0);
    });

    it('descends automatically when no input', () => {
        const startHeight = ship.height;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.height).toBeCloseTo(startHeight - DESCENT_SPEED, 5);
    });

    it('ascends when ascend input is held and descent is not applied simultaneously', () => {
        const startHeight = ship.height;
        input.ascend = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.height).toBeCloseTo(startHeight + ASCEND_SPEED, 5);
    });

    it('height increases over multiple ascending ticks', () => {
        ship.height = 1.0;
        input.ascend = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);
        expect(ship.height).toBeCloseTo(1.0 + ASCEND_SPEED * 2, 5);
    });

    it('should respect map boundaries', () => {
        // Position at edge
        ship.x = mapWidth - 0.5; // at x = 9.5
        input.right = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);

        // Now vx is active, but checkCollision should prevent x from changing if nx > 9
        // Wait, map boundaries are [0, mapWidth - 1]. So max x is 9.0 (for width 10).
        // Since ship is at 9.5, it's already outside, but let's test normally.
        ship.x = 9;
        ship.vx = 0;
        input.right = true;
        tickShip(ship, input, mapWidth, mapHeight, obstacles, robots);

        // The target nx would be 9 + BASE_SPEED = 9.05, which is > 9 (mapWidth - 1)
        expect(ship.x).toBe(9); // Should not have moved
    });

    it('should slide along walls when moving diagonally into them', () => {
        const obst: ShipObstacle[] = [{ x0: 5.5, y0: -1, x1: 6.5, y1: 10, height: 3.5 }]; // Wall blocking right movement
        ship = { x: 4.8, y: 5, height: MIN_HEIGHT };
        input.right = true;
        input.backward = true;

        tickShip(ship, input, mapWidth, mapHeight, obst, robots);

        // It shouldn't move right (x=4.8 + 0.05 + RADIUS 0.5 = 5.35 -> overlaps wall [5.5, 6.5]? No, 4.8+0.05=4.85, + 0.5 = 5.35, no overlap.
        // Let's place ship closer.
        ship.x = 5.0; // 5.0 + 0.5 = 5.5 -> touches wall.
        ship.y = 5.0;
        ship.vx = 0; ship.vy = 0;

        tickShip(ship, input, mapWidth, mapHeight, obst, robots);

        // Should be blocked on X, but allowed on Y
        expect(ship.x).toBe(5.0);
        expect(ship.y).toBeCloseTo(5.0 + BASE_SPEED, 5);
    });

    it('should be blocked by walls/factories when low', () => {
        const obst: ShipObstacle[] = [{ x0: 5.5, y0: -1, x1: 6.5, y1: 10, height: 3.5 }];
        ship = { x: 5.0, y: 5, height: MIN_HEIGHT }; // height 1.0 <= obstacle height (3.5)
        input.right = true;

        tickShip(ship, input, mapWidth, mapHeight, obst, robots);

        // Should be blocked
        expect(ship.x).toBe(5.0);
    });

    it('should fly over walls when high enough', () => {
        const obst: ShipObstacle[] = [{ x0: 5.5, y0: -1, x1: 6.5, y1: 10, height: 3.5 }];
        ship = { x: 5.0, y: 5, height: 4.0 }; // Flying high (above 3.5)
        input.right = true;

        tickShip(ship, input, mapWidth, mapHeight, obst, robots);

        // Should not be blocked because it's higher than WALL_HEIGHT
        expect(ship.x).toBeCloseTo(5.0 + BASE_SPEED, 5);
    });

    it('moves through a robot tile laterally — floor height prevents descent into it', () => {
        // Robots no longer block lateral movement; the floor height system keeps the ship
        // above the robot's visual top. Lateral blocking was removed because it prevented
        // the ship from approaching close enough to trigger robot control.
        const robs = [{ x: 6, y: 5, height: 1.5 }];
        ship = { x: 5.0, y: 5, height: MIN_HEIGHT };
        input.right = true;

        tickShip(ship, input, mapWidth, mapHeight, [], robs);

        expect(ship.x).toBeCloseTo(5.0 + BASE_SPEED, 5); // not blocked laterally
    });

    it('should fly over robots if high enough', () => {
        const robs = [{ x: 6, y: 5 }];
        ship = { x: 5.0, y: 5, height: 1.6 }; // flying over robots (height > 1.5)
        input.right = true;

        tickShip(ship, input, mapWidth, mapHeight, [], robs);

        expect(ship.x).toBeCloseTo(5.0 + BASE_SPEED, 5); // Should pass over
    });

    it('should fly over factory if high enough', () => {
        const obst: ShipObstacle[] = [
            { x0: 4.5, y0: 4.5, x1: 5.5, y1: 5.5, height: 1.5 }, // Low Factory part at 5,5
            { x0: 5.5, y0: 4.5, x1: 6.5, y1: 5.5, height: 1.5 }  // Low Factory part at 6,5
        ];
        ship = { x: 4.0, y: 5, height: 1.6 }; // height 1.6 > factory height 1.5
        input.right = true;

        tickShip(ship, input, mapWidth, mapHeight, obst, []);

        expect(ship.x).toBeCloseTo(4.0 + BASE_SPEED, 5); // Should pass over the factory
    });
});
