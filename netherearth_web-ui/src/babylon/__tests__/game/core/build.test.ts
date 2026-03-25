import { describe, it, expect, beforeEach } from 'vitest';
import {
    tickBuild, canAfford, BUILD_OPTIONS,
    CHASSIS_BUILD_COST, WEAPON_BUILD_COST, ELECTRONICS_BUILD_COST, NUCLEAR_BUILD_COST,
    _resetBuildState,
} from '../../../game/build';
import { createOwnerResources, createResources } from '../../../game/resources';
import { Owner } from '../../../game/owner';
import { Chassis, Weapon, Electronics } from '../../../data/robot';
import { RobotGoal } from '../../../game/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../game/warmap';

function makeMap(objects: WarMap['objects']): WarMap {
    return { width: 20, height: 20, objects, tick: 0 };
}

function warbase(owner: Owner, x = 0, y = 0): WarObject {
    return { id: `wb_${x}_${y}`, type: 'warbase', x, y, owner };
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
    it('full-kit option costs bipod + phasers + nuclear + electronics', () => {
        const full = BUILD_OPTIONS[0];
        expect(full.config.chassis).toBe(Chassis.BIPOD);
        expect(full.config.weapon).toBe(Weapon.PHASERS);
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
        expect(cheapest.config.weapon).toBeUndefined();
        expect(cheapest.cost).toEqual({ chassis: 1 });
    });
});

// ─── tickBuild — no resources ─────────────────────────────────────────────────

describe('tickBuild — no resources', () => {
    it('does not build when owner has no resources', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        tickBuild(map, res);
        expect(map.objects.filter(o => o.type === 'robot')).toHaveLength(0);
    });

    it('does not build for NEUTRAL warbase', () => {
        const map = makeMap([warbase(Owner.NEUTRAL)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 10;
        tickBuild(map, res);
        expect(map.objects.filter(o => o.type === 'robot')).toHaveLength(0);
    });
});

// ─── tickBuild — basic build ──────────────────────────────────────────────────

describe('tickBuild — builds cheapest affordable robot', () => {
    it('builds a tracks robot when only chassis resource is available', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robots = map.objects.filter(o => o.type === 'robot') as RobotObject[];
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
        const robots = map.objects.filter(o => o.type === 'robot') as RobotObject[];
        expect(robots[0].robotConfig?.weapon).toBe(Weapon.CANNON);
        expect(robots[0].robotConfig?.electronics).toBe(Electronics.STANDARD);
    });

    it('spawns robot at warbase capture zone point', () => {
        const map = makeMap([warbase(Owner.RED, 2, 3)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.objects.find(o => o.type === 'robot') as RobotObject;
        expect(robot.x).toBe(2 + 3.5); // warbase.x + zone.dx
        expect(robot.y).toBe(3 + 2.0); // warbase.y + zone.dy
    });

    it('assigns a valid goal', () => {
        const validGoals = Object.values(RobotGoal);
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.objects.find(o => o.type === 'robot') as RobotObject;
        expect(validGoals).toContain(robot.goal);
    });

    it('new robot has correct owner and ai', () => {
        const map = makeMap([warbase(Owner.BLUE)]);
        const res = createOwnerResources();
        res[Owner.BLUE].chassis = 1;
        tickBuild(map, res);
        const robot = map.objects.find(o => o.type === 'robot') as RobotObject;
        expect(robot.owner).toBe(Owner.BLUE);
        expect(robot.ai).toBe('dummy');
    });

    it('new robot has positive health', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 1;
        tickBuild(map, res);
        const robot = map.objects.find(o => o.type === 'robot') as RobotObject;
        expect(robot.health).toBeGreaterThan(0);
    });
});

// ─── tickBuild — spawn blocked ────────────────────────────────────────────────

describe('tickBuild — spawn blocked', () => {
    it('does not build when an own robot occupies the spawn point', () => {
        const wb = warbase(Owner.RED, 0, 0);
        const blocker: RobotObject = { id: 'r1', type: 'robot', x: 3.5, y: 2.0, owner: Owner.RED };
        const map = makeMap([wb, blocker]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 5;
        tickBuild(map, res);
        expect(map.objects.filter(o => o.type === 'robot')).toHaveLength(1); // only the original
    });

    it('does not build when an enemy robot occupies the spawn point (capturing)', () => {
        const wb = warbase(Owner.RED, 0, 0);
        const enemy: RobotObject = { id: 'r1', type: 'robot', x: 3.5, y: 2.0, owner: Owner.BLUE };
        const map = makeMap([wb, enemy]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 5;
        tickBuild(map, res);
        expect(map.objects.filter(o => o.type === 'robot')).toHaveLength(1);
    });
});

// ─── tickBuild — multiple warbases ───────────────────────────────────────────

describe('tickBuild — multiple warbases', () => {
    it('builds one robot per warbase in the same tick', () => {
        // cannon (tracks+cannon) costs chassis:1 + cannons:1; give exactly 1 of each per warbase
        const map = makeMap([warbase(Owner.RED, 0, 0), warbase(Owner.RED, 0, 10)]);
        const res = createOwnerResources();
        res[Owner.RED].chassis = 2;
        res[Owner.RED].cannons = 2;
        tickBuild(map, res);
        expect(map.objects.filter(o => o.type === 'robot')).toHaveLength(2);
        expect(res[Owner.RED].chassis).toBe(0);
        expect(res[Owner.RED].cannons).toBe(0);
    });

    it('cycles goals across robots built in the same tick', () => {
        const map = makeMap([
            warbase(Owner.RED, 0, 0),
            warbase(Owner.RED, 0, 10),
            warbase(Owner.RED, 0, 20),
        ]);
        const res = createOwnerResources();
        // tracks (cheapest) costs chassis:1 each
        res[Owner.RED].chassis = 3;
        tickBuild(map, res);
        const robots = map.objects.filter(o => o.type === 'robot') as RobotObject[];
        // With chassis:3 total, first warbase builds antigrav (cost 2), second builds tracks (cost 1).
        // Third warbase cannot afford → 2 robots, 2 different goals.
        expect(robots.length).toBeGreaterThanOrEqual(2);
        const goals = robots.map(r => r.goal);
        expect(new Set(goals).size).toBe(goals.length); // all different
    });
});
