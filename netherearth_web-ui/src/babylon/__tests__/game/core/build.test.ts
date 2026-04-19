import { RobotAI, Direction } from "../../../game/core/warmap";

import { ObjectType } from '../../../game/core/warmap';
import { describe, it, expect, beforeEach } from 'vitest';
import {
    tickBuild, canAfford, chooseBuildOption, chooseBuildGoal, BUILD_OPTIONS,
    CHASSIS_BUILD_COST, WEAPON_BUILD_COST, ELECTRONICS_BUILD_COST, NUCLEAR_BUILD_COST,
    _resetBuildState,
} from '../../../game/mechanics/build';
import { createOwnerResources, createResources } from '../../../game/resources';
import { Owner } from '../../../game/types/owner';
import { Chassis, Weapon, Electronics } from '../../../data/robot';
import { RobotGoal } from '../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../game/core/warmap';
import { stepSimpleAI } from '../../../game/ai/simple';
import { buildOccupancy } from '../../../game/core/occupancy';

import { createWarMap } from '../../../game/core/utils';
function makeMap(objects: any[]): WarMap {
    const tiles = objects.filter(o => o.type !== ObjectType.ROBOT);
    const robots = objects.filter(o => o.type === ObjectType.ROBOT);
    return { width: 20, height: 20, tiles, robots, projectiles: [], killCounts: {}, tick: 0 };
}

function warbase(owner: Owner, x = 0, y = 0): WarObject {
    return { id: `wb_${x}_${y}`, type: ObjectType.WARBASE, x, y, owner };
}

beforeEach(() => _resetBuildState());

// ─── canAfford ────────────────────────────────────────────────────────────────

describe('canAfford', () => {
    it('returns true when all resources are met', () => {
        const res = { ...createResources(), chassis: 2 };
        expect(canAfford(res, { chassis: 2 })).toBe(true);
    });

    it('returns false when a resource is short', () => {
        const res = { ...createResources(), chassis: 1 };
        expect(canAfford(res, { chassis: 2 })).toBe(false);
    });

    it('returns true for an empty cost', () => {
        expect(canAfford(createResources(), {})).toBe(true);
    });
});

// ─── BUILD_OPTIONS costs ──────────────────────────────────────────────────────

describe('BUILD_OPTIONS costs', () => {
    it('full-kit option costs bipod + phasers + missiles + nuclear + electronics', () => {
        const full = BUILD_OPTIONS[0];
        expect(full.config.chassis).toBe(Chassis.BIPOD);
        expect(full.config.weapons).toContain(Weapon.PHASERS);
        expect(full.config.nuclear).toBe(true);
        expect(full.config.electronics).toBe(Electronics.STANDARD);
        expect(full.cost).toMatchObject({
            chassis:     CHASSIS_BUILD_COST[Chassis.BIPOD].chassis,
            phasers:     WEAPON_BUILD_COST[Weapon.PHASERS].phasers,
            nuclear:     NUCLEAR_BUILD_COST.nuclear,
            electronics: ELECTRONICS_BUILD_COST.electronics,
        });
    });

    it('cheapest option is tracks-only chassis', () => {
        const cheapest = BUILD_OPTIONS[BUILD_OPTIONS.length - 1];
        expect(cheapest.config.chassis).toBe(Chassis.TRACKS);
        expect(cheapest.config.weapons ?? []).toHaveLength(0);
        expect(cheapest.cost).toEqual({ chassis: 1 });
    });
});

// ─── tickBuild — no resources ─────────────────────────────────────────────────

