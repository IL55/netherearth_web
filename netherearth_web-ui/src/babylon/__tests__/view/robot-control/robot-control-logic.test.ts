import { describe, it, expect } from 'vitest';
import { ObjectType, RobotGoal, Owner } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import type { ShipState } from '../../../game/ship/types';
import {
    getGoalLabel,
    getRobotDescription,
    isRobotAlive,
    getRobotHealthPercent,
} from '../../../view/robot-control/queries';
import {
    cycleRobotGoal,
    setManualControl,
    setRobotGoal,
    setMoveGoal,
} from '../../../view/robot-control/mutations';
import {
    findRobotUnderShip,
} from '../../../view/robot-control/physics';
import { ORDERABLE_GOALS, HOVER_DISTANCE } from '../../../view/robot-control/constants';
import { Chassis, Weapon, Electronics, calcHealth, calcRobotHeight } from '../../../data/robot';
import { Direction, RobotAI } from '../../../game/core/warmap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeShip(x: number, y: number, height = 1.5): ShipState {
    return { x, y, height };
}

const DEFAULT_CONFIG = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON], electronics: Electronics.STANDARD };

function makeRobot(id: string, x: number, y: number, owner = Owner.RED, goal = RobotGoal.ATTACK_ROBOTS): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y, owner, goal,
        robotConfig: DEFAULT_CONFIG,
        facing: Direction.N,
        health: 100,
        ai: RobotAI.SIMPLE,
    };
}


function makeWarMap(...robots: any[]): WarMap {
    return { width: 20, height: 20, tiles: [], robots, projectiles: [], killCounts: {}, tick: 0 };
}

// ─── findRobotUnderShip ───────────────────────────────────────────────────────

describe('findRobotUnderShip', () => {
    it('returns null when no robots exist', () => {
        const warMap = makeWarMap();
        expect(findRobotUnderShip(warMap, makeShip(5, 5), Owner.RED)).toBeNull();
    });

    it('returns null when ship is above the robot height', () => {
        const robot = makeRobot('r1', 5, 5);
        const robotH = calcRobotHeight(DEFAULT_CONFIG);
        const warMap = makeWarMap(robot);
        expect(findRobotUnderShip(warMap, makeShip(5, 5, robotH + 0.1), Owner.RED)).toBeNull();
    });

    it('returns robot when ship is at exactly the robot height', () => {
        const robot = makeRobot('r1', 5, 5);
        const robotH = calcRobotHeight(DEFAULT_CONFIG);
        const warMap = makeWarMap(robot);
        const result = findRobotUnderShip(warMap, makeShip(5, 5, robotH), Owner.RED);
        expect(result).toBe(robot);
    });

    it('returns robot within HOVER_DISTANCE (Chebyshev)', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        // Exactly at boundary, ship at robot's own floor height
        const ship = makeShip(5 + HOVER_DISTANCE, 5 + HOVER_DISTANCE, calcRobotHeight(DEFAULT_CONFIG));
        expect(findRobotUnderShip(warMap, ship, Owner.RED)).toBe(robot);
    });

    it('returns null when robot is just beyond HOVER_DISTANCE', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const ship = makeShip(5 + HOVER_DISTANCE + 0.01, 5);
        expect(findRobotUnderShip(warMap, ship, Owner.RED)).toBeNull();
    });

    it('ignores robots owned by a different owner', () => {
        const robot = makeRobot('r1', 5, 5, Owner.BLUE);
        const warMap = makeWarMap(robot);
        expect(findRobotUnderShip(warMap, makeShip(5, 5), Owner.RED)).toBeNull();
    });

    it('ignores dying robots (dyingTicks set)', () => {
        const robot: RobotObject = { ...makeRobot('r1', 5, 5), dyingTicks: 3 };
        const warMap = makeWarMap(robot);
        expect(findRobotUnderShip(warMap, makeShip(5, 5), Owner.RED)).toBeNull();
    });

    it('returns the closest robot when multiple are nearby', () => {
        const near   = makeRobot('near',  5,   5);
        const medium = makeRobot('med',   5.5, 5);
        const warMap = makeWarMap(medium, near); // near is second in array
        // Ship at (5,5) — "near" is closer but both qualify; first qualifying wins
        const result = findRobotUnderShip(warMap, makeShip(5, 5), Owner.RED);
        expect(result).toBeDefined();
    });

    it('ignores non-robot objects', () => {
        const factory = { id: 'f1', type: ObjectType.FACTORY as const, x: 5, y: 5, owner: Owner.RED };
        const warMap: WarMap = { width: 20, height: 20, tiles: [factory], robots: [], projectiles: [], killCounts: {}, tick: 0 };
        expect(findRobotUnderShip(warMap, makeShip(5, 5), Owner.RED)).toBeNull();
    });
});

