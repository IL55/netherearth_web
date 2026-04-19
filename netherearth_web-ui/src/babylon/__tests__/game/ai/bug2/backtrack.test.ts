/**
 * Backtrack regression tests: confirms Bug2 wall-follow causes excessive
 * backward movement (toward the robot's warbase) when navigating around obstacles.
 *
 * "Backtrack" = cells traveled in the direction OPPOSITE to the goal after
 *  entering WALL_FOLLOW mode.  The user considers >5 cells unacceptable.
 *
 * These tests document CURRENT behaviour (backtrack >> 5) so that a fix can
 * be verified by flipping the commented-out assertions.
 */

import { ObjectType, Direction, RobotGoal, Owner } from '../../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../../game/core/warmap';
import { NavMode } from '../../../../game/types/nav-mode';
import { describe, it, expect } from 'vitest';
import { stepSimpleAI as simpleAI } from '../../../../game/ai/simple';
import { applyAction } from '../../../../game/actions';
import { buildOccupancy } from '../../../../game/core/occupancy';
import { Chassis, Electronics } from '../../../../data/robot';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRobot(id: string, x: number, y: number): RobotObject {
    return {
        id,
        type: ObjectType.ROBOT,
        x,
        y,
        facing: Direction.E,
        owner: Owner.RED,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
    };
}

function makeFactory(id: string, x: number, y: number): WarObject {
    return { id, type: ObjectType.FACTORY, x, y, subtype: 'cannons' };
}

function makeWall(x: number, y: number): WarObject {
    return { id: `wall_${x}_${y}`, type: ObjectType.WALL3, x, y };
}

/**
 * Simulate `ticks` rounds.
 * Returns:
 *  - minX          : lowest x the robot visited at any point
 *  - maxX          : highest x the robot visited
 *  - wallFollowMinX: lowest x visited WHILE navMode === WALL_FOLLOW
 *  - wallFollowMaxX: highest x visited while in WALL_FOLLOW
 *  - startX        : initial x of the robot
 */
function runAndMeasure(
    map: WarMap,
    robot: RobotObject,
    ticks: number,
): { startX: number; minX: number; maxX: number; wallFollowMinX: number; wallFollowMaxX: number } {
    const startX = robot.x;
    let minX = robot.x;
    let maxX = robot.x;
    let wallFollowMinX = robot.x;
    let wallFollowMaxX = robot.x;
    let everWallFollow = false;

    for (let tick = 0; tick < ticks; tick++) {
        map.tick = tick;
        const occ    = buildOccupancy(map);
        const action = simpleAI(robot, map, occ);
        applyAction(robot, action, map, occ);

        if (robot.x < minX) minX = robot.x;
        if (robot.x > maxX) maxX = robot.x;

        if (robot.nav?.navMode === NavMode.WALL_FOLLOW) {
            if (!everWallFollow) {
                wallFollowMinX = robot.x;
                wallFollowMaxX = robot.x;
                everWallFollow = true;
            }
            if (robot.x < wallFollowMinX) wallFollowMinX = robot.x;
            if (robot.x > wallFollowMaxX) wallFollowMaxX = robot.x;
        }
    }

    return { startX, minX, maxX, wallFollowMinX, wallFollowMaxX };
}

// ─── Scenario A: nearly-full-height wall, gap only at the TOP row ──────────
//
//  Map 20×12 (y=0..11).  Wall column at x=10, y=1..11 — the gap is at y=0.
//  Robot at (8, 5) heading for a neutral factory at (16, 5).
//
//  Bug2 right-hand rule sends the robot SOUTH when it hits the wall.
//  After reaching the south map boundary (y=11) the robot turns WEST and
//  travels all the way to x=0, then NORTH to y=0 before the exit condition
//  finally fires.  That western leg is the "huge cycle around the whole map"
//  the user observed.

