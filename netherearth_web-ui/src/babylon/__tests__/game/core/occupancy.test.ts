import { ObjectType, Direction, RobotGoal, RobotAI } from '../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { buildOccupancy, isOccupied, updateRobotPosition, ROBOT_COLLISION_DISTANCE } from '../../../game/core/occupancy';
import { Owner } from '../../../game/types/owner';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { Chassis } from '../../../data/robot';

const DEFAULT_ROBOT_CONFIG = { chassis: Chassis.TRACKS };

function makeMap(objects: any[]): WarMap {
    const tiles = objects.filter(o => o.type !== ObjectType.ROBOT);
    const robots = objects.filter(o => o.type === ObjectType.ROBOT);
    return { width: 10, height: 10, tiles, robots, projectiles: [], killCounts: {}, tick: 0 };
}

const makeRobot = (partial: Pick<RobotObject, 'id'|'x'|'y'|'owner'>): RobotObject => ({
    type: ObjectType.ROBOT,
    facing: Direction.N,
    health: 100,
    robotConfig: DEFAULT_ROBOT_CONFIG,
    goal: RobotGoal.ATTACK_ROBOTS,
    ai: RobotAI.SIMPLE,
    ...partial,
});

describe('buildOccupancy', () => {
    it('stores robot exact positions', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 2.75, y: 3.5 })]);
        const occ = buildOccupancy(map);
        expect(occ.robots).toHaveLength(1);
        expect(occ.robots[0]).toMatchObject({ id: 'r1', x: 2.75, y: 3.5 });
    });

    it('factory produces 5 part AABBs (C-shape, hole at xo=1 yo=1)', () => {
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(occ.structures).toHaveLength(5);
        // left column — each 1×1 block at exact ±0.5 from center
        expect(occ.structures[0]).toMatchObject({ x0: 4.5, y0: 6.5, x1: 5.5, y1: 7.5 }); // (0,0)
        expect(occ.structures[1]).toMatchObject({ x0: 4.5, y0: 7.5, x1: 5.5, y1: 8.5 }); // (0,1)
        expect(occ.structures[2]).toMatchObject({ x0: 4.5, y0: 8.5, x1: 5.5, y1: 9.5 }); // (0,2)
        // right column — no part at (1,1)
        expect(occ.structures[3]).toMatchObject({ x0: 5.5, y0: 6.5, x1: 6.5, y1: 7.5 }); // (1,0)
        expect(occ.structures[4]).toMatchObject({ x0: 5.5, y0: 8.5, x1: 6.5, y1: 9.5 }); // (1,2)
    });

    it('factory hole at (xo=1, yo=1) is accessible', () => {
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        // capture zone center (5+1, 7+1) = (6, 8) must not be blocked
        expect(isOccupied(occ, 6, 8)).toBe(false);
        expect(isOccupied(occ, 6.25, 8)).toBe(false);
    });

    it('stores 1×1 wall as exact visual AABB (±0.5 from center)', () => {
        const map = makeMap([{ id: 'w1', type: ObjectType.WALL3, x: 2, y: 49 }]);
        const occ = buildOccupancy(map);
        expect(occ.structures).toHaveLength(1);
        expect(occ.structures[0]).toMatchObject({ x0: 1.5, y0: 48.5, x1: 2.5, y1: 49.5 });
    });

    it('does not add tiles to occupancy', () => {
        const map = makeMap([{ id: 't1', type: ObjectType.TILE, x: 1, y: 1, subtype: 'G' }]);
        const occ = buildOccupancy(map);
        expect(occ.robots).toHaveLength(0);
        expect(occ.structures).toHaveLength(0);
    });
});

describe('isOccupied — robots', () => {
    it('blocked when within ROBOT_COLLISION_DISTANCE of another robot', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 3, y: 4 })]);
        const occ = buildOccupancy(map);
        // 0.5 away — less than 1.0 → blocked
        expect(isOccupied(occ, 3.5, 4, 'other')).toBe(true);
    });

    it('not blocked at exactly ROBOT_COLLISION_DISTANCE away', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 3, y: 4 })]);
        const occ = buildOccupancy(map);
        // distance = 1.0 → NOT blocked (< 1.0 is the rule)
        expect(isOccupied(occ, 3 + ROBOT_COLLISION_DISTANCE, 4, 'other')).toBe(false);
    });

    it('not blocked beyond ROBOT_COLLISION_DISTANCE', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 3, y: 4 })]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 5, 4, 'other')).toBe(false);
    });

    it('robot does not block itself when excludeId is passed', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 3, y: 4 })]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 3.25, 4, 'r1')).toBe(false);  // same robot
    });

    it('blocks without excludeId (checks all robots)', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 3, y: 4 })]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 3.25, 4)).toBe(true);
    });
});

