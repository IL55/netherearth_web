import { describe, it, expect } from 'vitest';
import { hitsObstacle, shipHitsObstacle, hitsRobot } from '../../../game/ship/collision';
import type { ShipObstacle } from '../../../game/ship/types';

describe('Ship Collision', () => {
    const obstacles: ShipObstacle[] = [
        { x0: 2, y0: 2, x1: 3, y1: 3, height: 3.5 },
        { x0: 5, y0: 5, x1: 6, y1: 6, height: 1.5 }
    ];

    it('should detect collision when ship overlaps an obstacle', () => {
        // Ship at (2.1, 2.1) overlaps with obstacle at [2,3]x[2,3]
        // because SHIP_RADIUS is 0.5, so the bounding box is [1.6, 2.6]x[1.6, 2.6]
        expect(hitsObstacle(2.1, 2.1, 1.0, obstacles)).toBe(true);
        expect(shipHitsObstacle(2.1, 2.1, 1.0, obstacles)).toBe(true);
    });

    it('should not detect collision when ship is far from obstacles', () => {
        // Ship at (1, 1) has bb [0.5, 1.5]x[0.5, 1.5], does not overlap [2,3]x[2,3]
        expect(hitsObstacle(1, 1, 1.0, obstacles)).toBe(false);
    });

    it('should barely not detect collision when touching exactly at the edge', () => {
        // Obstacle is at x0=2.
        // Ship at x=1.5 has right edge at 1.5 + 0.5 = 2.0.
        // hitsObstacle condition: x + SHIP_RADIUS > o.x0 -> 2.0 > 2.0 is FALSE.
        expect(hitsObstacle(1.5, 2.5, 1.0, obstacles)).toBe(false);
    });
});

describe('hitsRobot — lateral clipping prevention', () => {
    const robot = { x: 5, y: 5, height: 0.75 };

    it('blocks lateral movement when ship is below robot height', () => {
        // Ship center at (5, 5), height 0.3 < robot height 0.75 → clipping
        expect(hitsRobot(5, 5, 0.3, [robot])).toBe(true);
    });

    it('does not block when ship is at or above robot height', () => {
        expect(hitsRobot(5, 5, 0.75, [robot])).toBe(false);
        expect(hitsRobot(5, 5, 1.5,  [robot])).toBe(false);
    });

    it('does not block when ship footprint does not overlap robot', () => {
        // Ship far enough away that SHIP_RADIUS footprint clears the robot AABB
        expect(hitsRobot(6.0, 5, 0.3, [robot])).toBe(false);
    });

    it('does not block when robot list is empty', () => {
        expect(hitsRobot(5, 5, 0.0, [])).toBe(false);
    });
});
