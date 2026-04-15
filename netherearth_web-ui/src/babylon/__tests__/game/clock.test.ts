import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, Direction, RobotGoal, Owner, RobotAI } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import { startClock } from '../../game/clock';
import { createOwnerResources } from '../../game/resources';
import { Chassis, Weapon, calcHealth } from '../../data/robot';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWarMap(...robots: RobotObject[]): WarMap {
    // Neutral factory at (15, 5) — gives CAPTURE_NEUTRAL_FACTORY robots a clear target
    const factory = { id: 'f1', type: ObjectType.FACTORY as const, x: 15, y: 5, subtype: 'cannons' as const };
    return { width: 20, height: 20, objects: [factory, ...robots], projectiles: [] };
}

function makeRobotWithGoal(id: string, x: number, y: number): RobotObject {
    const cfg = { chassis: Chassis.TRACKS, weapon: Weapon.CANNON };
    return {
        id,
        type: ObjectType.ROBOT,
        x,
        y,
        owner: Owner.RED,
        facing: Direction.E,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: cfg,
        health: calcHealth(cfg),
        ai: RobotAI.DUMMY,
    };
}

// ─── Controlled robot skips AI ────────────────────────────────────────────────

describe('startClock — controlled robot skips AI', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('uncontrolled robot moves toward its goal', () => {
        const robot = makeRobotWithGoal('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, 100, () => false, () => null);

        const startX = robot.x;
        // 10 game ticks (each = 5 sub-ticks × 100 ms); factory is east at x=15
        vi.advanceTimersByTime(10 * 5 * 100);
        clock.stop();

        expect(robot.x).toBeGreaterThan(startX);
    });

    it('controlled robot does not move while its id is returned by getControlledRobotId', () => {
        const robot = makeRobotWithGoal('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const clock = startClock(
            warMap, () => {}, createOwnerResources(), undefined, 100,
            () => false,
            () => 'r1',   // always report r1 as controlled
        );

        const startX = robot.x;
        const startY = robot.y;
        vi.advanceTimersByTime(10 * 5 * 100);
        clock.stop();

        expect(robot.x).toBe(startX);
        expect(robot.y).toBe(startY);
    });

    it('robot resumes moving once control is released', () => {
        const robot = makeRobotWithGoal('r1', 5, 5);
        const warMap = makeWarMap(robot);
        let controlled = true;
        const clock = startClock(
            warMap, () => {}, createOwnerResources(), undefined, 100,
            () => false,
            () => controlled ? 'r1' : null,
        );

        // Hold control for 5 ticks — robot should not move
        vi.advanceTimersByTime(5 * 5 * 100);
        const startX = robot.x;

        // Release control and advance 10 more ticks
        controlled = false;
        vi.advanceTimersByTime(10 * 5 * 100);
        clock.stop();

        expect(robot.x).toBeGreaterThan(startX);
    });
});
