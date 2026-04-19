import { ObjectType } from '../../../../game/core/warmap';
import { Direction } from '../../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { simpleAI } from '../../../../game/ai/simple';
import { applyAction } from '../../../../game/actions';
import { buildOccupancy } from '../../../../game/core/occupancy';
import { tickCapture, CAPTURE_ZONES } from '../../../../game/mechanics/capture';
import { RobotGoal, Owner } from '../../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../../game/core/warmap';
import { Chassis, Electronics } from '../../../../data/robot';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRobot(overrides: Partial<RobotObject> & { id: string; x: number; y: number }): RobotObject {
    return {
        type: ObjectType.ROBOT,
        facing: Direction.E,
        owner: Owner.RED,
        goal: RobotGoal.CAPTURE_NEUTRAL_FACTORY,
        robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
        ...overrides,
    };
}

function makeFactory(id: string, x: number, y: number): WarObject {
    return { id, type: ObjectType.FACTORY, x, y, subtype: 'cannons' /* no owner = neutral */ };
}

function makeWall(x: number, y: number): WarObject {
    return { id: `wall_${x}_${y}`, type: ObjectType.WALL3, x, y };
}

function makeTile(x: number, y: number, subtype: string): WarObject {
    return { id: `tile_${x}_${y}`, type: ObjectType.TILE, x, y, subtype };
}

/** Run up to maxTicks; return the tick on which the robot entered the factory
 *  capture zone (Chebyshev ≤ radius), or -1 if it never did. */
function runUntilCapture(
    map: WarMap,
    robot: RobotObject,
    factory: WarObject,
    maxTicks: number,
): number {
    const zone = CAPTURE_ZONES['factory']!;
    const goalX = factory.x + zone.dx;
    const goalY = factory.y + zone.dy;

    for (let tick = 0; tick < maxTicks; tick++) {
        map.tick = tick;
        const occ = buildOccupancy(map);
        const action = simpleAI(robot, map, occ);
        applyAction(robot, action, map, occ);

        const d = Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY));
        if (d <= zone.radius) return tick;
    }
    return -1;
}

// ─── Test 1: open field — no obstacles ───────────────────────────────────────