describe('tickBuild — no resources', () => {
    it('does not build when owner has no resources', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        tickBuild(map, res);
        expect(map.robots).toHaveLength(0);
    });

    it('does not build for NEUTRAL warbase', () => {
        const map = makeMap([warbase(Owner.NEUTRAL)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 10;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(0);
    });
});

// ─── tickBuild — basic build ──────────────────────────────────────────────────

describe('tickBuild — builds best resource-fit robot', () => {
    it('builds a tracks robot when only chassis resource is available', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robots = map.robots;
        expect(robots).toHaveLength(1);
        expect(robots[0].robotConfig?.chassis).toBe(Chassis.TRACKS);
        expect(robots[0].owner).toBe(Owner.RED);
    });

    it('deducts the cost from resources', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        expect(res[Owner.RED].chassis).toBe(0); // 1 − 1 (tracks)
    });

    it('builds the best affordable robot (cannon over tracks when cannons resource available)', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        res[Owner.RED].cannons = 1;
        res[Owner.RED].electronics = 1;
        tickBuild(map, res);
        const robots = map.robots;
        expect(robots[0].robotConfig?.weapons).toContain(Weapon.CANNON);
        expect(robots[0].robotConfig?.electronics).toBe(Electronics.STANDARD);
    });

    it('spawns robot at warbase capture zone point', () => {
        const map = makeMap([warbase(Owner.RED, 2, 3)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.robots[0];
        expect(robot.x).toBe(2 + 3.5); // warbase.x + zone.dx
        expect(robot.y).toBe(3 + 2.0); // warbase.y + zone.dy
    });

    it('assigns a valid goal', () => {
        const validGoals = Object.values(RobotGoal);
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.robots[0];
        expect(validGoals).toContain(robot.goal);
    });

    it('new robot has correct owner and ai', () => {
        const map = makeMap([warbase(Owner.BLUE)]);
        const res = createOwnerResources();
        res[Owner.BLUE].chassis = 1;
        tickBuild(map, res);
        const robot = map.robots[0];
        expect(robot.owner).toBe(Owner.BLUE);
        expect(robot.ai).toBe(RobotAI.SIMPLE);
    });

    it('new robot is assigned a moveOutTarget 4 cells towards the enemy warbase to unblock the base', () => {
        const wb1 = warbase(Owner.RED, 2, 3); // capture point is 2+3.5=5.5, 3+2.0=5.0
        // Enemy warbase is far South
        const wb2 = warbase(Owner.BLUE, 2, 20);
        const map = makeMap([wb1, wb2]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);

        const robot = map.robots[0];
        expect(robot.facing).toBe(Direction.S); // Towards +y (South)

        // moveOutTarget is set by the AI on the robot's first tick (not by tickBuild)
        stepSimpleAI(robot, map, buildOccupancy(map));
        expect(robot.nav?.moveOutTarget).toEqual({ x: 5.5, y: 5.0 + 4 });
    });

    it('new robot has positive health', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.robots[0];
        expect(robot.health).toBeGreaterThan(0);
    });
});

// ─── tickBuild — spawn blocked ────────────────────────────────────────────────

