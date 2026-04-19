/**
 * Trémaux algorithm tests.
 *
 * Mirrors the Bug2 test scenarios (nav_basic, movement, maze) but with
 * navAlgo: NavAlgo.TREMAUX on every robot.  Tick budgets are slightly
 * more generous than Bug2 where needed, since Trémaux explores more
 * broadly before converging.
 */
import { ObjectType } from '../../../../game/core/warmap';
import { Direction } from '../../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { stepSimpleAI as simpleAI } from '../../../../game/ai/simple';
import { applyAction } from '../../../../game/actions';
import { buildOccupancy } from '../../../../game/core/occupancy';
import { tickCapture, CAPTURE_ZONES } from '../../../../game/mechanics/capture';
import { RobotGoal, Owner } from '../../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../../game/core/warmap';
import { NavAlgo } from '../../../../game/ai/nav-algo';
import { Chassis, Electronics } from '../../../../data/robot';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRobot(
    id: string,
    x: number,
    y: number,
    overrides: Partial<RobotObject> = {},
): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y,
        facing: Direction.E, owner: Owner.RED,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD, navAlgo: NavAlgo.TREMAUX },
        ...overrides,
    };
}

function makeFactory(x: number, y: number): WarObject {
    return { id: `f_${x}_${y}`, type: ObjectType.FACTORY, x, y, subtype: 'cannons' };
}

function makeWall(x: number, y: number): WarObject {
    return { id: `w_${x}_${y}`, type: ObjectType.WALL3, x, y };
}

function makeTile(x: number, y: number, subtype: string): WarObject {
    return { id: `tile_${x}_${y}`, type: ObjectType.TILE, x, y, subtype };
}

function runUntilCapture(map: WarMap, robot: RobotObject, factory: WarObject, maxTicks: number): number {
    const zone  = CAPTURE_ZONES[ObjectType.FACTORY]!;
    const goalX = factory.x + zone.dx;
    const goalY = factory.y + zone.dy;
    for (let tick = 0; tick < maxTicks; tick++) {
        map.tick = tick;
        const occ = buildOccupancy(map);
        applyAction(robot, simpleAI(robot, map, occ), map, occ);
        if (Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY)) <= zone.radius) return tick;
    }
    return -1;
}

function checkBounds(map: WarMap, robot: RobotObject, ticks: number) {
    let violated = false;
    let minX = robot.x, maxX = robot.x, minY = robot.y, maxY = robot.y;
    for (let tick = 0; tick < ticks; tick++) {
        map.tick = tick;
        const occ = buildOccupancy(map);
        applyAction(robot, simpleAI(robot, map, occ), map, occ);
        minX = Math.min(minX, robot.x); maxX = Math.max(maxX, robot.x);
        minY = Math.min(minY, robot.y); maxY = Math.max(maxY, robot.y);
        if (robot.x < 0 || robot.y < 0 || robot.x > map.width - 1 || robot.y > map.height - 1) {
            violated = true; break;
        }
    }
    return { violated, minX, maxX, minY, maxY };
}

// ─── Basic movement ───────────────────────────────────────────────────────────