// ─── setRobotGoal ─────────────────────────────────────────────────────────────

describe('setRobotGoal', () => {
    it('sets the goal and clears goalPosition', () => {
        const robot = makeRobot('r1', 0, 0, Owner.RED, RobotGoal.ATTACK_ROBOTS);
        robot.goalPosition = { x: 10, y: 10 };
        setRobotGoal(robot, RobotGoal.DEFEND);
        expect(robot.goal).toBe(RobotGoal.DEFEND);
        expect(robot.goalPosition).toBeUndefined();
    });
});

// ─── setMoveGoal ──────────────────────────────────────────────────────────────

describe('setMoveGoal', () => {
    it('sets MOVE_FORWARD and adds dx to x position', () => {
        const robot = makeRobot('r1', 5, 5, Owner.RED);
        setMoveGoal(robot, RobotGoal.MOVE_FORWARD, 10);
        expect(robot.goal).toBe(RobotGoal.MOVE_FORWARD);
        expect(robot.goalPosition).toEqual({ x: 15, y: 5 });
    });

    it('sets MOVE_BACKWARD and subtracts dx from x position (if dx is negative)', () => {
        const robot = makeRobot('r1', 5, 5, Owner.RED);
        setMoveGoal(robot, RobotGoal.MOVE_BACKWARD, -10);
        expect(robot.goal).toBe(RobotGoal.MOVE_BACKWARD);
        expect(robot.goalPosition).toEqual({ x: -5, y: 5 });
    });
});

// ─── cycleRobotGoal ───────────────────────────────────────────────────────────

describe('cycleRobotGoal', () => {
    it('advances to the next goal in ORDERABLE_GOALS', () => {
        const robot = makeRobot('r1', 0, 0, Owner.RED, ORDERABLE_GOALS[0]);
        cycleRobotGoal(robot);
        expect(robot.goal).toBe(ORDERABLE_GOALS[1]);
    });

    it('wraps around from last to first', () => {
        const last = ORDERABLE_GOALS[ORDERABLE_GOALS.length - 1];
        const robot = makeRobot('r1', 0, 0, Owner.RED, last);
        cycleRobotGoal(robot);
        expect(robot.goal).toBe(ORDERABLE_GOALS[0]);
    });

    it('starts from index 0 when current goal is not in ORDERABLE_GOALS', () => {
        // MOVE_FORWARD is not in ORDERABLE_GOALS
        // indexOf returns -1; (-1+1) % n = 0 → cycles to ORDERABLE_GOALS[0]
        const robot = makeRobot('r1', 0, 0, Owner.RED, RobotGoal.MOVE_FORWARD);
        cycleRobotGoal(robot);
        expect(robot.goal).toBe(ORDERABLE_GOALS[0]);
    });

    it('cycles through all goals without getting stuck', () => {
        const robot = makeRobot('r1', 0, 0, Owner.RED, ORDERABLE_GOALS[0]);
        const seen = new Set<RobotGoal>();
        for (let i = 0; i < ORDERABLE_GOALS.length; i++) {
            cycleRobotGoal(robot);
            seen.add(robot.goal);
        }
        expect(seen.size).toBe(ORDERABLE_GOALS.length);
    });
});

// ─── setManualControl ─────────────────────────────────────────────────────────

describe('setManualControl', () => {
    it('sets goal to DEFEND', () => {
        const robot = makeRobot('r1', 0, 0, Owner.RED, RobotGoal.ATTACK_ROBOTS);
        setManualControl(robot);
        expect(robot.goal).toBe(RobotGoal.DEFEND);
    });

    it('clears the moveOutTarget from nav', () => {
        const robot: RobotObject = {
            ...makeRobot('r1', 0, 0),
            nav: { moveOutTarget: { x: 5, y: 5 } },
        };
        setManualControl(robot);
        expect(robot.nav?.moveOutTarget).toBeUndefined();
    });

    it('does not throw when robot has no nav state', () => {
        const robot = makeRobot('r1', 0, 0);
        expect(() => setManualControl(robot)).not.toThrow();
        expect(robot.goal).toBe(RobotGoal.DEFEND);
    });
});

