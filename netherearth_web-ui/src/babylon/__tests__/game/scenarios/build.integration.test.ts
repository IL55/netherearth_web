/**
 * Integration: robot production from warbase
 *
 * Tests the full pipeline: startClock → tickBuild → new robot in warMap.
 * Verifies that a warbase with sufficient resources spawns a robot on the
 * next game tick, and that the spawn point being occupied blocks production.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, Owner } from '../../../game/core/warmap';
import type { WarMap, MapObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { SUB_TICKS } from '../../../game/mechanics/projectile';
import { RobotGoal, RobotAI, Direction } from '../../../game/core/warmap';
import { _resetBuildState, CHASSIS_BUILD_COST, WEAPON_BUILD_COST } from '../../../game/mechanics/build';
import { CAPTURE_ZONES } from '../../../game/mechanics/capture';
import { Chassis, Weapon } from '../../../data/robot';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TICK_MS = 100;

function advanceGameTicks(n: number): void {
    vi.advanceTimersByTime(n * SUB_TICKS * TICK_MS);
}

function makeWarMap(warbase: MapObject): WarMap {
    return { width: 30, height: 30, tiles: [warbase], robots: [], projectiles: [], killCounts: {}, tick: 0 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('scenario: warbase robot production', () => {
    beforeEach(() => { vi.useFakeTimers(); _resetBuildState(); });
    afterEach(() => vi.useRealTimers());

    it('spawns a robot after one tick when resources are sufficient', () => {
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.RED };
        const warMap = makeWarMap(warbase);

        const resources = createOwnerResources();
        // Minimum cost: tracks chassis (chassis: 1)
        resources[Owner.RED].chassis  = CHASSIS_BUILD_COST[Chassis.TRACKS].chassis!;
        resources[Owner.RED].cannons  = WEAPON_BUILD_COST[Weapon.CANNON].cannons!;

        const clock = startClock(warMap, resources, undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        const robots = warMap.robots;
        expect(robots.length).toBe(1);
        expect(robots[0].owner).toBe(Owner.RED);
    });

    it('does not spawn when resources are insufficient', () => {
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.RED };
        const warMap = makeWarMap(warbase);

        // Empty resources — cannot afford anything
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        expect(warMap.robots.length).toBe(0);
    });

    it('deducts resources after spawn', () => {
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.RED };
        const warMap = makeWarMap(warbase);

        const resources = createOwnerResources();
        resources[Owner.RED].chassis = CHASSIS_BUILD_COST[Chassis.TRACKS].chassis!;
        resources[Owner.RED].cannons = WEAPON_BUILD_COST[Weapon.CANNON].cannons!;

        const clock = startClock(warMap, resources, undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        // Resources spent — not enough for another tracks+cannon build
        expect(resources[Owner.RED].chassis).toBe(0);
    });

    it('does not spawn when spawn point is occupied by another robot', () => {
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.RED };
        const warMap = makeWarMap(warbase);

        // Place a robot exactly at the spawn point (warbase capture zone center)
        const zone = CAPTURE_ZONES['warbase']!;
        const blocker = {
            id: 'blocker',
            type: ObjectType.ROBOT as const,
            x: warbase.x + zone.dx,
            y: warbase.y + zone.dy,
            owner: Owner.RED,
            facing: Direction.N,
            health: 100,
            robotConfig: { chassis: Chassis.TRACKS },
            goal: RobotGoal.ATTACK_ROBOTS,
            ai: RobotAI.SIMPLE,
        };
        warMap.robots.push(blocker as any);

        const resources = createOwnerResources();
        resources[Owner.RED].chassis = 10;
        resources[Owner.RED].cannons = 10;

        const clock = startClock(warMap, resources, undefined, TICK_MS);
        advanceGameTicks(1);
        clock.stop();

        // Only the blocker robot — no new spawn
        expect(warMap.robots.length).toBe(1);
    });
});
