/**
 * Integration: victory detection via clock
 *
 * Tests that startClock emits 'game:over' through the event bus when
 * checkVictory detects a winner — warbases fully captured or enemy eliminated.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, RobotGoal, Owner, RobotAI, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject, MapObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { Chassis, Weapon, calcHealth } from '../../../data/robot';
import { SUB_TICKS } from '../../../game/mechanics/projectile';
import { bus } from '../../../game/event-bus';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TICK_MS = 100;

function advanceGameTicks(n: number): void {
    vi.advanceTimersByTime(n * SUB_TICKS * TICK_MS);
}

function makeRobot(id: string, x: number, y: number, owner: Owner): RobotObject {
    const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };
    return {
        id, type: ObjectType.ROBOT, x, y, owner,
        facing: Direction.E, goal: RobotGoal.DEFEND,
        robotConfig: cfg, health: calcHealth(cfg),
        ai: RobotAI.SIMPLE,
    };
}

function warbase(id: string, owner: Owner, x = 0, y = 0): MapObject {
    return { id, type: ObjectType.WARBASE, x, y, owner };
}

function makeWarMap(tiles: MapObject[], robots: RobotObject[]): WarMap {
    return { width: 20, height: 20, tiles, robots, projectiles: [], killCounts: {}, tick: 0 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('scenario: victory via warbase control', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => { vi.useRealTimers(); bus.clear(); });

    it('emits game:over when RED owns all warbases from the first tick', () => {
        const winners: Owner[] = [];
        const handler = (e: { winner: Owner }) => winners.push(e.winner);
        bus.on('game:over', handler);

        const warMap = makeWarMap(
            [warbase('wb1', Owner.RED), warbase('wb2', Owner.RED)],
            [makeRobot('r1', 5, 5, Owner.RED)],
        );

        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        expect(winners).toContain(Owner.RED);
    });

    it('does not emit game:over while warbases are split', () => {
        let fired = false;
        bus.on('game:over', () => { fired = true; });

        const warMap = makeWarMap(
            [warbase('wb1', Owner.RED), warbase('wb2', Owner.BLUE)],
            [makeRobot('r1', 5, 5, Owner.RED), makeRobot('r2', 15, 5, Owner.BLUE)],
        );

        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(5);
        clock.stop();

        expect(fired).toBe(false);
    });
});

describe('scenario: victory via elimination', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => { vi.useRealTimers(); bus.clear(); });

    it('emits game:over when BLUE has no warbases and no robots', () => {
        const winners: Owner[] = [];
        bus.on('game:over', e => winners.push(e.winner));

        // RED owns a warbase; BLUE has none and no robots
        const warMap = makeWarMap(
            [warbase('wb1', Owner.RED)],
            [makeRobot('r1', 5, 5, Owner.RED)],
        );

        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        expect(winners).toContain(Owner.RED);
    });
});