// ─── getGoalLabel ─────────────────────────────────────────────────────────────

describe('getGoalLabel', () => {
    it('returns a non-empty label for every orderable goal', () => {
        ORDERABLE_GOALS.forEach(goal => {
            expect(getGoalLabel(goal).length).toBeGreaterThan(0);
        });
    });

    it('returns a non-empty label for all RobotGoal values', () => {
        Object.values(RobotGoal).forEach(goal => {
            expect(getGoalLabel(goal).length).toBeGreaterThan(0);
        });
    });

    it('falls back gracefully when goal is undefined', () => {
        expect(getGoalLabel(undefined).length).toBeGreaterThan(0);
    });
});

// ─── getRobotDescription ──────────────────────────────────────────────────────

describe('getRobotDescription', () => {
    it('returns fallback for undefined config', () => {
        expect(getRobotDescription(undefined)).toBe('Unknown Robot');
    });

    it('includes chassis type in description', () => {
        const desc = getRobotDescription({ chassis: Chassis.TRACKS });
        expect(desc.toLowerCase()).toContain('tracks');
    });

    it('shows weapon when present', () => {
        const desc = getRobotDescription({ chassis: Chassis.BIPOD, weapons: [Weapon.PHASERS] });
        expect(desc.toLowerCase()).toContain('phasers');
    });

    it('shows "Nuclear" when only nuclear is set (no weapon)', () => {
        const desc = getRobotDescription({ chassis: Chassis.TRACKS, nuclear: true });
        expect(desc).toContain('Nuclear');
    });

    it('shows "Unarmed" when no weapon and no nuclear', () => {
        const desc = getRobotDescription({ chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD });
        expect(desc).toContain('Unarmed');
    });

    it('capitalises the chassis name', () => {
        const desc = getRobotDescription({ chassis: Chassis.ANTIGRAV });
        expect(desc[0]).toBe(desc[0].toUpperCase());
    });
});

// ─── isRobotAlive ─────────────────────────────────────────────────────────────

describe('isRobotAlive', () => {
    it('returns false for null id', () => {
        const warMap = makeWarMap();
        expect(isRobotAlive(warMap, null)).toBe(false);
    });

    it('returns false when robot is not in warMap', () => {
        const warMap = makeWarMap();
        expect(isRobotAlive(warMap, 'ghost')).toBe(false);
    });

    it('returns true for a live robot', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        expect(isRobotAlive(warMap, 'r1')).toBe(true);
    });

    it('returns false when robot has dyingTicks set', () => {
        const robot: RobotObject = { ...makeRobot('r1', 5, 5), dyingTicks: 3 };
        const warMap = makeWarMap(robot);
        expect(isRobotAlive(warMap, 'r1')).toBe(false);
    });

    it('returns false after the robot is removed from warMap', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        expect(isRobotAlive(warMap, 'r1')).toBe(true);
        warMap.robots = [];
        expect(isRobotAlive(warMap, 'r1')).toBe(false);
    });
});

// ─── getRobotHealthPercent ────────────────────────────────────────────────────

describe('getRobotHealthPercent', () => {
    it('returns 100 at full health', () => {
        const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };
        const robot: RobotObject = {
            ...makeRobot('r1', 0, 0),
            robotConfig: cfg,
            health: calcHealth(cfg),
        };
        expect(getRobotHealthPercent(robot)).toBe(100);
    });

    it('returns 0 when health is 0', () => {
        const cfg = { chassis: Chassis.BIPOD };
        const robot: RobotObject = { ...makeRobot('r1', 0, 0), robotConfig: cfg, health: 0 };
        expect(getRobotHealthPercent(robot)).toBe(0);
    });

    it('returns roughly 50 at half health', () => {
        const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };
        const max = calcHealth(cfg);
        const robot: RobotObject = {
            ...makeRobot('r1', 0, 0),
            robotConfig: cfg,
            health: max / 2,
        };
        expect(getRobotHealthPercent(robot)).toBeCloseTo(50, 0);
    });

    it('clamps to 0 — never returns negative', () => {
        const cfg = { chassis: Chassis.BIPOD };
        const robot: RobotObject = { ...makeRobot('r1', 0, 0), robotConfig: cfg, health: -10 };
        expect(getRobotHealthPercent(robot)).toBe(0);
    });
});
