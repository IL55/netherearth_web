import { Chassis, Weapon, Electronics, calcHealth } from '../../data/robot';
import type { RobotConfig } from '../../data/robot';
import { ObjectType, Direction, RobotAI, RobotGoal, Owner } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import type { Resources } from '../../game/resources';
import { buildOccupancy, isOccupied } from '../../game/core/occupancy';
import { CAPTURE_ZONES } from '../../game/mechanics/capture';
import { CY_PARTS } from './constants';
import { spawnRobot } from '../../game/core/utils';

// ─── Part → game enum mappings ────────────────────────────────────────────────

export const PART_TO_CHASSIS: Readonly<Record<string, Chassis>> = {
    'h-bipod':    Chassis.BIPOD,
    'h-tracks':   Chassis.TRACKS,
    'h-antigrav': Chassis.ANTIGRAV,
};

export const PART_TO_WEAPON: Readonly<Record<string, Weapon>> = {
    'h-cannon':   Weapon.CANNON,
    'h-missiles': Weapon.MISSILES,
    'h-phasers':  Weapon.PHASERS,
};

// ─── Selection state ──────────────────────────────────────────────────────────

export interface BuildSelection {
    chassis:     string | null;
    weapon:      string | null;
    nuclear:     boolean;
    electronics: boolean;
}

export const EMPTY_SELECTION: BuildSelection = {
    chassis: null, weapon: null, nuclear: false, electronics: false,
};

// ─── Selection helpers ────────────────────────────────────────────────────────

/** Returns all selected part IDs in stacking order: chassis → weapon → nuclear → electronics. */
export function getSelectedPartIds(selection: BuildSelection): string[] {
    const ids: string[] = [];
    if (selection.chassis)     ids.push(selection.chassis);
    if (selection.weapon)      ids.push(selection.weapon);
    if (selection.nuclear)     ids.push('h-nuclear');
    if (selection.electronics) ids.push('h-electronics');
    return ids;
}

/**
 * Returns the new selection after toggling the given part:
 * - chassis / weapon: radio-style (deselects previous, selects new; click same to deselect)
 * - nuclear / electronics: simple on/off toggle
 * - 'common' and unknown ids: no-op, returns the same selection
 */
export function applyPartToggle(selection: BuildSelection, partId: string): BuildSelection {
    if (PART_TO_CHASSIS[partId] !== undefined)
        return { ...selection, chassis: selection.chassis === partId ? null : partId };
    if (PART_TO_WEAPON[partId] !== undefined)
        return { ...selection, weapon: selection.weapon === partId ? null : partId };
    if (partId === 'h-nuclear')
        return { ...selection, nuclear: !selection.nuclear };
    if (partId === 'h-electronics')
        return { ...selection, electronics: !selection.electronics };
    return selection;
}

// ─── Affordability ────────────────────────────────────────────────────────────

/**
 * Returns true if the resources cover the total cost of the selection.
 * Common resources act as a shared fallback for any specific-resource deficit.
 */
export function canAffordSelection(resources: Resources, selection: BuildSelection): boolean {
    let commonUsed = 0;
    for (const id of getSelectedPartIds(selection)) {
        const part = CY_PARTS.find(p => p.id === id);
        if (!part || part.cost === null) continue;
        const have = resources[part.resourceType];
        if (have >= part.cost) continue;
        commonUsed += part.cost - have;
        if (commonUsed > resources.common) return false;
    }
    return true;
}

/**
 * Deducts the selection cost from resources, using common as fallback for any deficit.
 * Returns false and leaves resources unchanged if the selection cannot be afforded.
 */
export function deductSelectionCost(resources: Resources, selection: BuildSelection): boolean {
    if (!canAffordSelection(resources, selection)) return false;
    for (const id of getSelectedPartIds(selection)) {
        const part = CY_PARTS.find(p => p.id === id);
        if (!part || part.cost === null) continue;
        const have = resources[part.resourceType];
        if (have >= part.cost) {
            resources[part.resourceType] -= part.cost;
        } else {
            resources.common -= (part.cost - have);
            resources[part.resourceType] = 0;
        }
    }
    return true;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * A valid build requires a chassis and at least one of: a weapon or nuclear
 * (nuclear counts as a weapon for creation purposes).
 */
export function isValidBuild(selection: BuildSelection): boolean {
    return selection.chassis !== null && (selection.weapon !== null || selection.nuclear);
}

// ─── RobotConfig conversion ───────────────────────────────────────────────────

/** Converts the selection to a RobotConfig. Returns null if chassis is missing. */
export function buildRobotConfig(selection: BuildSelection): RobotConfig | null {
    if (!selection.chassis) return null;
    const chassis = PART_TO_CHASSIS[selection.chassis];
    if (!chassis) return null;

    const config: RobotConfig = { chassis };
    if (selection.weapon) {
        const weapon = PART_TO_WEAPON[selection.weapon];
        if (weapon) config.weapons = [weapon];
    }
    if (selection.nuclear)     config.nuclear = true;
    if (selection.electronics) config.electronics = Electronics.STANDARD;
    return config;
}

// ─── Spawn availability ───────────────────────────────────────────────────────

/** Returns true if the owner's warbase spawn point is currently blocked. */
export function isSpawnOccupied(warMap: WarMap, owner: Owner): boolean {
    const zone = CAPTURE_ZONES['warbase'];
    if (!zone) return true;
    const warbase = warMap.tiles.find(
        o => o.type === ObjectType.WARBASE && o.owner === owner,
    );
    if (!warbase) return true;
    return isOccupied(buildOccupancy(warMap), warbase.x + zone.dx, warbase.y + zone.dy);
}

// ─── Robot spawning ───────────────────────────────────────────────────────────

let _manualBuildCount = 0;

/** Reset counter — call in tests that care about robot ID sequencing. */
export function _resetManualBuildCount(): void { _manualBuildCount = 0; }

/**
 * Spawns a robot with the given config at the owner's warbase spawn point.
 * Returns true on success, false if no warbase exists or the spawn point is blocked.
 */
export function spawnManualRobot(
    warMap: WarMap,
    config: RobotConfig,
    owner: Owner = Owner.RED,
): boolean {
    const zone = CAPTURE_ZONES['warbase'];
    if (!zone) return false;

    const warbase = warMap.tiles.find(
        o => o.type === ObjectType.WARBASE && o.owner === owner,
    );
    if (!warbase) return false;

    const spawnX = warbase.x + zone.dx;
    const spawnY = warbase.y + zone.dy;

    if (isOccupied(buildOccupancy(warMap), spawnX, spawnY)) return false;

    const robot = spawnRobot({
        id: `robot_manual_${_manualBuildCount++}`,
        x: spawnX,
        y: spawnY,
        owner,
        facing: Direction.E,
        robotConfig: config,
        goal: RobotGoal.ATTACK_ROBOTS,
    });
    robot.nav = { moveOutTarget: { x: spawnX + 4, y: spawnY } };

    warMap.robots.push(robot);
    return true;
}
