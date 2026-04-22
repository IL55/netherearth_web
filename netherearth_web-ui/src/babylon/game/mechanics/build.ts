import { ObjectType } from '../core/warmap';
import { Direction } from "../core/warmap";

import { Chassis, Weapon, Electronics, calcRobotHeight } from '../../data/robot';
import type { RobotConfig } from '../../data/robot';
import { Owner } from '../types/owner';
import type { WarMap } from '../core/warmap';
import { RobotGoal } from '../core/warmap';
import type { OwnerResources, Resources } from '../resources';
import { ResourceType } from '../resources';
import { buildOccupancy, isOccupied } from '../core/occupancy';
import { CAPTURE_ZONES } from './capture';
import { spawnRobot } from '../core/utils';

type Cost = Partial<Resources>;

// ─── Part costs ───────────────────────────────────────────────────────────────

export const CHASSIS_BUILD_COST: Record<Chassis, Cost> = {
    [Chassis.TRACKS]:   { [ResourceType.CHASSIS]: 1 },
    [Chassis.ANTIGRAV]: { [ResourceType.CHASSIS]: 2 },
    [Chassis.BIPOD]:    { [ResourceType.CHASSIS]: 3 },
};

export const WEAPON_BUILD_COST: Record<Weapon, Cost> = {
    [Weapon.CANNON]:   { [ResourceType.CANNONS]: 1 },
    [Weapon.MISSILES]: { [ResourceType.MISSILES]: 2 },
    [Weapon.PHASERS]:  { [ResourceType.PHASERS]: 3 },
};

export const ELECTRONICS_BUILD_COST: Cost = { [ResourceType.ELECTRONICS]: 1 };
export const NUCLEAR_BUILD_COST:     Cost = { [ResourceType.NUCLEAR]: 2 };

// Ticks to wait before a warbase can build another robot.
export const BUILD_COOLDOWN_BLUE = 100;
export const BUILD_COOLDOWN_RED = 10;

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
    let deficit = 0;
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
        if (k === ResourceType.COMMON) {
            deficit += Math.max(0, v - resources[ResourceType.COMMON]);
        } else {
            deficit += Math.max(0, v - resources[k]);
        }
    }
    return resources[ResourceType.COMMON] >= deficit;
}

function deductCost(resources: Resources, cost: Cost): void {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
        if (k === ResourceType.COMMON) {
            resources[ResourceType.COMMON] -= v;
        } else {
            if (resources[k] >= v) {
                resources[k] -= v;
            } else {
                const remainder = v - resources[k];
                resources[k] = 0;
                resources[ResourceType.COMMON] -= remainder;
            }
        }
    }
}

// ─── Build options ────────────────────────────────────────────────────────────

interface BuildOption { config: RobotConfig; cost: Cost; }

// Priority order: most powerful to least. AI picks the first it can afford.
export const BUILD_OPTIONS: BuildOption[] = [
    // Multi-weapon options (most powerful first)
    { config: { chassis: Chassis.BIPOD, weapons: [Weapon.PHASERS, Weapon.MISSILES], nuclear: true, electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], WEAPON_BUILD_COST[Weapon.MISSILES], NUCLEAR_BUILD_COST, ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.BIPOD, weapons: [Weapon.PHASERS, Weapon.CANNON], electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], WEAPON_BUILD_COST[Weapon.CANNON], ELECTRONICS_BUILD_COST) },
    // Single-weapon options
    { config: { chassis: Chassis.BIPOD,    weapons: [Weapon.PHASERS],  nuclear: true, electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], NUCLEAR_BUILD_COST, ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.BIPOD,    weapons: [Weapon.PHASERS],  electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.ANTIGRAV, weapons: [Weapon.MISSILES], electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.ANTIGRAV], WEAPON_BUILD_COST[Weapon.MISSILES], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.TRACKS,   weapons: [Weapon.CANNON],   electronics: Electronics.STANDARD },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.TRACKS], WEAPON_BUILD_COST[Weapon.CANNON], ELECTRONICS_BUILD_COST) },
    { config: { chassis: Chassis.BIPOD,    weapons: [Weapon.PHASERS] },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.BIPOD], WEAPON_BUILD_COST[Weapon.PHASERS]) },
    { config: { chassis: Chassis.ANTIGRAV, weapons: [Weapon.MISSILES] },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.ANTIGRAV], WEAPON_BUILD_COST[Weapon.MISSILES]) },
    { config: { chassis: Chassis.TRACKS,   weapons: [Weapon.CANNON] },
      cost: sumCosts(CHASSIS_BUILD_COST[Chassis.TRACKS], WEAPON_BUILD_COST[Weapon.CANNON]) },
];