describe('tickBuild — spawn blocked', () => {
    it('does not build when an own robot occupies the spawn point', () => {
        const wb = warbase(Owner.RED, 0, 0);
        const blocker: RobotObject = { id: 'r1', type: ObjectType.ROBOT, x: 3.5, y: 2.0, owner: Owner.RED, facing: Direction.N, health: 100, robotConfig: { chassis: Chassis.TRACKS }, goal: RobotGoal.ATTACK_ROBOTS, ai: RobotAI.SIMPLE };
        const map = makeMap([wb, blocker]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 5;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(1); // only the original
    });

    it('does not build when an enemy robot occupies the spawn point (capturing)', () => {
        const wb = warbase(Owner.RED, 0, 0);
        const enemy: RobotObject = { id: 'r1', type: ObjectType.ROBOT, x: 3.5, y: 2.0, owner: Owner.BLUE, facing: Direction.N, health: 100, robotConfig: { chassis: Chassis.TRACKS }, goal: RobotGoal.ATTACK_ROBOTS, ai: RobotAI.SIMPLE };
        const map = makeMap([wb, enemy]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 5;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(1);
    });
});

// ─── tickBuild — multiple warbases ───────────────────────────────────────────

describe('tickBuild — multiple warbases', () => {
    it('does not build another robot until BUILD_COOLDOWN ticks have passed', () => {
        const map = makeMap([warbase(Owner.RED, 0, 0)]);
        const warbaseObj = map.tiles.find(o => o.type === ObjectType.WARBASE)!;
        const res = createOwnerResources();
        // Give enough resources for multiple builds
        res[Owner.RED].chassis = 10;

        // Build first robot at tick 5
        map.tick = 5;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(1);
        
        // Move the built robot out of the way so the spawn point is clear
        const robot = map.robots[0];
        robot.x = 0; robot.y = 0;

        // Try to build another robot immediately (tick 6) - should fail because of cooldown
        map.tick = 6;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(1);

        // Try to build one tick before cooldown finishes (tick 5 + 9 = 14)
        map.tick = 14;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(1);

        // Build again exactly when cooldown is over (tick 5 + 10 = 15)
        map.tick = 15;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(2);
    });

    it('builds one robot per warbase in the same tick', () => {
        // cannon (tracks+cannon) costs chassis:1 + cannons:1; give exactly 1 of each per warbase
        const map = makeMap([warbase(Owner.RED, 0, 0), warbase(Owner.RED, 0, 10)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 2;
        res[Owner.RED].cannons = 2;
        tickBuild(map, res);
        expect(map.robots).toHaveLength(2);
        expect(res[Owner.RED].chassis).toBe(0);
        expect(res[Owner.RED].cannons).toBe(0);
    });

    it('sends robots to capture neutral factories when they exist', () => {
        const factory = { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5 }; // neutral
        const map = makeMap([
            warbase(Owner.RED, 0, 0),
            warbase(Owner.RED, 0, 10),
            factory as any,
        ]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 3; // antigrav (2) + tracks (1)
        tickBuild(map, res);
        const robots = map.robots;
        // First robot: no fighters yet → ATTACK_ROBOTS (rule 1 baseline)
        // Second robot: 1 fighter / 1 total = 100 % ≥ 33 % → go capture neutral factory
        expect(robots.length).toBeGreaterThanOrEqual(2);
        const goals = robots.map(r => r.goal);
        expect(goals).toContain(RobotGoal.ATTACK_ROBOTS);
        expect(goals).toContain(RobotGoal.CAPTURE_NEUTRAL_FACTORY);
    });
});

// ─── chooseBuildOption — resource-aware selection ─────────────────────────────

describe('chooseBuildOption — resource-aware selection', () => {
    it('returns undefined when no option is affordable', () => {
        expect(chooseBuildOption(createResources())).toBeUndefined();
    });

    it('picks tracks when chassis is the only resource', () => {
        const res = { ...createResources(), chassis: 1 };
        const option = chooseBuildOption(res);
        expect(option?.config.chassis).toBe(Chassis.TRACKS);
        expect(option?.config.weapons ?? []).toHaveLength(0);
    });

    it('prefers bipod+phaser over tracks when phasers are plentiful', () => {
        // phasers=10 makes any option spending phasers score much higher
        const res = { ...createResources(), chassis: 3, phasers: 10, electronics: 1 };
        const option = chooseBuildOption(res);
        expect(option?.config.chassis).toBe(Chassis.BIPOD);
        expect(option?.config.weapons).toContain(Weapon.PHASERS);
    });

    it('prefers nuclear bipod when nuclear stockpile is large', () => {
        const res = { ...createResources(), chassis: 3, phasers: 3, nuclear: 10, electronics: 1 };
        const option = chooseBuildOption(res);
        expect(option?.config.nuclear).toBe(true);
        expect(option?.config.chassis).toBe(Chassis.BIPOD);
    });

    it('prefers antigrav+missiles when missiles stockpile is large', () => {
        const res = { ...createResources(), chassis: 2, missiles: 10, electronics: 1 };
        const option = chooseBuildOption(res);
        expect(option?.config.chassis).toBe(Chassis.ANTIGRAV);
        expect(option?.config.weapons).toContain(Weapon.MISSILES);
    });

    it('prefers tracks+cannon over bare tracks when cannons are plentiful', () => {
        const res = { ...createResources(), chassis: 1, cannons: 10 };
        const option = chooseBuildOption(res);
        expect(option?.config.weapons).toContain(Weapon.CANNON);
    });

    it('prefers option with electronics when electronics stockpile is large', () => {
        // tracks+cannon+electronics vs tracks+cannon: electronics:10 tips the score
        const res = { ...createResources(), chassis: 1, cannons: 1, electronics: 10 };
        const option = chooseBuildOption(res);
        expect(option?.config.electronics).toBe(Electronics.STANDARD);
    });
});

// ─── chooseBuildGoal — context-aware goal strategy ────────────────────────────

function makeWarMapForGoal(objects: any[]): WarMap {
    const tiles = objects.filter(o => o.type !== ObjectType.ROBOT);
    const robots = objects.filter(o => o.type === ObjectType.ROBOT);
    return { width: 20, height: 20, tiles, robots, projectiles: [], killCounts: {}, tick: 0 };
}

function makeRobotWithGoal(id: string, goal: RobotGoal, owner = Owner.RED): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x: 0, y: 0, owner, goal,
        facing: Direction.N,
        health: 100,
        robotConfig: { chassis: Chassis.TRACKS },
        ai: RobotAI.SIMPLE,
    };
}

describe('chooseBuildGoal — rule 1: maintain fighter baseline', () => {
    it('returns ATTACK_ROBOTS when team has no robots yet', () => {
        const map = makeWarMapForGoal([]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.ATTACK_ROBOTS);
    });

    it('returns ATTACK_ROBOTS when fighters are below 1-per-3 threshold', () => {
        // 3 robots, 0 fighters → need at least ceil(3/3)=1
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.CAPTURE_FACTORY),
            makeRobotWithGoal('r2', RobotGoal.CAPTURE_WARBASE),
            makeRobotWithGoal('r3', RobotGoal.CAPTURE_FACTORY),
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.ATTACK_ROBOTS);
    });

    it('passes the fighter check when ratio is exactly 1-in-3', () => {
        // 2 robots: 1 fighter, 1 captor → ceil(2/3)=1 fighter needed, we have 1 → satisfied
        // No neutral/enemy structures → falls through to ATTACK_ROBOTS via rule 3
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r2', RobotGoal.CAPTURE_FACTORY),
        ]);
        // No neutral / enemy targets → rule 3 fires
        const goal = chooseBuildGoal(map, Owner.RED);
        expect(goal).not.toBe(RobotGoal.CAPTURE_NEUTRAL_FACTORY);
        expect(goal).not.toBe(RobotGoal.CAPTURE_NEUTRAL_WARBASE);
    });
});

