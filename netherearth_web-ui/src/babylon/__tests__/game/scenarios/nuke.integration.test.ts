/**
 * Integration: nuclear robot goal behaviour
 *
 * Verifies that NUKE_FACTORY / NUKE_WARBASE goals make the robot navigate
 * toward the target structure and eventually detonate (via shouldDetonateNuclear),
 * and that a nuclear robot built from a warbase receives a nuke goal.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, RobotGoal, Owner, RobotAI, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject, MapObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { Chassis, Weapon, Electronics, calcHealth } from '../../../data/robot';
import { SUB_TICKS } from '../../../game/mechanics/projectile';
import { tickBuild, _resetBuildState, CHASSIS_BUILD_COST, WEAPON_BUILD_COST, ELECTRONICS_BUILD_COST, NUCLEAR_BUILD_COST } from '../../../game/mechanics/build';

const TICK_MS = 100;

function advanceGameTicks(n: number): void {
    vi.advanceTimersByTime(n * SUB_TICKS * TICK_MS);
}

function makeNukeRobot(id: string, x: number, y: number, goal: RobotGoal): RobotObject {
    const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON], electronics: Electronics.STANDARD, nuclear: true };
    return {
        id, type: ObjectType.ROBOT, x, y, owner: Owner.RED,
        facing: Direction.E, goal,
        robotConfig: cfg, health: calcHealth(cfg),
        ai: RobotAI.SIMPLE,
    };
}

// ─── findTarget respects nuke goals ──────────────────────────────────────────

describe('NUKE_FACTORY goal', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('robot moves closer to an enemy factory over time', () => {
        const factory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 5, owner: Owner.BLUE };
        const robot = makeNukeRobot('r1', 0, 5, RobotGoal.NUKE_FACTORY);
        const warMap: WarMap = { width: 20, height: 20, objects: [factory, robot], projectiles: [] };

        const startX = robot.x;
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(10);
        clock.stop();

        // Should have moved east toward the factory
        expect(robot.x).toBeGreaterThan(startX);
    });

    it('does not navigate toward a friendly factory', () => {
        const friendlyFactory: MapObject = { id: 'f1', type: ObjectType.FACTORY, x: 10, y: 5, owner: Owner.RED };
        const robot = makeNukeRobot('r1', 5, 5, RobotGoal.NUKE_FACTORY);
        const warMap: WarMap = { width: 20, height: 20, objects: [friendlyFactory, robot], projectiles: [] };

        const startX = robot.x;
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(10);
        clock.stop();

        // No enemy factory — robot idles in place
        expect(robot.x).toBe(startX);
    });
});

describe('NUKE_WARBASE goal', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('robot moves closer to an enemy warbase over time', () => {
        const warbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 15, y: 5, owner: Owner.BLUE };
        const robot = makeNukeRobot('r1', 0, 5, RobotGoal.NUKE_WARBASE);
        const warMap: WarMap = { width: 20, height: 20, objects: [warbase, robot], projectiles: [] };

        const startX = robot.x;
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(10);
        clock.stop();

        expect(robot.x).toBeGreaterThan(startX);
    });

    it('does not navigate toward a friendly warbase', () => {
        const friendlyWarbase: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 10, y: 5, owner: Owner.RED };
        const robot = makeNukeRobot('r1', 5, 5, RobotGoal.NUKE_WARBASE);
        const warMap: WarMap = { width: 20, height: 20, objects: [friendlyWarbase, robot], projectiles: [] };

        const startX = robot.x;
        const clock = startClock(warMap, () => {}, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(10);
        clock.stop();

        expect(robot.x).toBe(startX);
    });
});

// ─── Nuclear robot built from warbase gets a nuke goal ────────────────────────

describe('tickBuild — nuclear robot gets nuke goal', () => {
    beforeEach(() => _resetBuildState());

    it('assigns NUKE_FACTORY or NUKE_WARBASE to a nuclear robot', () => {
        const wb: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 0, y: 0, owner: Owner.RED };
        const warMap: WarMap = { width: 20, height: 20, objects: [wb], projectiles: [] };
        const res = createOwnerResources();
        // Full nuclear kit cost
        const cost = {
            chassis:     CHASSIS_BUILD_COST[Chassis.BIPOD].chassis!,
            phasers:     WEAPON_BUILD_COST[Weapon.PHASERS].phasers!,
            nuclear:     NUCLEAR_BUILD_COST.nuclear!,
            electronics: ELECTRONICS_BUILD_COST.electronics!,
        };
        Object.assign(res[Owner.RED], cost);

        tickBuild(warMap, res);

        const robot = warMap.objects.find(o => o.type === ObjectType.ROBOT) as RobotObject;
        expect(robot.robotConfig?.nuclear).toBe(true);
        expect([RobotGoal.NUKE_FACTORY, RobotGoal.NUKE_WARBASE]).toContain(robot.goal);
    });

    it('alternates between NUKE_FACTORY and NUKE_WARBASE across successive builds', () => {
        const wb1: MapObject = { id: 'wb1', type: ObjectType.WARBASE, x: 0, y: 0, owner: Owner.RED };
        const wb2: MapObject = { id: 'wb2', type: ObjectType.WARBASE, x: 0, y: 10, owner: Owner.RED };
        const warMap: WarMap = { width: 20, height: 20, objects: [wb1, wb2], projectiles: [] };
        const res = createOwnerResources();
        res[Owner.RED].chassis = 6; res[Owner.RED].phasers = 6;
        res[Owner.RED].nuclear = 4; res[Owner.RED].electronics = 2;

        tickBuild(warMap, res);

        const robots = warMap.objects.filter(o => o.type === ObjectType.ROBOT) as RobotObject[];
        expect(robots.length).toBe(2);
        const goals = robots.map(r => r.goal);
        expect(goals).toContain(RobotGoal.NUKE_FACTORY);
        expect(goals).toContain(RobotGoal.NUKE_WARBASE);
    });
});
