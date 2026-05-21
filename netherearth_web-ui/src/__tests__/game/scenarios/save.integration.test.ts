/**
 * Integration: save / load pipeline
 *
 * Tests the full round-trip: real game state built via startClock →
 * saveGame → parseGameSave → applySave → restored state matches.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectType, RobotGoal, Owner, RobotAI, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { startClock } from '../../../game/clock';
import { createOwnerResources } from '../../../game/resources';
import { Chassis, Weapon, calcHealth } from '../../../data/robot';
import { SUB_TICKS } from '../../../game/mechanics/projectile';
import { saveGame, parseGameSave, applySave } from '../../../game/save';
import type { ShipState } from '../../../game/ship/types';

// ─── localStorage mock ────────────────────────────────────────────────────────

function makeLocalStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem:    (k: string) => store[k] ?? null,
        setItem:    (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear:      () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key:        (i: number) => Object.keys(store)[i] ?? null,
    };
}

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

function makeWarMap(...robots: RobotObject[]): WarMap {
    return { width: 20, height: 20, tiles: [], robots, projectiles: [], killCounts: {}, tick: 0 };
}

function makeShip(x = 5, y = 5, height = 2): ShipState {
    return { x, y, height, vx: 0, vy: 0 };
}

// ─── Round-trip: state is preserved ──────────────────────────────────────────

describe('scenario: save round-trip', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('localStorage', makeLocalStorageMock());
    });
    afterEach(() => vi.useRealTimers());

    it('parseGameSave returns null when no save exists for that timestamp', () => {
        expect(parseGameSave(9999, 'test.map')).toBeNull();
    });

    it('tick counter is preserved after save → load', () => {
        const warMap = makeWarMap();
        const clock = startClock(warMap, createOwnerResources(), undefined, TICK_MS);
        advanceGameTicks(10);
        clock.stop();

        const tickAfterPlay = warMap.tick;
        saveGame('test.map', warMap, createOwnerResources(), makeShip());

        const saves = listSavesFromStorage();
        expect(saves.length).toBe(1);
        const save = parseGameSave(saves[0].timestamp, saves[0].mapName);
        expect(save?.tick).toBe(tickAfterPlay);
    });

    it('robot positions are preserved after save → applySave', () => {
        const robot = makeRobot('r1', 3, 7, Owner.RED);
        const warMap = makeWarMap(robot);
        const resources = createOwnerResources();
        const ship = makeShip(4, 4, 1);

        saveGame('test.map', warMap, resources, ship);
        const saves = listSavesFromStorage();
        const save = parseGameSave(saves[0].timestamp, saves[0].mapName)!;

        // Mutate state to simulate time passing
        robot.x = 99;
        robot.y = 99;

        applySave(save, warMap, resources, ship);
        const restored = warMap.robots.find(r => r.id.includes('r1'));
        expect(restored?.x).toBe(3);
        expect(restored?.y).toBe(7);
    });

    it('ship position is restored by applySave', () => {
        const warMap = makeWarMap();
        const resources = createOwnerResources();
        const ship = makeShip(8, 3, 5);

        saveGame('test.map', warMap, resources, ship);
        const saves = listSavesFromStorage();
        const save = parseGameSave(saves[0].timestamp, saves[0].mapName)!;

        ship.x = 0; ship.y = 0; ship.height = 0;
        applySave(save, warMap, resources, ship);

        expect(ship.x).toBe(8);
        expect(ship.y).toBe(3);
        expect(ship.height).toBe(5);
    });

    it('dying robots are excluded from the save', () => {
        const alive = makeRobot('alive', 1, 1, Owner.RED);
        const dying = { ...makeRobot('dying', 2, 2, Owner.BLUE), dyingTicks: 3 };
        const warMap = makeWarMap(alive, dying);

        saveGame('test.map', warMap, createOwnerResources(), makeShip());
        const saves = listSavesFromStorage();
        const save = parseGameSave(saves[0].timestamp, saves[0].mapName)!;

        expect(save.robots.some(r => r.id === 'alive')).toBe(true);
        expect(save.robots.some(r => r.id === 'dying')).toBe(false);
    });

    it('applySave clears in-flight projectiles', () => {
        const warMap = makeWarMap();
        warMap.projectiles = [{ id: 'p1', x: 1, y: 1 } as any];

        saveGame('test.map', warMap, createOwnerResources(), makeShip());
        const saves = listSavesFromStorage();
        const save = parseGameSave(saves[0].timestamp, saves[0].mapName)!;

        applySave(save, warMap, createOwnerResources(), makeShip());
        expect(warMap.projectiles).toHaveLength(0);
    });
});

// ─── Robot ID stability across save / load cycles ────────────────────────────

describe('scenario: robot ID stability', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('localStorage', makeLocalStorageMock());
    });
    afterEach(() => vi.useRealTimers());

    it('robot IDs get a loaded_ prefix after applySave', () => {
        const warMap = makeWarMap(makeRobot('robot_0', 1, 1, Owner.RED));
        const resources = createOwnerResources();
        const ship = makeShip();

        saveGame('test.map', warMap, resources, ship);
        const save = parseGameSave(listSavesFromStorage()[0].timestamp, 'test.map')!;
        applySave(save, warMap, resources, ship);

        expect(warMap.robots[0].id).toBe('loaded_robot_0');
    });

    it('save → load → save → load does not accumulate loaded_ prefixes', () => {
        const warMap = makeWarMap(makeRobot('robot_0', 1, 1, Owner.RED));
        const resources = createOwnerResources();
        const ship = makeShip();

        // First cycle
        saveGame('test.map', warMap, resources, ship);
        let save = parseGameSave(listSavesFromStorage()[0].timestamp, 'test.map')!;
        applySave(save, warMap, resources, ship);
        expect(warMap.robots[0].id).toBe('loaded_robot_0');

        // Second cycle — save the already-loaded game and reload it
        saveGame('test.map', warMap, resources, ship);
        const saves = listSavesFromStorage();
        save = parseGameSave(saves[saves.length - 1].timestamp, 'test.map')!;
        applySave(save, warMap, resources, ship);

        expect(warMap.robots[0].id).toBe('loaded_robot_0');
    });

    it('ID is stable across three load cycles', () => {
        const warMap = makeWarMap(makeRobot('robot_0', 1, 1, Owner.RED));
        const resources = createOwnerResources();
        const ship = makeShip();

        for (let cycle = 0; cycle < 3; cycle++) {
            saveGame('test.map', warMap, resources, ship);
            const saves = listSavesFromStorage();
            const save = parseGameSave(saves[saves.length - 1].timestamp, 'test.map')!;
            applySave(save, warMap, resources, ship);
        }

        expect(warMap.robots[0].id).toBe('loaded_robot_0');
    });
});

// ─── Helper: read saves back from the mocked localStorage ────────────────────

function listSavesFromStorage(): { timestamp: number; mapName: string }[] {
    const prefix = 'netherearth_save_';
    const result: { timestamp: number; mapName: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const colon = rest.indexOf(':');
        if (colon === -1) continue;
        const ts = Number(rest.slice(0, colon));
        if (isNaN(ts)) continue;
        result.push({ timestamp: ts, mapName: rest.slice(colon + 1) });
    }
    return result;
}