describe('open field: no obstacles', () => {
    it('antigrav robot reaches factory capture zone within 200 ticks', () => {
        /**
         * Robot at (2,5) facing E, factory at (12,5).
         * Capture zone center = (13,6).  No walls, no terrain.
         */
        const factory = makeFactory('f0', 12, 5);
        const robot   = makeRobot({ id: 'r0', x: 2, y: 5 });
        const map: WarMap = { width: 20, height: 12, tiles: [factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        const tick = runUntilCapture(map, robot, factory, 200);
        expect(tick).toBeGreaterThanOrEqual(0);
    });
});

// ─── Test 2: single vertical wall blocking direct path ───────────────────────

describe('single wall: robot finds gap and reaches factory', () => {
    /**
     * Wall column at x=8, y=2..8 (7 units tall).
     * Gap above (y<2) and below (y>8).
     * Robot at (2,5) must detour North or South.
     *
     *   . . R . . . . . W . . . . . F
     *                   W
     *                   W
     */
    it('reaches factory within 300 ticks despite single wall', () => {
        const walls   = [2, 3, 4, 5, 6, 7, 8].map(y => makeWall(8, y));
        const factory = makeFactory('f0', 14, 5);
        const robot   = makeRobot({ id: 'r0', x: 2, y: 5 });
        const map: WarMap = {
            width: 20, height: 12,
            tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        const tick = runUntilCapture(map, robot, factory, 300);
        expect(tick).toBeGreaterThanOrEqual(0);
    });
});

// ─── Test 3: bipod chassis — mountain row impassable, gap required ────────────

describe('bipod + mountain barrier', () => {
    /**
     * Mountain tiles ('M') at x=8, y=2..8.  Bipod cannot cross mountains.
     * Gaps at y=0..1 (above) and y=9..10 (below) — robot must go around.
     * Terrain tiles are stored as WarObjects with type = ObjectType.TILE; absent tiles default to 'G'.
     *
     *   y=0 . . . . . . . . G  ← passable gap
     *   y=1 . . . . . . . . G  ← passable gap
     *   y=2 . . R . . . . . M  ← mountain wall starts
     *   y=3                 M
     *   ...                 M
     *   y=8                 M  ← mountain wall ends
     *   y=9 . . . . . . . . G  ← passable gap
     *
     * Robot is h-bipod, which cannot pass 'M' terrain.
     */
    it('bipod detects mountain barrier and navigates around to factory', () => {
        const mountains = [2, 3, 4, 5, 6, 7, 8].map(y => makeTile(8, y, 'M'));
        const factory   = makeFactory('f0', 14, 5);
        const robot     = makeRobot({
            id: 'r0', x: 2, y: 5,
            robotConfig: { chassis: Chassis.BIPOD, electronics: Electronics.STANDARD },
        });
        const map: WarMap = {
            width: 20, height: 12,
            tiles: [...mountains, factory], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        const tick = runUntilCapture(map, robot, factory, 500);
        expect(tick).toBeGreaterThanOrEqual(0);
    });

    it('bipod stuckTicks rises to ≥3 when facing impassable mountain column', () => {
        const mountains = [2, 3, 4, 5, 6, 7, 8].map(y => makeTile(8, y, 'M'));
        const factory   = makeFactory('f0', 14, 5);
        const robot     = makeRobot({
            id: 'r0', x: 7, y: 5, // placed right next to mountain wall
            robotConfig: { chassis: Chassis.BIPOD, electronics: Electronics.STANDARD },
        });
        const map: WarMap = {
            width: 20, height: 12,
            tiles: [...mountains, factory], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        let maxStuck = 0;
        for (let tick = 0; tick < 30; tick++) {
            map.tick = tick;
            const occ    = buildOccupancy(map);
            const action = simpleAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            maxStuck = Math.max(maxStuck, robot.nav?.stuckTicks ?? 0);
        }

        expect(maxStuck).toBeGreaterThanOrEqual(3);
    });
});

// ─── Test 3b: map boundaries — robot must never step outside the map ──────────

describe('boundary: robot stays within map bounds', () => {
    /**
     * Four scenarios each push the robot toward a different map edge via wall_follow.
     * Valid range: x ∈ [0, width−1], y ∈ [0, height−1].
     * (Center-based coords; tiles are centered at integers so the last tile center is width−1.)
     *
     *  left  (min-x): U-trap open to the west  — robot travels west then north
     *  right (max-x): U-trap open to the east  — robot travels east then south
     *  top   (min-y): U-trap open to the north — robot travels north then east
     *  bottom(max-y): U-trap open to the south — robot travels south then west
     */

    function checkBounds(map: WarMap, robot: RobotObject, ticks: number): { violated: boolean; minX: number; maxX: number; minY: number; maxY: number } {
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

    it('left boundary (min-x): U-trap open west, robot never exits x < 0', () => {
        // U-trap: top y=2 x=5..11, right x=11 y=3..7, bottom y=8 x=5..11
        // robot approaches east, bounces west, wall_follow drives to x≈0
        const walls: WarObject[] = [
            ...([5,6,7,8,9,10,11].map(x => makeWall(x, 2))),
            ...([3,4,5,6,7].map(y => makeWall(11, y))),
            ...([5,6,7,8,9,10,11].map(x => makeWall(x, 8))),
        ];
        const map: WarMap = { width: 20, height: 10,
            tiles: [...walls, makeFactory('f0', 16, 5)], robots: [makeRobot({ id: 'r0', x: 2, y: 5 })], projectiles: [], killCounts: {}, tick: 0 };
        const robot = map.robots.find(o => o.id === 'r0')!;

        const { violated, minX } = checkBounds(map, robot, 400);
        expect(violated).toBe(false);
        expect(minX).toBeGreaterThanOrEqual(0);
    });

    it('right boundary (max-x): robot placed near right edge never exits x >= width', () => {
        // Wall column at x=12 y=2..8 blocks eastward path from x=10
        // factory is to the west — robot approaches east, bounces off wall, wall_follow
        const walls = [2,3,4,5,6,7,8].map(y => makeWall(12, y));
        const factory = makeFactory('f0', 17, 5);
        const robot   = makeRobot({ id: 'r0', x: 10, y: 5 });
        const map: WarMap = { width: 20, height: 12,
            tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        const { violated, maxX } = checkBounds(map, robot, 400);
        expect(violated).toBe(false);
        expect(maxX).toBeLessThanOrEqual(map.width - 1);
    });

    it('top boundary (min-y): wall row forces robot north, never exits y < 0', () => {
        // Wall row at y=3 x=2..10 blocks southward approach; factory above row
        const walls = [2,3,4,5,6,7,8,9,10].map(x => makeWall(x, 3));
        const factory = makeFactory('f0', 6, 0);
        const robot   = makeRobot({ id: 'r0', x: 6, y: 8,
            robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD } });
        const map: WarMap = { width: 15, height: 12,
            tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        const { violated, minY } = checkBounds(map, robot, 400);
        expect(violated).toBe(false);
        expect(minY).toBeGreaterThanOrEqual(0);
    });

    it('bottom boundary (max-y): wall row forces robot south, never exits y >= height', () => {
        // Wall row at y=7 x=2..10 blocks northward approach; factory below row
        const walls = [2,3,4,5,6,7,8,9,10].map(x => makeWall(x, 7));
        const factory = makeFactory('f0', 6, 10);
        const robot   = makeRobot({ id: 'r0', x: 6, y: 3,
            robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD } });
        const map: WarMap = { width: 15, height: 12,
            tiles: [...walls, factory], robots: [robot], projectiles: [], killCounts: {}, tick: 0 };

        const { violated, maxY } = checkBounds(map, robot, 400);
        expect(violated).toBe(false);
        expect(maxY).toBeLessThanOrEqual(map.height - 1);
    });
});

// ─── Test 4: factory capture — C-shaped structure, robot must enter slot ──────

describe('factory capture: robot enters C-shaped slot', () => {
    /**
     * The factory occupancy is C-shaped (left column + right top/bottom, open at right-centre).
     * Capture zone is the open slot: factory.x+1, factory.y+1.
     *
     * Factory AABB blocks direct East access at y=factory.y, so the robot must navigate
     * around the factory body and enter through the slot opening.
     *
     *   R → → → → → [factory C-shape]
     *                  slot ← robot must enter here
     */
    it('tracks robot captures neutral factory within 300 ticks', () => {
        const factory = makeFactory('f0', 10, 4);
        const robot   = makeRobot({
            id: 'r0', x: 2, y: 5,
            robotConfig: { chassis: Chassis.TRACKS, electronics: Electronics.STANDARD },
        });
        const map: WarMap = {
            width: 20, height: 12,
            tiles: [factory], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        const tick = runUntilCapture(map, robot, factory, 300);
        expect(tick).toBeGreaterThanOrEqual(0);
    });

    it('robot actually captures the factory (owner changes to robot owner)', () => {
        /**
         * Simulate full tickCapture loop until factory owner changes.
         * Factory starts neutral (no owner); robot owner = 1.
         */
        const factory = makeFactory('f0', 10, 4);
        const robot   = makeRobot({
            id: 'r0', x: 2, y: 5,
            robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
        });
        const map: WarMap = {
            width: 20, height: 12,
            tiles: [factory], robots: [robot], projectiles: [], killCounts: {},
            tick: 0,
        };

        let captured = false;
        for (let tick = 0; tick < 400; tick++) {
            map.tick = tick;
            const occ    = buildOccupancy(map);
            const action = simpleAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            tickCapture(map);

            if (factory.owner === robot.owner) { captured = true; break; }
        }

        expect(captured).toBe(true);
        expect(factory.owner).toBe(Owner.RED);
    });
});