describe('Trémaux basic: no position bounce', () => {
    it('robot never stays on the same (x,y) for more than 4 consecutive ticks', () => {
        const robot = makeRobot('r0', 2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            tiles: [makeFactory(10, 5), makeWall(5, 5)], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        const path: { x: number; y: number }[] = [];
        for (let t = 0; t < 60; t++) {
            map.tick = t;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            path.push({ x: robot.x, y: robot.y });
        }

        let streak = 1;
        for (let i = 1; i < path.length; i++) {
            if (path[i].x === path[i-1].x && path[i].y === path[i-1].y) {
                streak++;
                expect(streak, `stuck at (${path[i].x},${path[i].y}) for ${streak} ticks`).toBeLessThanOrEqual(4);
            } else {
                streak = 1;
            }
        }
    });
});

describe('Trémaux basic: clears single wall quickly', () => {
    it('robot passes x=5 obstacle and reaches x≥7 within 50 ticks', () => {
        const robot = makeRobot('r0', 2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            tiles: [makeFactory(10, 5), makeWall(5, 5)], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        let maxX = robot.x;
        for (let t = 0; t < 50; t++) {
            map.tick = t;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            maxX = Math.max(maxX, robot.x);
        }
        expect(maxX).toBeGreaterThanOrEqual(7);
    });
});

describe('Trémaux basic: exits corner dead end', () => {
    it('robot navigates around 2-wall corner and reaches x≥7 within 80 ticks', () => {
        const robot = makeRobot('r0', 2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            tiles: [makeFactory(10, 5), makeWall(5, 5), makeWall(5, 4)], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        let maxX = robot.x;
        for (let t = 0; t < 80; t++) {
            map.tick = t;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            maxX = Math.max(maxX, robot.x);
        }
        expect(maxX).toBeGreaterThanOrEqual(7);
    });
});

// ─── Open field ───────────────────────────────────────────────────────────────

describe('Trémaux: open field', () => {
    it('reaches factory capture zone within 200 ticks', () => {
        const factory = makeFactory(12, 5);
        const robot   = makeRobot('r0', 2, 5);
        const map: WarMap = { width: 20, height: 12, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        expect(runUntilCapture(map, robot, factory, 200)).toBeGreaterThanOrEqual(0);
    });
});

// ─── Single wall ──────────────────────────────────────────────────────────────

describe('Trémaux: single wall — robot finds gap', () => {
    it('reaches factory within 400 ticks despite vertical wall', () => {
        const walls   = [2,3,4,5,6,7,8].map(y => makeWall(8, y));
        const factory = makeFactory(14, 5);
        const robot   = makeRobot('r0', 2, 5);
        const map: WarMap = { width: 20, height: 12, tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        expect(runUntilCapture(map, robot, factory, 400)).toBeGreaterThanOrEqual(0);
    });
});

// ─── Bipod + mountain barrier ─────────────────────────────────────────────────

describe('Trémaux: bipod + mountain barrier', () => {
    it('bipod detects mountain barrier and navigates around to factory', () => {
        const mountains = [2,3,4,5,6,7,8].map(y => makeTile(8, y, 'M'));
        const factory   = makeFactory(14, 5);
        const robot     = makeRobot('r0', 2, 5, {
            robotConfig: { chassis: Chassis.BIPOD, electronics: Electronics.STANDARD, navAlgo: NavAlgo.TREMAUX },
        });
        const map: WarMap = { width: 20, height: 12, tiles: [...mountains, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        expect(runUntilCapture(map, robot, factory, 600)).toBeGreaterThanOrEqual(0);
    });
});

// ─── U-shaped dead end (maze) ─────────────────────────────────────────────────

describe('Trémaux: U-shaped dead end', () => {
    it('escapes dead end and reaches factory within 1200 ticks', () => {
        const walls = [
            ...[5,6,7,8,9,10,11].map(x => makeWall(x, 2)),
            ...[3,4,5,6,7].map(y => makeWall(11, y)),
            ...[5,6,7,8,9,10,11].map(x => makeWall(x, 8)),
        ];
        const factory = makeFactory(16, 5);
        const robot   = makeRobot('r0', 2, 5);
        const map: WarMap = { width: 20, height: 10, tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        const zone  = CAPTURE_ZONES[ObjectType.FACTORY]!;
        const goalX = factory.x + zone.dx;
        const goalY = factory.y + zone.dy;

        let reached = false;
        for (let tick = 0; tick < 1200; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            if (Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY)) <= 1.5) {
                reached = true; break;
            }
        }
        expect(reached).toBe(true);
    });
});

// ─── Factory capture (full tickCapture loop) ──────────────────────────────────

describe('Trémaux: factory capture', () => {
    it('robot actually captures the factory (owner changes)', () => {
        const factory = makeFactory(10, 4);
        const robot   = makeRobot('r0', 2, 5);
        const map: WarMap = { width: 20, height: 12, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        let captured = false;
        for (let tick = 0; tick < 1000; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            tickCapture(map);
            if (factory.owner === robot.owner) { captured = true; break; }
        }

        expect(captured).toBe(true);
        expect(factory.owner).toBe(Owner.RED);
    });
});

// ─── Map boundaries ───────────────────────────────────────────────────────────

describe('Trémaux: map boundaries', () => {
    it('left boundary: never exits x < 0', () => {
        const walls: WarObject[] = [
            ...[5,6,7,8,9,10,11].map(x => makeWall(x, 2)),
            ...[3,4,5,6,7].map(y => makeWall(11, y)),
            ...[5,6,7,8,9,10,11].map(x => makeWall(x, 8)),
        ];
        const robot = makeRobot('r0', 2, 5);
        const map: WarMap = { width: 20, height: 10, tiles: [...walls, makeFactory(16, 5)], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const { violated, minX } = checkBounds(map, robot, 500);
        expect(violated).toBe(false);
        expect(minX).toBeGreaterThanOrEqual(0);
    });

    it('top boundary: never exits y < 0', () => {
        const walls = [2,3,4,5,6,7,8,9,10].map(x => makeWall(x, 3));
        const robot = makeRobot('r0', 6, 8);
        const map: WarMap = { width: 15, height: 12, tiles: [...walls, makeFactory(6, 0)], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const { violated, minY } = checkBounds(map, robot, 500);
        expect(violated).toBe(false);
        expect(minY).toBeGreaterThanOrEqual(0);
    });

    it('bottom boundary: never exits y >= height', () => {
        const walls = [2,3,4,5,6,7,8,9,10].map(x => makeWall(x, 7));
        const robot = makeRobot('r0', 6, 3);
        const map: WarMap = { width: 15, height: 12, tiles: [...walls, makeFactory(6, 10)], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };
        const { violated, maxY } = checkBounds(map, robot, 500);
        expect(violated).toBe(false);
        expect(maxY).toBeLessThanOrEqual(map.height - 1);
    });
});
