/**
 * Verifies that nuclear detonation is a last resort:
 * a robot with conventional weapons in range must fire them
 * before ever considering the A-bomb.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ObjectType, Owner, Direction, RobotGoal, RobotAI } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { stepSimpleAI } from '../../../game/ai/simple';
import { buildOccupancy } from '../../../game/core/occupancy';
import { Chassis, Weapon, Electronics, calcHealth } from '../../../data/robot';
import { ActionType } from '../../../game/actions';

afterEach(() => vi.restoreAllMocks());

function makeWarMap(robots: RobotObject[]): WarMap {
    return { width: 20, height: 20, tiles: [], robots, projectiles: [], killCounts: {}, tick: 0 };
}

function makeNukeRobotWithMissiles(id: string, x: number, y: number): RobotObject {
    const cfg = {
        chassis: Chassis.TRACKS,
        weapons: [Weapon.MISSILES],
        electronics: Electronics.STANDARD,
        nuclear: true,
    };
    return {
        id, type: ObjectType.ROBOT, x, y,
        owner: Owner.RED, facing: Direction.E,
        goal: RobotGoal.ATTACK_ROBOTS,
        ai: RobotAI.SIMPLE,
        robotConfig: cfg,
        health: calcHealth(cfg),
    };
}

function makeEnemy(id: string, x: number, y: number): RobotObject {
    const cfg = { chassis: Chassis.TRACKS };
    return {
        id, type: ObjectType.ROBOT, x, y,
        owner: Owner.BLUE, facing: Direction.W,
        goal: RobotGoal.ATTACK_ROBOTS,
        ai: RobotAI.SIMPLE,
        robotConfig: cfg,
        health: calcHealth(cfg),
    };
}

describe('nuclear weapon priority', () => {
    it('fires missiles instead of detonating when an enemy is within missile range', () => {
        // Force shouldDetonateNuclear's random check to always pass
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const robot = makeNukeRobotWithMissiles('r1', 5, 5);
        // Enemy is 4 tiles east — within MISSILES range (7) and NUKE_KILL_RADIUS (1)
        const enemy = makeEnemy('e1', 9, 5);
        const warMap = makeWarMap([robot, enemy]);
        const occupancy = buildOccupancy(warMap);

        const action = stepSimpleAI(robot, warMap, occupancy);

        expect(action.type).toBe(ActionType.FIRE);
        expect((action as any).weapon).toBe(Weapon.MISSILES);
    });

    it('detonates when no conventional weapon can reach the target but nuclear conditions are met', () => {
        // Force the random check to always pass
        vi.spyOn(Math, 'random').mockReturnValue(0);

        // Robot with nuclear but no weapons — can't fire conventionally
        const cfg = { chassis: Chassis.TRACKS, electronics: Electronics.STANDARD, nuclear: true };
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5,
            owner: Owner.RED, facing: Direction.E,
            goal: RobotGoal.ATTACK_ROBOTS,
            ai: RobotAI.SIMPLE,
            robotConfig: cfg,
            health: calcHealth(cfg),
        };
        // Enemy adjacent — inside kill radius (Chebyshev ≤ 1)
        const enemy = makeEnemy('e1', 6, 5);
        const warMap = makeWarMap([robot, enemy]);
        const occupancy = buildOccupancy(warMap);

        const action = stepSimpleAI(robot, warMap, occupancy);

        expect(action.type).toBe(ActionType.DETONATE);
    });
});