describe('chooseBuildGoal — rule 2: early game, neutral structures', () => {
    it('returns CAPTURE_NEUTRAL_FACTORY when neutral factory exists and fighters are sufficient', () => {
        const neutralFactory: WarObject = { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5, owner: Owner.NEUTRAL };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS), // 1 fighter / 1 robot → rule 1 satisfied
            neutralFactory,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.CAPTURE_NEUTRAL_FACTORY);
    });

    it('returns CAPTURE_NEUTRAL_WARBASE when neutral warbase exists and no neutral factory', () => {
        const neutralWarbase: WarObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.NEUTRAL };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            neutralWarbase,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.CAPTURE_NEUTRAL_WARBASE);
    });

    it('prefers neutral factory over neutral warbase when both exist', () => {
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            { id: 'f1', type: ObjectType.FACTORY, x: 3, y: 3, owner: Owner.NEUTRAL } as WarObject,
            { id: 'wb1', type: ObjectType.WARBASE, x: 8, y: 8, owner: Owner.NEUTRAL } as WarObject,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.CAPTURE_NEUTRAL_FACTORY);
    });

    it('does not target a neutral structure owned by own team', () => {
        // RED-owned factory should not be treated as neutral
        const ownFactory: WarObject = { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5, owner: Owner.RED };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            ownFactory,
        ]);
        // No neutral targets → falls to rule 3 (attack / enemy capture)
        expect(chooseBuildGoal(map, Owner.RED)).not.toBe(RobotGoal.CAPTURE_NEUTRAL_FACTORY);
    });
});

