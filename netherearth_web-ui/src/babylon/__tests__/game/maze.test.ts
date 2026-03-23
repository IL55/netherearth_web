import { describe, it, expect } from 'vitest';
import { dummyAI } from '../../game/ai/dummy';
import { applyAction, directionToRotation } from '../../game/actions';
import { buildOccupancy } from '../../game/occupancy';
import type { WarMap, WarObject } from '../../game/warmap';

/**
 * Maze layout (each cell = 1 unit, walls are 'wall3' objects)
 *
 *   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
 * 0 .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 * 1 .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 * 2 .  .  .  .  .  W  W  W  W  W  W  W  .  .  .  .  .  .  .  .  ← top of U-trap
 * 3 .  .  .  .  .  .  .  .  .  .  .  W  .  .  .  .  .  .  .  .  ← right wall
 * 4 .  .  .  .  .  .  .  .  .  .  .  W  .  .  .  .  .  .  .  .
 * 5 .  .  R  .  .  .  .  .  .  .  .  W  .  .  .  .  F  .  .  .  ← robot R, factory F
 * 6 .  .  .  .  .  .  .  .  .  .  .  W  .  .  .  .  .  .  .  .
 * 7 .  .  .  .  .  .  .  .  .  .  .  W  .  .  .  .  .  .  .  .
 * 8 .  .  .  .  .  W  W  W  W  W  W  W  .  .  .  .  .  .  .  .  ← bottom of U-trap
 * 9 .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 *
 * Wall AABB = ±0.75 (inflated).
 * Top wall at y=2: blocks y=[1.25, 2.75].  Path above: robot at y=1 is free (1 < 1.25).
 * Bottom wall at y=8: blocks y=[7.25, 8.75]. Path below: robot at y=9 is free.
 * Right wall at x=11: blocks x=[10.25, 11.75]. Dead end at x≈10.
 *
 * Robot starts at (2, 5) facing East, goal = capture neutral factory at (16, 5).
 * Direct path East is blocked by the U-trap — robot must detect the dead end,
 * back out, go around (above or below), and reach the factory capture zone.
 *
 * Factory capture zone center = factory.x+1, factory.y+1 = (17, 6).
 * Test passes when robot comes within 1.5 units of (17, 6).
 */

function makeWall(x: number, y: number): WarObject {
    return { id: `wall_${x}_${y}`, type: 'wall3', x, y };
}

function makeMap(): WarMap {
    const walls: WarObject[] = [
        // Top of U-trap: y=2, x=5..11
        ...([5, 6, 7, 8, 9, 10, 11].map(x => makeWall(x, 2))),
        // Right wall: x=11, y=3..7
        ...([3, 4, 5, 6, 7].map(y => makeWall(11, y))),
        // Bottom of U-trap: y=8, x=5..11
        ...([5, 6, 7, 8, 9, 10, 11].map(x => makeWall(x, 8))),
    ];

    const factory: WarObject = {
        id: 'factory_0',
        type: 'factory',
        x: 16, y: 5,
        subtype: 'cannons',
        // no owner → neutral
    };

    const robot: WarObject = {
        id: 'robot_0',
        type: 'robot',
        x: 2, y: 5,
        rotation: directionToRotation('E'),
        owner: 1,
        goal: 'capture_neutral_factory',
        robotConfig: { chassis: 'h-antigrav', electronics: 'h-electronics' },
    };

    return {
        width: 20, height: 10,
        objects: [...walls, factory, robot],
        tick: 0,
    };
}

describe('anti-maze: robot escapes U-shaped dead end and reaches factory', () => {
    it('robot reaches factory capture zone within 500 ticks', () => {
        const map = makeMap();
        const robot = map.objects.find(o => o.id === 'robot_0')!;

        // Factory capture zone center
        const goalX = 17, goalY = 6;
        const maxTicks = 500;

        let reached = false;
        for (let tick = 0; tick < maxTicks; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            const action = dummyAI(robot, map, occ);
            applyAction(robot, action, map, occ);

            const dist = Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY));
            if (dist <= 1.5) { reached = true; break; }
        }

        expect(reached).toBe(true);
    });

    it('stuckTicks rises to ≥3 when robot enters the dead end', () => {
        const map = makeMap();
        const robot = map.objects.find(o => o.id === 'robot_0')!;

        let maxStuck = 0;
        for (let tick = 0; tick < 60; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            const action = dummyAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            maxStuck = Math.max(maxStuck, robot.stuckTicks ?? 0);
        }

        expect(maxStuck).toBeGreaterThanOrEqual(3);
    });
});
