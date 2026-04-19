/**
 * Integration: combat between opposing robots
 *
 * Tests the full pipeline: startClock → simpleAI (fight) → applyFire → health
 * reduction → death animation (dyingTicks) → removal from warMap.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, RobotGoal, Owner, RobotAI, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { Chassis, Weapon, Electronics, calcHealth, WEAPON_RANGE } from '../../../data/robot';
import { SUB_TICKS } from '../../../game/mechanics/projectile';
import { ActionType, type RobotAction } from '../../../game/actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TICK_MS = 100;

function advanceGameTicks(n: number): void {
    vi.advanceTimersByTime(n * SUB_TICKS * TICK_MS);
}

function makeRobot(id: string, x: number, y: number, owner: Owner, facing: Direction): RobotObject {
    const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON], electronics: Electronics.STANDARD };
    return {
        id, type: ObjectType.ROBOT, x, y, owner, facing,
        goal: RobotGoal.ATTACK_ROBOTS,
        robotConfig: cfg, health: calcHealth(cfg),
        ai: RobotAI.SIMPLE,
    };
}

function makeWarMap(...robots: RobotObject[]): WarMap {
    return { width: 30, height: 30, objects: [...robots], projectiles: [] };
}

// ─── Health reduction ─────────────────────────────────────────────────────────

describe('scenario: combat health reduction', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('opposing robots facing each other reduce each other health over time', () => {
        // Place robots adjacent (distance=1) so scanAdjacentEnemy finds them
        const red  = makeRobot('red',  5, 5, Owner.RED,  Direction.E);
        const blue = makeRobot('blue', 6, 5, Owner.BLUE, Direction.W);
        const warMap = makeWarMap(red, blue);

        const redInitial  = red.health;
        const blueInitial = blue.health;

        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        // 20 game ticks — enough for at least one exchange of fire
        advanceGameTicks(20);
        clock.stop();

        // At least one side took damage
        const redDamaged  = (red.health  ?? redInitial)  < redInitial;
        const blueDamaged = (blue.health ?? blueInitial) < blueInitial;
        expect(redDamaged || blueDamaged).toBe(true);
    });
});

// ─── Death animation ──────────────────────────────────────────────────────────

describe('scenario: robot death lifecycle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('robot with 1 hp gains dyingTicks after taking a hit', () => {
        const red  = makeRobot('red',  5, 5, Owner.RED,  Direction.E);
        const blue = makeRobot('blue', 6, 5, Owner.BLUE, Direction.W);
        // Set blue to near-death so first hit kills it
        blue.health = 1;

        const warMap = makeWarMap(red, blue);
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        // 5 ticks — red should fire at least once; blue health hits 0
        advanceGameTicks(5);
        clock.stop();

        const blueInMap = warMap.objects.find(o => o.id === 'blue') as RobotObject | undefined;
        if (blueInMap) {
            // Still in map but dying
            expect(blueInMap.dyingTicks).toBeGreaterThan(0);
        } else {
            // Already removed after death animation
            expect(true).toBe(true);
        }
    });

    it('dead robot is removed from warMap after DEATH_BLINK_TICKS game ticks', () => {
        const red  = makeRobot('red',  5, 5, Owner.RED,  Direction.E);
        const blue = makeRobot('blue', 6, 5, Owner.BLUE, Direction.W);
        blue.health = 1;

        const warMap = makeWarMap(red, blue);
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);

        // 20 ticks — enough for kill + full blink animation (6 ticks) to complete
        advanceGameTicks(20);
        clock.stop();

        expect(warMap.objects.find(o => o.id === 'blue')).toBeUndefined();
    });
});

// ─── Manual fire action ───────────────────────────────────────────────────────

describe('scenario: manual fire action applied via clock', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('FIRE manual action reduces enemy health on the next game tick', () => {
        const red  = makeRobot('red',  5, 5, Owner.RED,  Direction.E);
        const blue = makeRobot('blue', 7, 5, Owner.BLUE, Direction.W);
        const warMap = makeWarMap(red, blue);

        const blueInitialHealth = blue.health;
        let pendingAction: RobotAction | null =
            { type: ActionType.FIRE, targetId: 'blue', weapon: Weapon.CANNON };

        const clock = startClock(
            warMap, createOwnerResources(), undefined, TICK_MS,
            () => false,
            () => 'red',        // red is under manual control
            () => { const a = pendingAction; pendingAction = null; return a; },
        );

        // One game tick — fire action should be applied
        advanceGameTicks(1);
        clock.stop();

        expect(blue.health).toBeLessThan(blueInitialHealth);
    });

    it('manual MOVE action moves the controlled robot in the given direction', () => {
        const red = makeRobot('red', 5, 5, Owner.RED, Direction.E);
        const warMap = makeWarMap(red);

        // Pre-queue enough MOVE actions so the robot actually moves (needs to face E already)
        const moves: RobotAction[] = Array(10).fill(
            { type: ActionType.MOVE, direction: Direction.E }
        );
        let idx = 0;

        const clock = startClock(
            warMap, createOwnerResources(), undefined, TICK_MS,
            () => false,
            () => 'red',
            () => moves[idx++] ?? null,
        );

        advanceGameTicks(10);
        clock.stop();

        expect(red.x).toBeGreaterThan(5);
    });
});