describe('Backtrack: nearly-full-height wall, gap only at top', () => {
    function makeMap() {
        // Wall column at x=10, y=1..11 (gap at y=0 only)
        const walls: WarObject[] = Array.from({ length: 11 }, (_, i) => makeWall(10, i + 1));
        const factory = makeFactory('f0', 16, 5);
        const robot   = makeRobot('r0', 8, 5);
        return {
            map: { width: 20, height: 12, tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 } as WarMap,
            robot,
        };
    }

    it('CURRENT BUG: robot travels more than 5 cells west of its start', () => {
        const { map, robot } = makeMap();
        const { startX, minX } = runAndMeasure(map, robot, 800);

        // Robot starts at x=8 and loops all the way to x≈0 — ~8 cells west.
        const backtrack = startX - minX;

        // ── confirmed fixed ──────────────────────────────────────────────────
        expect(backtrack).toBeLessThanOrEqual(5);
    });

    it('CURRENT BUG: robot travels more than 5 cells west during wall-follow phase', () => {
        const { map, robot } = makeMap();
        const { wallFollowMinX, startX } = runAndMeasure(map, robot, 800);

        // ── confirmed fixed ──────────────────────────────────────────────────
        expect(wallFollowMinX).toBeGreaterThan(startX - 5);
    });

    it('robot eventually reaches the factory despite the huge detour', () => {
        const { map, robot } = makeMap();

        // Factory capture zone center = (factory.x+1, factory.y+1)
        const goalX = 17, goalY = 6;
        let reached = false;
        for (let tick = 0; tick < 800; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            if (Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY)) <= 1.5) {
                reached = true;
                break;
            }
        }
        expect(reached).toBe(true);
    });
});

// ─── Scenario B: wall with gap at BOTTOM — acceptable south-only detour ─────
//
//  Map 20×12.  Wall column at x=10, y=0..10 — gap at y=11.
//  Robot at (8, 5).
//
//  Bug2 tries south first.  With the gap below the robot's starting y the
//  robot finds the gap quickly (~6 tiles south).  No westward backtrack occurs.
//  This scenario contrasts with Scenario A — it is the "acceptable" case.

describe('Backtrack: wall with gap at bottom (acceptable south-only detour)', () => {
    function makeMap() {
        const walls: WarObject[] = Array.from({ length: 11 }, (_, i) => makeWall(10, i)); // y=0..10
        const factory = makeFactory('f0', 16, 5);
        const robot   = makeRobot('r0', 8, 5);
        return {
            map: { width: 20, height: 12, tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 } as WarMap,
            robot,
        };
    }

    it('robot does not travel west of its starting position', () => {
        const { map, robot } = makeMap();
        const { startX, minX } = runAndMeasure(map, robot, 400);

        // Gap is below start; robot goes south then east — no westward movement.
        const backtrack = startX - minX;
        expect(backtrack).toBeLessThanOrEqual(0);
    });

    it('robot reaches the factory within 400 ticks (short detour south)', () => {
        const { map, robot } = makeMap();
        const goalX = 17, goalY = 6;
        let reached = false;
        for (let tick = 0; tick < 400; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            applyAction(robot, simpleAI(robot, map, occ), map, occ);
            if (Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY)) <= 1.5) {
                reached = true;
                break;
            }
        }
        expect(reached).toBe(true);
    });
});

// ─── Scenario C: full-height wall (no gap) — robot loops the map perimeter ──
//
//  Map 20×12.  Wall at x=10, y=0..11 (NO gap, wall spans entire height).
//  Robot at (5, 5), factory at (16, 5).
//
//  The exit condition can never fire (east is always blocked).
//  Bug2 drives the robot: south → west → north → (east blocked) → south → …
//  causing an infinite loop around the entire map perimeter.

describe('Backtrack: full-height wall causes perimeter loop', () => {
    function makeMap() {
        const walls: WarObject[] = Array.from({ length: 12 }, (_, i) => makeWall(10, i)); // y=0..11
        const factory = makeFactory('f0', 16, 5);
        const robot   = makeRobot('r0', 5, 5);
        return {
            map: { width: 20, height: 12, tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 } as WarMap,
            robot,
        };
    }

    it('CURRENT BUG: robot visits x < 1 while in wall-follow (reaches opposite map edge)', () => {
        const { map, robot } = makeMap();
        const { wallFollowMinX } = runAndMeasure(map, robot, 600);

        // ── confirmed fixed ──────────────────────────────────────────────────
        // Robot no longer loops to the opposite boundary.
        expect(wallFollowMinX).toBeGreaterThan(robot.x - 5); // no more than 5 west of start
    });

    it('CURRENT BUG: wall-follow westward travel exceeds 5 cells', () => {
        const { map, robot } = makeMap();
        const { wallFollowMinX, startX } = runAndMeasure(map, robot, 600);

        // ── confirmed fixed ──────────────────────────────────────────────────
        expect(wallFollowMinX).toBeGreaterThan(startX - 5); // never > 5 west of start
    });
});