describe('chooseBuildGoal — rule 3: late game, no neutrals left', () => {
    it('returns ATTACK_ROBOTS until fighters reach 50 % of army', () => {
        // 2 captors, 0 fighters → fighter ratio = 0 % < 50 %
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.CAPTURE_FACTORY),
            makeRobotWithGoal('r2', RobotGoal.CAPTURE_WARBASE),
            { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5, owner: Owner.BLUE } as WarObject,
        ]);
        // Rule 1 fires first (0 fighters, need ceil(2/3)=1) → ATTACK_ROBOTS
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.ATTACK_ROBOTS);
    });

    it('returns CAPTURE_ENEMY_FACTORY once fighter ratio ≥ 50 %', () => {
        // 2 fighters, 2 captors → 50 % → rule 3 satisfied → capture enemy factory
        const enemyFactory: WarObject = { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5, owner: Owner.BLUE };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r2', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r3', RobotGoal.CAPTURE_FACTORY),
            makeRobotWithGoal('r4', RobotGoal.CAPTURE_FACTORY),
            enemyFactory,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.CAPTURE_ENEMY_FACTORY);
    });

    it('returns CAPTURE_ENEMY_WARBASE when no enemy factories remain', () => {
        const enemyWarbase: WarObject = { id: 'wb1', type: ObjectType.WARBASE, x: 5, y: 5, owner: Owner.BLUE };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r2', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r3', RobotGoal.CAPTURE_WARBASE),
            makeRobotWithGoal('r4', RobotGoal.CAPTURE_WARBASE),
            enemyWarbase,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.CAPTURE_ENEMY_WARBASE);
    });

    it('returns ATTACK_ROBOTS when no targets remain at all', () => {
        // All structures captured by RED — nothing to capture, nobody to attack
        const ownFactory: WarObject = { id: 'f1', type: ObjectType.FACTORY, x: 5, y: 5, owner: Owner.RED };
        const map = makeWarMapForGoal([
            makeRobotWithGoal('r1', RobotGoal.ATTACK_ROBOTS),
            makeRobotWithGoal('r2', RobotGoal.ATTACK_ROBOTS),
            ownFactory,
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.ATTACK_ROBOTS);
    });

    it('ignores dying robots when computing fighter ratio', () => {
        // 1 dying fighter + 1 live captor → dying one excluded → 0 live fighters → rule 1 fires
        const dyingFighter: RobotObject = { id: 'r1', type: ObjectType.ROBOT, x: 0, y: 0, owner: Owner.RED, goal: RobotGoal.ATTACK_ROBOTS, dyingTicks: 3, facing: Direction.N, health: 0, robotConfig: { chassis: Chassis.TRACKS }, ai: RobotAI.SIMPLE };
        const map = makeWarMapForGoal([
            dyingFighter,
            makeRobotWithGoal('r2', RobotGoal.CAPTURE_FACTORY),
        ]);
        expect(chooseBuildGoal(map, Owner.RED)).toBe(RobotGoal.ATTACK_ROBOTS);
    });
});

// ─── tickBuild — robot id format (regression: id collision with preset robots) ─

describe('tickBuild — robot id prefix', () => {
    it('assigns ids starting with "robot_" (not "init_robot_")', () => {
        const wb = warbase(Owner.RED, 0, 0);
        const map = makeMap([wb]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.robots[0];
        expect(robot).toBeDefined();
        expect(robot.id).toMatch(/^robot_\d+$/);
    });

    it('built id does not collide with preset "init_robot_" ids used in main.ts', () => {
        const wb = warbase(Owner.RED, 0, 0);
        // Simulate a preset robot placed before the clock starts
        const presetRobot: RobotObject = {
            id: 'init_robot_0', type: ObjectType.ROBOT,
            x: 0, y: 14, owner: Owner.RED, facing: Direction.E,
            robotConfig: { chassis: Chassis.TRACKS },
            health: 100,
            goal: RobotGoal.DEFEND,
            ai: RobotAI.SIMPLE,
        };
        const map = makeMap([wb, presetRobot]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const builtRobot = map.robots.find(
            o => o.id !== 'init_robot_0'
        ) as RobotObject;
        expect(builtRobot).toBeDefined();
        expect(builtRobot.id).not.toBe('init_robot_0');
        expect(builtRobot.id).toMatch(/^robot_/);
    });
});
