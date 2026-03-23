import { describe, it, expect } from 'vitest';
import { applyAction, rotationToDirection, directionToRotation, MOVE_STEP } from '../../game/actions';
import { buildOccupancy, isOccupied } from '../../game/occupancy';
import type { WarMap, WarObject } from '../../game/warmap';

function makeMap(objects: WarMap['objects'] = [], width = 20, height = 20): WarMap {
    return { width, height, objects };
}

function makeRobot(id: string, x: number, y: number, rotation = 0): WarObject {
    // antigrav: speedFactor=1 on all terrain — avoids terrain-slowdown interference in movement tests
    return { id, type: 'robot', x, y, rotation, robotConfig: { chassis: 'h-antigrav', electronics: 'h-electronics' } };
}

describe('rotationToDirection / directionToRotation round-trip', () => {
    it('rotation=0 → East',     () => expect(rotationToDirection(0)).toBe('E'));
    it('rotation=π/2 → North',  () => expect(rotationToDirection(Math.PI / 2)).toBe('N'));
    it('rotation=π → West',     () => expect(rotationToDirection(Math.PI)).toBe('W'));
    it('rotation=-π/2 → South', () => expect(rotationToDirection(-Math.PI / 2)).toBe('S'));

    it('directionToRotation is inverse of rotationToDirection', () => {
        for (const dir of ['N', 'E', 'S', 'W'] as const) {
            expect(rotationToDirection(directionToRotation(dir))).toBe(dir);
        }
    });
});

describe('applyAction — rotate', () => {
    it('rotates right by π/2', () => {
        const robot = makeRobot('r', 5, 5, 0);
        applyAction(robot, { type: 'rotate', direction: 'right' }, makeMap(), buildOccupancy(makeMap()));
        expect(robot.rotation).toBeCloseTo(Math.PI / 2, 5);
    });

    it('rotates left by π/2', () => {
        const robot = makeRobot('r', 5, 5, 0);
        applyAction(robot, { type: 'rotate', direction: 'left' }, makeMap(), buildOccupancy(makeMap()));
        expect(robot.rotation).toBeCloseTo(-Math.PI / 2, 5);
    });
});

describe('applyAction — move', () => {
    it('moves robot by MOVE_STEP in facing direction', () => {
        const robot = makeRobot('r', 5, 5, 0); // facing East
        const map = makeMap([robot]);
        applyAction(robot, { type: 'move', direction: 'E' }, map, buildOccupancy(map));
        expect(robot.x).toBeCloseTo(5 + MOVE_STEP, 5);
        expect(robot.y).toBeCloseTo(5, 5);
    });

    it('blocks move if robot is not facing that direction', () => {
        const robot = makeRobot('r', 5, 5, 0); // facing East, tries to move North
        const map = makeMap([robot]);
        expect(applyAction(robot, { type: 'move', direction: 'N' }, map, buildOccupancy(map))).toBe(false);
        expect(robot.x).toBe(5);
    });

    it('blocks move outside map west boundary', () => {
        const robot = makeRobot('r', 0, 5, Math.PI); // facing West at x=0
        const map = makeMap([robot], 10, 10);
        expect(applyAction(robot, { type: 'move', direction: 'W' }, map, buildOccupancy(map))).toBe(false);
    });

    it('blocks move outside map east boundary', () => {
        const robot = makeRobot('r', 9.75, 5, 0); // facing East near right edge
        const map = makeMap([robot], 10, 10);
        expect(applyAction(robot, { type: 'move', direction: 'E' }, map, buildOccupancy(map))).toBe(false);
    });

    it('blocks move within 1.0 unit of another robot', () => {
        const mover:   WarObject = makeRobot('a', 1.0, 5, 0); // facing East
        const blocker: WarObject = makeRobot('b', 2.0, 5, 0); // 1.0 away East
        const map = makeMap([mover, blocker]);
        // moving to 1.25 would be 0.75 from blocker → blocked
        expect(applyAction(mover, { type: 'move', direction: 'E' }, map, buildOccupancy(map))).toBe(false);
        expect(mover.x).toBe(1.0);
    });

    it('allows move when other robot is exactly 1.0 away', () => {
        const mover:   WarObject = makeRobot('a', 0.75, 5, 0); // facing East
        const blocker: WarObject = makeRobot('b', 2.0,  5, 0); // 1.25 away
        const map = makeMap([mover, blocker]);
        // moving to 1.0 is 1.0 from blocker → allowed (strict < 1.0 check)
        expect(applyAction(mover, { type: 'move', direction: 'E' }, map, buildOccupancy(map))).toBe(true);
        expect(mover.x).toBeCloseTo(1.0, 5);
    });

    it('blocks move when target cell has a structure', () => {
        const robot:   WarObject = makeRobot('r', 1.75, 5, 0);
        const factory: WarObject = { id: 'f1', type: 'factory', x: 2, y: 5, subtype: 'cannons' };
        const map = makeMap([robot, factory]);
        expect(applyAction(robot, { type: 'move', direction: 'E' }, map, buildOccupancy(map))).toBe(false);
    });

    it('two robots moving toward each other maintain 1.0 separation', () => {
        const a: WarObject = makeRobot('a', 0.75, 5, 0);       // facing East
        const b: WarObject = makeRobot('b', 2.0,  5, Math.PI); // facing West
        const map = makeMap([a, b]);
        const occ = buildOccupancy(map);
        // a moves to 1.0 (distance to b = 1.0 → ok)
        expect(applyAction(a, { type: 'move', direction: 'E' }, map, occ)).toBe(true);
        expect(a.x).toBeCloseTo(1.0, 5);
        // now a=1.0, b=2.0 — distance=1.0; b tries to move W to 1.75, distance=0.75 → blocked
        expect(applyAction(b, { type: 'move', direction: 'W' }, map, occ)).toBe(false);
    });

    it('updates occupancy after move so subsequent robots see new position', () => {
        const mover:   WarObject = makeRobot('a', 0.75, 5, 0); // facing East
        const watcher: WarObject = makeRobot('b', 3.0,  5, 0);
        const map = makeMap([mover, watcher]);
        const occ = buildOccupancy(map);
        applyAction(mover, { type: 'move', direction: 'E' }, map, occ);
        expect(mover.x).toBeCloseTo(1.0, 5);
        // position updated: check spot that is ≥1.0 away from new pos (1.0,5) → clear
        expect(isOccupied(occ, 0.0, 5, 'b')).toBe(false); // 0.0 is exactly 1.0 away → not blocked
    });

    it('idle action does nothing', () => {
        const robot = makeRobot('r', 5, 5);
        const map = makeMap([robot]);
        expect(applyAction(robot, { type: 'idle' }, map, buildOccupancy(map))).toBe(false);
        expect(robot.x).toBe(5);
    });
});
