import { ObjectType } from '../core/warmap';
import { Direction, RobotAI } from "../core/warmap";

import { Chassis, Weapon, Electronics, calcHealth, calcRobotHeight } from '../../data/robot';
import type { RobotConfig } from '../../data/robot';
import { Owner } from '../types/owner';
import type { WarMap, RobotObject } from '../core/warmap';
import { RobotGoal } from '../core/warmap';
import type { OwnerResources, Resources } from '../resources';
import { buildOccupancy, isOccupied } from '../core/occupancy';
import { CAPTURE_ZONES } from './capture';

type Cost = Partial<Resources>;

// ─── Part costs ───────────────────────────────────────────────────────────────

export const CHASSIS_BUILD_COST: Record<Chassis, Cost> = {
    [Chassis.TRACKS]:   { chassis: 1 },
    [Chassis.ANTIGRAV]: { chassis: 2 },
    [Chassis.BIPOD]:    { chassis: 3 },
};

export const WEAPON_BUILD_COST: Record<Weapon, Cost> = {
    [Weapon.CANNON]:   { cannons: 1 },
    [Weapon.MISSILES]: { missiles: 2 },
    [Weapon.PHASERS]:  { phasers: 3 },
};

export const ELECTRONICS_BUILD_COST: Cost = { electronics: 1 };
export const NUCLEAR_BUILD_COST:     Cost = { nuclear: 2 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumCosts(...costs: Cost[]): Cost {
    const result: Cost = {};
    for (const cost of costs) {
        for (const [k, v] of Object.entries(cost) as [keyof Resources, number][]) {
            result[k] = (result[k] ?? 0) + v;
        }
    }
    return result;
}

export function canAfford(resources: Resources, cost: Cost): boolean {
    return (Object.entries(cost) as [keyof Resources, number][]).every(
        ([k, v]) => resources[k] >= v,
    );
}

function deductCost(resources: Resources, cost: Cost): void {
    for (const [k, v] of Object.entries(cost) as [keyof Resources, number][]) {
        resources[k] -= v;
    }
}

// ─── Build options ────────────────────────────────────────────────────────────

interface BuildOption { config: RobotConfig; cost: Cost; }

// Priority order: most powerful to least. AI picks the first it can afford.
export const BUILD_OPTIONS: BuildOption[] = [
    { config: { chassis: Chassis.BIPOD,    weapon: Weapon.PHASERS,  nuclear: true, electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], NUCLEAR_BUILD_COST, ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.BIPOD,    weapon: Weapon.PHASERS,  electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.ANTIGRAV, weapon: Weapon.MISSILES, electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.ANTIGRAV], WEAPON_BUILD_COST[Weapon.MISSILES], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.TRACKS,   weapon: Weapon.CANNON,   electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.TRACKS], WEAPON_BUILD_COST[Weapon.CANNON], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.BIPOD,    weapon: Weapon.PHASERS },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS]) },
    { config: { chassis: Chassis.ANTIGRAV, weapon: Weapon.MISSILES },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.ANTIGRAV], WEAPON_BUILD_COST[Weapon.MISSILES]) },
    { config: { chassis: Chassis.TRACKS,   weapon: Weapon.CANNON },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.TRACKS], WEAPON_BUILD_COST[Weapon.CANNON]) },
    { config: { chassis: Chassis.ANTIGRAV },
      cost: CHASSIS_BUILD_COST[Chassis.ANTIGRAV] },
    { config: { chassis: Chassis.TRACKS },
      cost: CHASSIS_BUILD_COST[Chassis.TRACKS] },
];

// ─── Goal cycling ─────────────────────────────────────────────────────────────

const BUILD_GOALS: RobotGoal[] = [
    RobotGoal.ATTACK_ROBOTS,
    RobotGoal.CAPTURE_FACTORY,
    RobotGoal.CAPTURE_WARBASE,
];

let _builtCount = 0;

/** Reset module state — call in tests that care about goal / ID sequencing. */
export function _resetBuildState(): void { _builtCount = 0; }

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Called each game tick. For every owned warbase whose spawn point is clear,
 * builds the most powerful robot the team can afford, deducts its cost, and
 * assigns it a goal from the round-robin cycle.
 */
export function tickBuild(warMap: WarMap, ownerResources: OwnerResources): void {
    const zone = CAPTURE_ZONES['warbase'];
    if (!zone) return;

    const occupancy = buildOccupancy(warMap);

    for (const obj of warMap.objects) {
        if (obj.type !== ObjectType.WARBASE) continue;
        if (obj.owner !== Owner.RED && obj.owner !== Owner.BLUE) continue;

        const spawnX = obj.x + zone.dx;
        const spawnY = obj.y + zone.dy;

        // Block if any robot (enemy capturing or own robot) is at the spawn point.
        if (isOccupied(occupancy, spawnX, spawnY)) continue;

        const resources = ownerResources[obj.owner];
        const option = BUILD_OPTIONS.find(o => canAfford(resources, o.cost));
        if (!option) continue;

        deductCost(resources, option.cost);

        // Find enemy warbase to determine the general move-out direction
        const enemyWarbase = warMap.objects.find(
            o => o.type === ObjectType.WARBASE && o.owner && o.owner !== obj.owner
        );
        let outFacing = Direction.E;
        let tx = spawnX + 4;
        let ty = spawnY;

        if (enemyWarbase) {
            const dx = enemyWarbase.x - spawnX;
            const dy = enemyWarbase.y - spawnY;
            if (Math.abs(dy) > Math.abs(dx)) {
                outFacing = dy > 0 ? Direction.S : Direction.N;
                tx = spawnX;
                ty = spawnY + (dy > 0 ? 4 : -4);
            } else {
                outFacing = dx > 0 ? Direction.E : Direction.W;
                tx = spawnX + (dx > 0 ? 4 : -4);
                ty = spawnY;
            }
        }

        const robot: RobotObject = {
            id: `robot_${_builtCount}`,
            type: ObjectType.ROBOT,
            x: spawnX,
            y: spawnY,
            owner: obj.owner,
            facing: outFacing,
            robotConfig: option.config,
            health: calcHealth(option.config),
            goal: BUILD_GOALS[_builtCount % BUILD_GOALS.length],
            ai: RobotAI.DUMMY,
            nav: {
                moveOutTarget: { x: tx, y: ty }
            }
        };
        _builtCount++;

        warMap.objects.push(robot);
        // Register in occupancy so a second warbase on the same tick can't spawn at the same point.
        occupancy.robots.push({ id: robot.id, x: robot.x, y: robot.y, height: calcRobotHeight(option.config) });
    }
}