// ─── Goal selection ───────────────────────────────────────────────────────────

const NUKE_GOALS: RobotGoal[] = [
    RobotGoal.NUKE_FACTORY,
    RobotGoal.NUKE_WARBASE,
];

/** Number of robots to build for capturing neutral structures before starting to mix in fighters */
export const EARLY_GAME_CAPTORS_LIMIT = 10;

/**
 * Chooses a goal for a newly built (non-nuclear) robot based on the current
 * map state and the team's existing robot composition.
 *
 * Strategy:
 *  1. Early game (first EARLY_GAME_CAPTORS_LIMIT robots): if neutral structures exist, build only captors.
 *  2. Mid/Late game baseline: always keep ≥1 fighter per 3 robots.
 *  3. Mid game: while neutral structures exist, send captors there.
 *  4. Late game: no neutrals left — ramp fighters to 50 % then attack enemy structures.
 */
export function chooseBuildGoal(warMap: WarMap, owner: Owner): RobotGoal {
    const neutralFactories = warMap.tiles.filter(o => o.type === ObjectType.FACTORY && !o.owner).length;
    const neutralWarbases  = warMap.tiles.filter(o => o.type === ObjectType.WARBASE  && !o.owner).length;
    const enemyFactories   = warMap.tiles.filter(o => o.type === ObjectType.FACTORY && !!o.owner && o.owner !== owner).length;
    const enemyWarbases    = warMap.tiles.filter(o => o.type === ObjectType.WARBASE  && !!o.owner && o.owner !== owner).length;

    const myRobots = warMap.robots.filter(
        o => o.owner === owner && o.dyingTicks === undefined,
    );
    const fighters = myRobots.filter(r => r.goal === RobotGoal.ATTACK_ROBOTS).length;

    // Rule 1: Early game prioritize neutral structures blindly
    if (myRobots.length < EARLY_GAME_CAPTORS_LIMIT && (neutralFactories > 0 || neutralWarbases > 0)) {
        if (neutralFactories > 0) return RobotGoal.CAPTURE_NEUTRAL_FACTORY;
        if (neutralWarbases  > 0) return RobotGoal.CAPTURE_NEUTRAL_WARBASE;
    }

    // Rule 2: always maintain at least 1 fighter per 3 other robots
    if (fighters < Math.ceil(myRobots.length / 3)) {
        return RobotGoal.ATTACK_ROBOTS;
    }

    // Rule 3: neutral structures exist → prioritise capturing them
    if (neutralFactories > 0) return RobotGoal.CAPTURE_NEUTRAL_FACTORY;
    if (neutralWarbases  > 0) return RobotGoal.CAPTURE_NEUTRAL_WARBASE;

    // Rule 4: no neutrals left → ramp to 50 % fighters, then capture enemy
    if (myRobots.length === 0 || fighters / myRobots.length < 0.5) {
        return RobotGoal.ATTACK_ROBOTS;
    }
    if (enemyFactories > 0) return RobotGoal.CAPTURE_ENEMY_FACTORY;
    if (enemyWarbases  > 0) return RobotGoal.CAPTURE_ENEMY_WARBASE;

    return RobotGoal.ATTACK_ROBOTS;
}

