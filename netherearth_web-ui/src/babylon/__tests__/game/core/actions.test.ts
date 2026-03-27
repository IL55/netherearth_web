import { ObjectType } from '../../../game/warmap';
import { Direction } from '../../../game/warmap';
import { describe, it, expect } from 'vitest';
import { applyAction, ActionType, RotateDir, MOVE_STEP } from '../../../game/actions';
import { rotationToDirection, directionToRotation } from '../../../view/map/rotation';
import { buildOccupancy, isOccupied } from '../../../game/occupancy';
import { Owner } from '../../../game/owner';
import type { WarMap, WarObject, RobotObject } from '../../../game/warmap';
import { Chassis, Electronics } from '../../../data/robot';

function makeMap(objects: WarMap['objects'] = [], width = 20, height = 20): WarMap {
    return { width, height, objects };
}

function makeRobot(id: string, x: number, y: number, facing: Direction.N | Direction.E | Direction.S | Direction.W = Direction.E): RobotObject {
    // antigrav: speedFactor=1 on all terrain — avoids terrain-slowdown interference in movement tests
    return { id, type: ObjectType.ROBOT, x, y, facing, owner: Owner.NEUTRAL, robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD } };
}

describe('rotationToDirection / directionToRotation round-trip', () => {
    it('rotation=0 → East',     () => expect(rotationToDirection(0)).toBe(Direction.E));
    it('rotation=π/2 → North',  () => expect(rotationToDirection(Math.PI / 2)).toBe(Direction.N));
    it('rotation=π → West',     () => expect(rotationToDirection(Math.PI)).toBe(Direction.W));
    it('rotation=-π/2 → South', () => expect(rotationToDirection(-Math.PI / 2)).toBe(Direction.S));

    it('directionToRotation is inverse of rotationToDirection', () => {
        for (const dir of [Direction.N, Direction.E, Direction.S, Direction.W] as const) {
            expect(rotationToDirection(directionToRotation(dir))).toBe(dir);
        }
    });
});

describe('applyAction — rotate', () => {
    it('rotates right: E → S (clockwise)', () => {
        const robot = makeRobot('r', 5, 5, Direction.E);
        applyAction(robot, { type: ActionType.ROTATE, direction: RotateDir.RIGHT }, makeMap(), buildOccupancy(makeMap()));
        expect(robot.facing).toBe(Direction.S);
    });

    it('rotates left: E → N (counter-clockwise)', () => {
        const robot = makeRobot('r', 5, 5, Direction.E);
        applyAction(robot, { type: ActionType.ROTATE, direction: RotateDir.LEFT }, makeMap(), buildOccupancy(makeMap()));
        expect(robot.facing).toBe(Direction.N);
    });
});

describe('applyAction — move', () => {
    it('moves robot by MOVE_STEP in facing direction', () => {
        const robot = makeRobot('r', 5, 5, Direction.E);
        const map = makeMap([robot]);
        applyAction(robot, { type: ActionType.MOVE, direction: Direction.E }, map, buildOccupancy(map));
        expect(robot.x).toBeCloseTo(5 + MOVE_STEP, 5);
        expect(robot.y).toBeCloseTo(5, 5);
    });

    it('blocks move if robot is not facing that direction', () => {
        const robot = makeRobot('r', 5, 5, Direction.E); // facing East, tries to move North
        const map = makeMap([robot]);
        expect(applyAction(robot, { type: ActionType.MOVE, direction: Direction.N }, map, buildOccupancy(map))).toBe(false);
        expect(robot.x).toBe(5);
    });

    it('blocks move outside map west boundary', () => {
        const robot = makeRobot('r', 0, 5, Direction.W); // facing West at x=0
        const map = makeMap([robot], 10, 10);
        expect(applyAction(robot, { type: ActionType.MOVE, direction: Direction.W }, map, buildOccupancy(map))).toBe(false);
    });

    it('blocks move outside map east boundary', () => {
        const robot = makeRobot('r', 9.75, 5, Direction.E); // facing East near right edge
        const map = makeMap([robot], 10, 10);
        expect(applyAction(robot, { type: ActionType.MOVE, direction: Direction.E }, map, buildOccupancy(map))).toBe(false);
    });

    it('blocks move within 1.0 unit of another robot', () => {
        const mover:   RobotObject = makeRobot('a', 1.0, 5, Direction.E);
        const blocker: RobotObject = makeRobot('b', 2.0, 5, Direction.E); // 1.0 away East
        const map = makeMap([mover, blocker]);
        // moving to 1.25 would be 0.75 from blocker → blocked
        expect(applyAction(mover, { type: ActionType.MOVE, direction: Direction.E }, map, buildOccupancy(map))).toBe(false);
        expect(mover.x).toBe(1.0);
    });

    it('allows move when other robot is exactly 1.0 away', () => {
        const mover:   RobotObject = makeRobot('a', 0.75, 5, Direction.E);
        const blocker: RobotObject = makeRobot('b', 2.0,  5, Direction.E); // 1.25 away
        const map = makeMap([mover, blocker]);
        // moving to 1.0 is 1.0 from blocker → allowed (strict < 1.0 check)
        expect(applyAction(mover, { type: ActionType.MOVE, direction: Direction.E }, map, buildOccupancy(map))).toBe(true);
        expect(mover.x).toBeCloseTo(1.0, 5);
    });

    it('blocks move when target cell has a structure', () => {
        const robot:   RobotObject = makeRobot('r', 1.75, 5, Direction.E);
        const factory: WarObject = { id: 'f1', type: ObjectType.FACTORY, x: 2, y: 5, subtype: 'cannons' };
        const map = makeMap([robot, factory]);
        expect(applyAction(robot, { type: ActionType.MOVE, direction: Direction.E }, map, buildOccupancy(map))).toBe(false);
    });

    it('two robots moving toward each other maintain 1.0 separation', () => {
        const a: RobotObject = makeRobot('a', 0.75, 5, Direction.E);
        const b: RobotObject = makeRobot('b', 2.0,  5, Direction.W);
        const map = makeMap([a, b]);
        const occ = buildOccupancy(map);
        // a moves to 1.0 (distance to b = 1.0 → ok)
        expect(applyAction(a, { type: ActionType.MOVE, direction: Direction.E }, map, occ)).toBe(true);
        expect(a.x).toBeCloseTo(1.0, 5);
        // now a=1.0, b=2.0 — distance=1.0; b tries to move W to 1.75, distance=0.75 → blocked
        expect(applyAction(b, { type: ActionType.MOVE, direction: Direction.W }, map, occ)).toBe(false);
    });

    it('updates occupancy after move so subsequent robots see new position', () => {
        const mover:   RobotObject = makeRobot('a', 0.75, 5, Direction.E);
        const watcher: RobotObject = makeRobot('b', 3.0,  5, Direction.E);
        const map = makeMap([mover, watcher]);
        const occ = buildOccupancy(map);
        applyAction(mover, { type: ActionType.MOVE, direction: Direction.E }, map, occ);
        expect(mover.x).toBeCloseTo(1.0, 5);
        // position updated: check spot that is ≥1.0 away from new pos (1.0,5) → clear
        expect(isOccupied(occ, 0.0, 5, 'b')).toBe(false); // 0.0 is exactly 1.0 away → not blocked
    });

    it('idle action does nothing', () => {
        const robot = makeRobot('r', 5, 5);
        const map = makeMap([robot]);
        expect(applyAction(robot, { type: ActionType.IDLE }, map, buildOccupancy(map))).toBe(false);
        expect(robot.x).toBe(5);
    });
});
