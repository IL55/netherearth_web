import { describe, it, expect } from 'vitest';
import { dummyAI } from '../../game/ai/dummy';
import { applyAction, directionToRotation } from '../../game/actions';
import { buildOccupancy } from '../../game/occupancy';
import { tickCapture, CAPTURE_ZONES } from '../../game/capture';
import type { WarMap, WarObject } from '../../game/warmap';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRobot(overrides: Partial<WarObject> & { id: string; x: number; y: number }): WarObject {
    return {
        type: 'robot',
        rotation: directionToRotation('E'),
        owner: 1,
        goal: 'capture_neutral_factory',
        robotConfig: { chassis: 'h-antigrav', electronics: 'h-electronics' },
        ...overrides,
    };
}

function makeFactory(id: string, x: number, y: number): WarObject {
    return { id, type: 'factory', x, y, subtype: 'cannons' /* no owner = neutral */ };
}

function makeWall(x: number, y: number): WarObject {
    return { id: `wall_${x}_${y}`, type: 'wall3', x, y };
}

function makeTile(x: number, y: number, subtype: string): WarObject {
    return { id: `tile_${x}_${y}`, type: 'tile', x, y, subtype };
}

/** Run up to maxTicks; return the tick on which the robot entered the factory
 *  capture zone (Chebyshev ≤ radius), or -1 if it never did. */
function runUntilCapture(
    map: WarMap,
    robot: WarObject,
    factory: WarObject,
    maxTicks: number,
): number {
    const zone = CAPTURE_ZONES['factory']!;
    const goalX = factory.x + zone.dx;
    const goalY = factory.y + zone.dy;

    for (let tick = 0; tick < maxTicks; tick++) {
        map.tick = tick;
        const occ = buildOccupancy(map);
        const action = dummyAI(robot, map, occ);
        applyAction(robot, action, map, occ);

        const d = Math.max(Math.abs(robot.x - goalX), Math.abs(robot.y - goalY));
        if (d <= zone.radius) return tick;
    }
    return -1;
}

// ─── Test 1: open field — no obstacles ───────────────────────────────────────

describe('open field: no obstacles', () => {
    it('antigrav robot reaches factory capture zone within 100 ticks', () => {
        /**
         * Robot at (2,5) facing E, factory at (12,5).
         * Capture zone center = (13,6).  No walls, no terrain.
         */
        const factory = makeFactory('f0', 12, 5);
        const robot   = makeRobot({ id: 'r0', x: 2, y: 5 });
        const map: WarMap = { width: 20, height: 12, objects: [factory, robot], tick: 0 };

        const tick = runUntilCapture(map, robot, factory, 100);
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
            objects: [...walls, factory, robot],
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
     * Terrain tiles are stored as WarObjects with type='tile'; absent tiles default to 'G'.
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
            robotConfig: { chassis: 'h-bipod', electronics: 'h-electronics' },
        });
        const map: WarMap = {
            width: 20, height: 12,
            objects: [...mountains, factory, robot],
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
            robotConfig: { chassis: 'h-bipod', electronics: 'h-electronics' },
        });
        const map: WarMap = {
            width: 20, height: 12,
            objects: [...mountains, factory, robot],
            tick: 0,
        };

        let maxStuck = 0;
        for (let tick = 0; tick < 30; tick++) {
            map.tick = tick;
            const occ    = buildOccupancy(map);
            const action = dummyAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            maxStuck = Math.max(maxStuck, robot.stuckTicks ?? 0);
        }

        expect(maxStuck).toBeGreaterThanOrEqual(3);
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
            robotConfig: { chassis: 'h-tracks', electronics: 'h-electronics' },
        });
        const map: WarMap = {
            width: 20, height: 12,
            objects: [factory, robot],
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
            robotConfig: { chassis: 'h-antigrav', electronics: 'h-electronics' },
        });
        const map: WarMap = {
            width: 20, height: 12,
            objects: [factory, robot],
            tick: 0,
        };

        let captured = false;
        for (let tick = 0; tick < 400; tick++) {
            map.tick = tick;
            const occ    = buildOccupancy(map);
            const action = dummyAI(robot, map, occ);
            applyAction(robot, action, map, occ);
            tickCapture(map);

            if (factory.owner === robot.owner) { captured = true; break; }
        }

        expect(captured).toBe(true);
        expect(factory.owner).toBe(1);
    });
});
