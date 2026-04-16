/**
 * Integration: factory and warbase capture
 *
 * Tests the full pipeline: startClock → simpleAI → applyMove → tickCapture
 * Robot is placed directly in the capture zone so navigation is not under test;
 * only the capture counter accumulation and ownership flip are verified.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, RobotGoal, Owner, RobotAI, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject, MapObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { Chassis, Weapon, calcHealth } from '../../../data/robot';
import { DAY_TICKS } from '../../../game/resources';
import { CAPTURE_ZONES } from '../../../game/mechanics/capture';
import { SUB_TICKS } from '../../../game/mechanics/projectile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TICK_MS = 100; // sub-tick interval passed to startClock

function advanceGameTicks(n: number): void {
    vi.advanceTimersByTime(n * SUB_TICKS * TICK_MS);
}

function makeRobot(id: string, x: number, y: number, owner: Owner, goal: RobotGoal): RobotObject {
    const cfg = { chassis: Chassis.TRACKS, weapon: Weapon.CANNON };
    return {
        id, type: ObjectType.ROBOT, x, y, owner,
        facing: Direction.E, goal,
        robotConfig: cfg, health: calcHealth(cfg),
        ai: RobotAI.SIMPLE,
    };
}

// ─── Neutral factory capture ──────────────────────────────────────────────────

describe('scenario: neutral factory capture', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('RED robot placed in capture zone flips factory owner after one day', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10 };
        const zone = CAPTURE_ZONES['factory']!;
        // Place robot exactly in the capture slot
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_NEUTRAL_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, objects: [factory, robot], projectiles: [] };
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);

        // One full day of consecutive ticks
        advanceGameTicks(DAY_TICKS);
        clock.stop();

        expect(factory.owner).toBe(Owner.RED);
    });

    it('capture counter resets if robot leaves mid-capture', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10 };
        const zone = CAPTURE_ZONES['factory']!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_NEUTRAL_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, objects: [factory, robot], projectiles: [] };
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);

        // Half a day in capture zone
        advanceGameTicks(Math.floor(DAY_TICKS / 2));
        // Move robot out
        robot.x = 0; robot.y = 0;
        advanceGameTicks(5);
        // Move back and finish — not enough consecutive ticks
        robot.x = factory.x + zone.dx; robot.y = factory.y + zone.dy;
        advanceGameTicks(Math.floor(DAY_TICKS / 2));
        clock.stop();

        // Factory must still be neutral — counter was reset
        expect(factory.owner).toBeUndefined();
    });

    it('BLUE robot cannot capture a factory already owned by BLUE', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10, owner: Owner.BLUE };
        const zone = CAPTURE_ZONES['factory']!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.BLUE, RobotGoal.CAPTURE_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, objects: [factory, robot], projectiles: [] };
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);

        advanceGameTicks(DAY_TICKS * 2);
        clock.stop();

        expect(factory.owner).toBe(Owner.BLUE); // unchanged
    });
});

// ─── Enemy factory capture ────────────────────────────────────────────────────

describe('scenario: enemy factory capture', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('RED robot in zone flips a BLUE-owned factory', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10, owner: Owner.BLUE };
        const zone = CAPTURE_ZONES['factory']!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, objects: [factory, robot], projectiles: [] };
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);

        advanceGameTicks(DAY_TICKS);
        clock.stop();

        expect(factory.owner).toBe(Owner.RED);
    });
});