describe('isOccupied — structures (AABB, no floor)', () => {
    it('blocked at structure center', () => {
        const map = makeMap([{ id: 'w1', type: ObjectType.WALL3, x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 2, 5)).toBe(true);
    });

    it('blocked inside wall AABB — position that floor() would have missed', () => {
        // wall3 at (2,49): exact AABB x=[1.5, 2.5], y=[48.5, 49.5]
        // robot box at 1.75: [1.25, 2.25] overlaps [1.5, 2.5] → blocked
        const map = makeMap([{ id: 'w1', type: ObjectType.WALL3, x: 2, y: 49 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 1.75, 49)).toBe(true);
        expect(isOccupied(occ, 1.25, 49)).toBe(true);   // robot box [0.75,1.75] still overlaps [1.5,2.5]
    });

    it('not blocked just outside wall AABB', () => {
        const map = makeMap([{ id: 'w1', type: ObjectType.WALL3, x: 2, y: 49 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 1.0,  49)).toBe(false);  // robot box [0.5,1.5]: 1.5 > 1.5 false → free
        expect(isOccupied(occ, 3.0,  49)).toBe(false);  // robot box [2.5,3.5]: 2.5 < 2.5 false → free
    });

    it('blocked at AABB boundaries', () => {
        const map = makeMap([{ id: 'w1', type: ObjectType.WALL3, x: 2, y: 49 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 1.25, 49)).toBe(true);   // robot box [0.75,1.75] overlaps wall [1.5,2.5]
        expect(isOccupied(occ, 2.75, 49)).toBe(true);   // robot box [2.25,3.25] overlaps wall [1.5,2.5]
    });

    it('blocked inside warbase wall parts', () => {
        const map = makeMap([{ id: 'wb', type: ObjectType.WARBASE, x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 2.5, 5)).toBe(true);   // inside top part (xo=0.5, yo=0) -> 2 + 0.5 = 2.5
        expect(isOccupied(occ, 4.0, 8)).toBe(true);   // inside bottom-left part (xo=2, yo=3) -> 2 + 2 = 4, 5 + 3 = 8
    });

    it('not blocked at warbase capture hole (right-side gap at xo≈3.5, yo≈2)', () => {
        const map = makeMap([{ id: 'wb', type: ObjectType.WARBASE, x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        // gap between (xo=3,yo=1) AABB top=6.5 and (xo=3,yo=3) AABB bottom=7.5
        expect(isOccupied(occ, 5.5, 7)).toBe(false);
    });

    it('not blocked outside warbase right wall', () => {
        const map = makeMap([{ id: 'wb', type: ObjectType.WARBASE, x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        // part (xo=3, yo=1): AABB x=[4.5, 5.5], y=[5.5, 6.5]
        expect(isOccupied(occ, 5.75, 6)).toBe(true);   // robot box [5.25,6.25] overlaps [4.5,5.5]
        expect(isOccupied(occ, 6.0,  6)).toBe(false);  // robot box [5.5,6.5]: 5.5 < 5.5 false → free
    });
});

describe('factory capture slot — boundary-touching approach (MOVE_STEP=0.25)', () => {
    // Factory at (5,7). Walls around the capture slot at (6,8):
    //   highwall1@yo=1  x=[4.5,5.5]  y=[7.5,8.5]  — left wall of slot
    //   lowwall2@yo=0   x=[5.5,6.5]  y=[6.5,7.5]  — top wall of slot
    //   lowwall2@yo=2   x=[5.5,6.5]  y=[8.5,9.5]  — bottom wall of slot
    // Robot (box ±0.5) approaches from east along y=8.

    it('all MOVE_STEP positions on approach path are unblocked', () => {
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        for (const x of [7.0, 6.75, 6.5, 6.25, 6.0]) {
            expect(isOccupied(occ, x, 8), `x=${x}`).toBe(false);
        }
    });

    it('slot center (6,8) touches all three adjacent wall boundaries but is not blocked', () => {
        // left edge of robot box  = 6.0 - 0.5 = 5.5 = highwall1 x1  → strict < → no overlap
        // bottom edge of robot box = 8.0 - 0.5 = 7.5 = lowwall2@yo=0 y1 → strict < → no overlap
        // top edge of robot box    = 8.0 + 0.5 = 8.5 = lowwall2@yo=2 y0 → strict > → no overlap
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 6.0, 8.0)).toBe(false);
    });

    it('one MOVE_STEP inside the left wall (x=5.75) is blocked', () => {
        // robot box left edge = 5.25 < highwall1 x1=5.5 → overlap → blocked
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 5.75, 8.0)).toBe(true);
    });

    it('off-center toward top wall (6, 7.75) is blocked', () => {
        // robot box bottom edge = 7.25 < lowwall2@yo=0 y1=7.5 → overlap → blocked
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 6.0, 7.75)).toBe(true);
    });

    it('off-center toward bottom wall (6, 8.25) is blocked', () => {
        // robot box top edge = 8.75 > lowwall2@yo=2 y0=8.5 → overlap → blocked
        const map = makeMap([{ id: 'f1', type: ObjectType.FACTORY, x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 6.0, 8.25)).toBe(true);
    });
});

describe('updateRobotPosition', () => {
    it('updates stored position so future checks use new coords', () => {
        const map = makeMap([makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 1, y: 0 })]);
        const occ = buildOccupancy(map);

        updateRobotPosition(occ, 'r1', 2, 0);

        // old position (1,0) is now free — check far enough from new pos (2,0): 0.5 away → free
        expect(isOccupied(occ, 0.5, 0, 'other')).toBe(false);
        // new position is blocked
        expect(isOccupied(occ, 2.5, 0, 'other')).toBe(true);
    });

    it('two robots maintain 1.0 separation after movement', () => {
        const map = makeMap([
            makeRobot({ id: 'r1', owner: Owner.NEUTRAL, x: 1, y: 0 }),
            makeRobot({ id: 'r2', owner: Owner.NEUTRAL, x: 3, y: 0 }),
        ]);
        const occ = buildOccupancy(map);
        // r1 tries to move to 2.0 — distance to r2 (3,0) = 1.0 → NOT blocked
        expect(isOccupied(occ, 2.0, 0, 'r1')).toBe(false);
        // r1 tries to move to 2.25 — distance to r2 = 0.75 < 1.0 → BLOCKED
        expect(isOccupied(occ, 2.25, 0, 'r1')).toBe(true);
    });
});
