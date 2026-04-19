import { ObjectType } from '../../../../game/core/warmap';
import { Direction } from '../../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { simpleAI } from '../../../../game/ai/simple';
import { applyAction } from '../../../../game/actions';
import { buildOccupancy } from '../../../../game/core/occupancy';
import { RobotGoal, Owner } from '../../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../../game/core/warmap';
import { Chassis, Electronics } from '../../../../data/robot';

/**
 * Maze layout (each cell = 1 unit, walls are 'wall3' objects)
 *
 *   0  1  2  3  4  5  6  7  8  9
 * 0 .  .  .  .  .  .  .  .  .  .
 * 1 .  .  .  .  .  .  .  .  .  .
 * 2 .  .  W  W  W  .  .  .  .  .  ← top of U-trap (y=2, x=2..4)
 * 3 .  R  .  .  W  .  .  F  .  .  ← robot R at (1, 3), right wall at x=4, factory F at (7, 3)
 * 4 .  .  W  W  W  .  .  .  .  .  ← bottom of U-trap (y=4, x=2..4)
 * 5 .  .  .  .  .  .  .  .  .  .
 *
 * Wall AABB = ±0.75 (inflated).
 * Top wall at y=2: blocks y=[1.25, 2.75]. Path above: robot at y=1 is free.
 * Bottom wall at y=4: blocks y=[3.25, 4.75]. Path below: robot at y=5 is free.
 * Right wall at x=4: blocks x=[3.25, 4.75]. Dead end at x≈3.
 *
 * Robot starts at (1, 3) facing East, goal = capture neutral factory at (7, 3).
 * Direct path East is blocked by the U-trap — robot must detect the dead end,
 * back out, go around (above or below), and reach the factory capture zone.
 *
 * Factory capture zone center = factory.x+1, factory.y+1 = (8, 4).
 * Test passes when robot comes within 1.5 units of (8, 4).
 */

function makeWall(x: number, y: number): WarObject {
    return { id: `wall_${x}_${y}`, type: ObjectType.WALL3, x, y };
}

function makeMap(): WarMap {
    const walls: WarObject[] = [
        // Top of U-trap: y=2, x=2..4
        ...([2, 3, 4].map(x => makeWall(x, 2))),
        // Right wall: x=4, y=3
        ...([3].map(y => makeWall(4, y))),
        // Bottom of U-trap: y=4, x=2..4
        ...([2, 3, 4].map(x => makeWall(x, 4))),
    ];

    const factory: WarObject = {
        id: 'factory_0',
        type: ObjectType.FACTORY,
        x: 7, y: 3,
        subtype: 'cannons',
        // no owner → neutral
    };

    const robot: RobotObject = {
        id: 'robot_0',
        type: ObjectType.ROBOT,
        x: 1, y: 3,
        facing: Direction.E,
        owner: Owner.RED,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
    };

    return {
        width: 10, height: 6,
        tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {},
        tick: 0,
    };
}

describe('anti-maze: robot escapes U-shaped dead end and reaches factory', () => {
    it('robot reaches factory capture zone within 500 ticks', () => {
        const map = makeMap();
        const robot = map.robots.find(o => o.id === 'robot_0')!;

        // Factory capture zone center
        const goalX = 8, goalY = 4;
        const maxTicks = 500;

        let reached = false;
        for (let tick = 0; tick < maxTicks; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            const action = simpleAI(robot, map, occ);
            applyAction(robot, action, map, occ);

            const dist = Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY));
            if (dist <= 1.5) { reached = true; break; }
        }

        expect(reached).toBe(true);
    });

    it('stuckTicks rises to ≥3 when robot enters the dead end', () => {
        const map = makeMap();
        const robot = map.robots.find(o => o.id === 'robot_0')!;

        let maxStuck = 0;
        for (let tick = 0; tick < 60; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            const action = simpleAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            maxStuck = Math.max(maxStuck, robot.nav?.stuckTicks ?? 0);
        }

        expect(maxStuck).toBeGreaterThanOrEqual(3);
    });
});
