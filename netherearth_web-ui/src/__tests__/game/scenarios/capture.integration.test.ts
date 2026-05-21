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
    const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };
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
        const zone = CAPTURE_ZONES[ObjectType.FACTORY]!;
        // Place robot exactly in the capture slot
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_NEUTRAL_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        // One full day of consecutive ticks
        advanceGameTicks(DAY_TICKS);
        clock.stop();

        expect(factory.owner).toBe(Owner.RED);
    });

    it('capture counter resets if robot leaves mid-capture', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10 };
        const zone = CAPTURE_ZONES[ObjectType.FACTORY]!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_NEUTRAL_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

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
        const zone = CAPTURE_ZONES[ObjectType.FACTORY]!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.BLUE, RobotGoal.CAPTURE_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        advanceGameTicks(DAY_TICKS * 2);
        clock.stop();

        expect(factory.owner).toBe(Owner.BLUE); // unchanged
    });
});

// ─── Warbase capture with navigation ──────────────────────────────────────────

describe('scenario: warbase capture with navigation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('BLUE robot navigates precisely to warbase capture zone and captures it', () => {
        // Red warbase at (10, 10). Capture zone offset is dx: 3.5, dy: 2.0
        // So capture spot is exactly at (13.5, 12.0).
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 10, y: 10, owner: Owner.RED };
        const zone = CAPTURE_ZONES[ObjectType.WARBASE]!;
        
        // Place robot 2 cells EAST of the exact capture spot so it's not inside the warbase structure
        // Exact capture spot: (13.5, 12.0)
        const startX = warbase.x + zone.dx + 2; // 15.5
        const startY = warbase.y + zone.dy;     // 12.0
        const robot = makeRobot('r1', startX, startY, Owner.BLUE, RobotGoal.CAPTURE_WARBASE);
        robot.facing = Direction.W; // Face towards the capture spot

        const warMap: WarMap = { width: 30, height: 30, tiles: [warbase], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        // Before advancing, check robot's starting position.
        expect(robot.x).toBe(15.5);
        expect(robot.y).toBe(12.0);

        // Distance is 2 cells = 8 moves. Each move is 0.25 cells. 
        // MOVE_COOLDOWN is 2 ticks. 8 moves = 16 ticks.
        // We advance enough time to ensure it reaches the spot.
        advanceGameTicks(30);

        // Verify robot precisely reached the capture spot, no more "half cell early"
        expect(robot.x).toBe(13.5);
        expect(robot.y).toBe(12.0);
        
        // Currently, it shouldn't be captured yet
        expect(warbase.owner).toBe(Owner.RED);

        // Advance 3 days to complete the warbase capture (ticks: 3 * DAY_TICKS)
        advanceGameTicks(3 * DAY_TICKS);
        clock.stop();

        // The base is successfully captured!
        expect(warbase.owner).toBe(Owner.BLUE);
    });
});

// ─── Enemy factory capture ────────────────────────────────────────────────────

describe('scenario: enemy factory capture', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('RED robot in zone flips a BLUE-owned factory', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 10, owner: Owner.BLUE };
        const zone = CAPTURE_ZONES[ObjectType.FACTORY]!;
        const robot = makeRobot('r1', factory.x + zone.dx, factory.y + zone.dy, Owner.RED, RobotGoal.CAPTURE_FACTORY);

        const warMap: WarMap = { width: 30, height: 30, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        advanceGameTicks(DAY_TICKS);
        clock.stop();

        expect(factory.owner).toBe(Owner.RED);
    });
});