let _builtCount = 0;

/** Reset module state — call in tests that care about goal / ID sequencing. */
export function _resetBuildState(): void { _builtCount = 0; }

// ─── Option selection ─────────────────────────────────────────────────────────

/**
 * Score an option by how well it uses the team's current stockpile.
 * Options that spend more of the resources you have the most of score higher,
 * so the AI naturally builds bipods when phasers are plentiful, nuclear robots
 * when nuclear resources are high, etc.
 */
function scoreBuildOption(option: BuildOption, resources: Resources): number {
    return (Object.entries(option.cost) as [keyof Resources, number][])
        .reduce((sum, [k, v]) => sum + v * resources[k], 0);
}

export function chooseBuildOption(resources: Resources): BuildOption | undefined {
    const affordable = BUILD_OPTIONS.filter(o => canAfford(resources, o.cost));
    if (affordable.length === 0) return undefined;
    return affordable.reduce((best, o) =>
        scoreBuildOption(o, resources) > scoreBuildOption(best, resources) ? o : best
    );
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Called each game tick. For every owned warbase whose spawn point is clear,
 * builds the robot that best uses the team's current resource stockpile,
 * deducts its cost, and assigns it a goal from the round-robin cycle.
 */
export function tickBuild(warMap: WarMap, ownerResources: OwnerResources): void {
    const zone = CAPTURE_ZONES[ObjectType.WARBASE];
    if (!zone) return;

    const occupancy = buildOccupancy(warMap);

    for (const obj of warMap.tiles) {
        if (obj.type !== ObjectType.WARBASE) continue;
        if (obj.owner !== Owner.BLUE) continue; // RED robots are built only by the player

        const spawnX = obj.x + zone.dx;
        const spawnY = obj.y + zone.dy;

        const cooldown = obj.owner === Owner.BLUE ? BUILD_COOLDOWN_BLUE : BUILD_COOLDOWN_RED;
        // Check warbase build cooldown (treat never-built as lastBuiltAt=0)
        if ((obj.lastBuiltAt ?? 0) + cooldown > (warMap.tick ?? 0)) continue;

        // Block if any robot (enemy capturing or own robot) is at the spawn point.
        if (isOccupied(occupancy, spawnX, spawnY)) continue;

        const resources = ownerResources[obj.owner];
        const option = chooseBuildOption(resources);
        if (!option) continue;

        // Mark the time this warbase built a robot
        if (warMap.tick !== undefined) obj.lastBuiltAt = warMap.tick;

        deductCost(resources, option.cost);

        // Face toward the enemy warbase on spawn
        const enemyWarbase = warMap.tiles.find(
            o => o.type === ObjectType.WARBASE && o.owner && o.owner !== obj.owner
        );
        let outFacing = Direction.E;
        if (enemyWarbase) {
            const dx = enemyWarbase.x - spawnX;
            const dy = enemyWarbase.y - spawnY;
            if (Math.abs(dy) > Math.abs(dx)) {
                outFacing = dy > 0 ? Direction.S : Direction.N;
            } else {
                outFacing = dx > 0 ? Direction.E : Direction.W;
            }
        }

        const robot = spawnRobot({
            id: `robot_${_builtCount}`,
            x: spawnX,
            y: spawnY,
            owner: obj.owner,
            facing: outFacing,
            robotConfig: option.config,
            goal: option.config.nuclear
                ? NUKE_GOALS[_builtCount % NUKE_GOALS.length]
                : chooseBuildGoal(warMap, obj.owner as Owner),
        });
        _builtCount++;

        warMap.robots.push(robot);
        // Register in occupancy so a second warbase on the same tick can't spawn at the same point.
        occupancy.robots.push({ id: robot.id, x: robot.x, y: robot.y, height: calcRobotHeight(option.config) });
    }
}
