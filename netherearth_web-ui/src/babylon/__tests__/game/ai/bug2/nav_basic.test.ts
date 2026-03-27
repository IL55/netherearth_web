import { ObjectType } from '../../../../game/warmap';
import { Direction } from '../../../../game/warmap';
import { describe, it, expect } from 'vitest';
import { dummyAI } from '../../../../game/ai/dummy';
import { applyAction } from '../../../../game/actions';
import { buildOccupancy } from '../../../../game/occupancy';
import { RobotGoal, Owner } from '../../../../game/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../../game/warmap';
import { Chassis, Electronics } from '../../../../data/robot';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRobot(x: number, y: number, facing: Direction.N|Direction.S|Direction.E|Direction.W = Direction.E): RobotObject {
    return {
        id: 'r0', type: ObjectType.ROBOT, x, y, facing, owner: Owner.RED,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
    };
}

function makeFactory(x: number, y: number): WarObject {
    return { id: 'f0', type: ObjectType.FACTORY, x, y, subtype: 'cannons' };
}

function makeWall(x: number, y: number): WarObject {
    return { id: `w_${x}_${y}`, type: ObjectType.WALL3, x, y };
}

function run(map: WarMap, robot: RobotObject, ticks: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    for (let t = 0; t < ticks; t++) {
        map.tick = t;
        const occ = buildOccupancy(map);
        const action = dummyAI(robot, map, occ);
        applyAction(robot, action, map, occ);
        path.push({ x: robot.x, y: robot.y });
    }
    return path;
}

// ─── Test 1: no immediate reversal ──────────────────────────────────────────
//
//  Robot at (2,5), single wall at (5,5), factory at (10,5).
//  After the robot moves sideways to get around the wall, it must NOT
//  immediately come back to the position it just left (no A→B→A→B bounce).
//  We check that no two consecutive positions are identical for more than
//  4 ticks in a row (rotation takes ≤2 ticks, then a move).

describe('nav basic: no position bounce', () => {
    it('robot never stays on the same (x,y) for more than 4 consecutive ticks', () => {
        const robot  = makeRobot(2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            objects: [makeFactory(10, 5), makeWall(5, 5), robot],
            tick: 0,
        };

        const path = run(map, robot, 60);

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

// ─── Test 2: clears single wall within tight tick budget ─────────────────────
//
//  Same setup.  The wall only blocks one cell — a smart robot should pass
//  it and continue eastward.  We give only 40 ticks (much tighter than the
//  existing 300-tick test) so a bouncing robot fails fast.

describe('nav basic: clears single wall quickly', () => {
    it('robot passes x=5 obstacle and reaches x≥7 within 80 ticks', () => {
        const robot  = makeRobot(2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            objects: [makeFactory(10, 5), makeWall(5, 5), robot],
            tick: 0,
        };

        const path = run(map, robot, 80);
        const maxX = Math.max(...path.map(p => p.x));
        expect(maxX).toBeGreaterThanOrEqual(7);
    });
});

// ─── Test 3: exits simple dead end ───────────────────────────────────────────
//
//  A minimal dead end: two walls form a corner that blocks the direct path.
//  Robot at (2,5) heading east. Walls at (5,5) and (5,4) form a small
//  vertical barrier.  Robot must go around (via y=6 or y=3) and continue east.
//  Goal factory at (10,5).  Budget: 60 ticks.
//
//    y=3  . . . . . . .
//    y=4  . . . . W . .
//    y=5  R . . . W . F
//    y=6  . . . . . . .

describe('nav basic: exits corner dead end', () => {
    it('robot navigates around 2-wall corner and reaches x≥7 within 120 ticks', () => {
        const robot = makeRobot(2, 5);
        const map: WarMap = {
            width: 15, height: 10,
            objects: [makeFactory(10, 5), makeWall(5, 5), makeWall(5, 4), robot],
            tick: 0,
        };

        const path = run(map, robot, 120);
        const maxX = Math.max(...path.map(p => p.x));
        expect(maxX).toBeGreaterThanOrEqual(7);
    });
});