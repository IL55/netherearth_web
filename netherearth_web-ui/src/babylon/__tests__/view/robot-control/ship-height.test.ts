/**
 * Ship height management — robot control open/exit behaviour
 *
 * Tests for setHoverHeight and applyExitBump, which together control how the
 * ship positions itself relative to a robot's visual top:
 *   - On open:  ship rises to calcRobotHeight(robot) + HOVER_GAP
 *   - Each tick: ship follows the robot (same formula)
 *   - On exit:  ship jumps HOVER_GAP upward so it clears the robot before
 *               tickShip resumes automatic descent
 */
import { describe, it, expect } from 'vitest';
import { ObjectType, Owner, Direction } from '../../../game/core/warmap';
import type { RobotObject } from '../../../game/core/warmap';
import { Chassis, Weapon, Electronics, calcRobotHeight } from '../../../data/robot';
import { setHoverHeight, applyExitBump, HOVER_GAP } from '../../../view/robot-control/robot-control-logic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeShip(height = 0): { height: number } {
    return { height };
}

function makeRobot(config: RobotObject['robotConfig']): RobotObject {
    return {
        id: 'r1', type: ObjectType.ROBOT, x: 0, y: 0,
        owner: Owner.RED, facing: Direction.E,
        robotConfig: config,
    };
}

// ─── setHoverHeight ───────────────────────────────────────────────────────────

describe('setHoverHeight', () => {
    it('sets ship height to calcRobotHeight + HOVER_GAP for a simple robot', () => {
        const config = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON], electronics: Electronics.STANDARD };
        const robot = makeRobot(config);
        const ship = makeShip(0);

        setHoverHeight(ship, robot);

        expect(ship.height).toBe(calcRobotHeight(config) + HOVER_GAP);
    });

    it('sets ship height correctly for a fully equipped robot', () => {
        const config = {
            chassis: Chassis.TRACKS,
            weapons: [Weapon.CANNON, Weapon.MISSILES, Weapon.PHASERS],
            nuclear: true,
            electronics: Electronics.STANDARD,
        };
        const robot = makeRobot(config);
        const ship = makeShip(0);

        setHoverHeight(ship, robot);

        expect(ship.height).toBe(calcRobotHeight(config) + HOVER_GAP);
    });

    it('falls back to 1.0 + HOVER_GAP when robot has no config', () => {
        const robot = makeRobot(undefined);
        const ship = makeShip(0);

        setHoverHeight(ship, robot);

        expect(ship.height).toBe(1.0 + HOVER_GAP);
    });

    it('overwrites any previous ship height', () => {
        const config = { chassis: Chassis.TRACKS };
        const robot = makeRobot(config);
        const ship = makeShip(99);

        setHoverHeight(ship, robot);

        expect(ship.height).toBe(calcRobotHeight(config) + HOVER_GAP);
    });
});

// ─── applyExitBump ────────────────────────────────────────────────────────────

describe('applyExitBump', () => {
    it('raises ship height by exactly HOVER_GAP', () => {
        const ship = makeShip(2.0);
        applyExitBump(ship);
        expect(ship.height).toBeCloseTo(2.0 + HOVER_GAP);
    });

    it('applied after setHoverHeight puts ship HOVER_GAP above hover position', () => {
        const config = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };
        const robot = makeRobot(config);
        const ship = makeShip(0);

        setHoverHeight(ship, robot);
        const hoverHeight = ship.height;

        applyExitBump(ship);

        expect(ship.height).toBeCloseTo(hoverHeight + HOVER_GAP);
    });

    it('is idempotent in effect — each call adds another HOVER_GAP', () => {
        const ship = makeShip(1.0);
        applyExitBump(ship);
        applyExitBump(ship);
        expect(ship.height).toBeCloseTo(1.0 + 2 * HOVER_GAP);
    });
});

// ─── HOVER_GAP sanity ─────────────────────────────────────────────────────────

describe('HOVER_GAP', () => {
    it('is positive so the ship is always above the robot', () => {
        expect(HOVER_GAP).toBeGreaterThan(0);
    });
});
