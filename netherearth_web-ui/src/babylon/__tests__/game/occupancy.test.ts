import { describe, it, expect } from 'vitest';
import { buildOccupancy, isOccupied, updateRobotPosition, ROBOT_COLLISION_DISTANCE } from '../../game/occupancy';
import type { WarMap } from '../../game/warmap';

function makeMap(objects: WarMap['objects']): WarMap {
    return { width: 10, height: 10, objects };
}

describe('buildOccupancy', () => {
    it('stores robot exact positions', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 2.75, y: 3.5 }]);
        const occ = buildOccupancy(map);
        expect(occ.robots).toHaveLength(1);
        expect(occ.robots[0]).toMatchObject({ id: 'r1', x: 2.75, y: 3.5 });
    });

    it('stores blocking structures by cell key', () => {
        const map = makeMap([{ id: 'f1', type: 'factory', x: 5, y: 7, subtype: 'cannons' }]);
        const occ = buildOccupancy(map);
        expect(occ.structures.has('5,7')).toBe(true);
    });

    it('does not add tiles to occupancy', () => {
        const map = makeMap([{ id: 't1', type: 'tile', x: 1, y: 1, subtype: 'G' }]);
        const occ = buildOccupancy(map);
        expect(occ.robots).toHaveLength(0);
        expect(occ.structures.size).toBe(0);
    });
});

describe('isOccupied — robots', () => {
    it('blocked when within ROBOT_COLLISION_DISTANCE of another robot', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 3, y: 4 }]);
        const occ = buildOccupancy(map);
        // 0.5 away — less than 1.0 → blocked
        expect(isOccupied(occ, 3.5, 4, 'other')).toBe(true);
    });

    it('not blocked at exactly ROBOT_COLLISION_DISTANCE away', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 3, y: 4 }]);
        const occ = buildOccupancy(map);
        // distance = 1.0 → NOT blocked (< 1.0 is the rule)
        expect(isOccupied(occ, 3 + ROBOT_COLLISION_DISTANCE, 4, 'other')).toBe(false);
    });

    it('not blocked beyond ROBOT_COLLISION_DISTANCE', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 3, y: 4 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 5, 4, 'other')).toBe(false);
    });

    it('robot does not block itself when excludeId is passed', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 3, y: 4 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 3.25, 4, 'r1')).toBe(false);  // same robot
    });

    it('blocks without excludeId (checks all robots)', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 3, y: 4 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 3.25, 4)).toBe(true);
    });
});

describe('isOccupied — structures', () => {
    it('blocked inside structure cell', () => {
        const map = makeMap([{ id: 'w1', type: 'warbase', x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        expect(isOccupied(occ, 2, 5)).toBe(true);
        expect(isOccupied(occ, 2.5, 5.25)).toBe(true); // same cell
    });

    it('not blocked outside warbase footprint (warbase spans 4×5 cells)', () => {
        const map = makeMap([{ id: 'w1', type: 'warbase', x: 2, y: 5 }]);
        const occ = buildOccupancy(map);
        // warbase at (2,5) blocks cells x=[2,5], y=[5,9]; (6,5) is outside that range
        expect(isOccupied(occ, 6, 5)).toBe(false);
    });
});

describe('updateRobotPosition', () => {
    it('updates stored position so future checks use new coords', () => {
        const map = makeMap([{ id: 'r1', type: 'robot', x: 1, y: 0 }]);
        const occ = buildOccupancy(map);

        updateRobotPosition(occ, 'r1', 2, 0);

        // old position (1,0) is now free — check far enough from new pos (2,0): 0.5 away → free
        expect(isOccupied(occ, 0.5, 0, 'other')).toBe(false);
        // new position is blocked
        expect(isOccupied(occ, 2.5, 0, 'other')).toBe(true);
    });

    it('two robots maintain 1.0 separation after movement', () => {
        const map = makeMap([
            { id: 'r1', type: 'robot', x: 1, y: 0 },
            { id: 'r2', type: 'robot', x: 3, y: 0 },
        ]);
        const occ = buildOccupancy(map);
        // r1 tries to move to 2.0 — distance to r2 (3,0) = 1.0 → NOT blocked
        expect(isOccupied(occ, 2.0, 0, 'r1')).toBe(false);
        // r1 tries to move to 2.25 — distance to r2 = 0.75 < 1.0 → BLOCKED
        expect(isOccupied(occ, 2.25, 0, 'r1')).toBe(true);
    });
});
