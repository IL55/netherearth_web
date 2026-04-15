import { describe, it, expect, beforeEach } from 'vitest';
import { Chassis, Weapon, Electronics } from '../../../data/robot';
import { ObjectType, Owner } from '../../../game/core/warmap';
import type { WarMap } from '../../../game/core/warmap';
import { createResources } from '../../../game/resources';
import type { Resources } from '../../../game/resources';
import {
    EMPTY_SELECTION,
    applyPartToggle,
    getSelectedPartIds,
    canAffordSelection,
    deductSelectionCost,
    isValidBuild,
    buildRobotConfig,
    spawnManualRobot,
    isSpawnOccupied,
    _resetManualBuildCount,
    type BuildSelection,
} from '../../../view/construction-yard/construction-yard-logic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rich(): Resources {
    return { common: 10, chassis: 10, cannons: 10, missiles: 10, phasers: 10, electronics: 10, nuclear: 10 };
}

function empty(): Resources {
    return createResources();
}

function makeWarMap(withWarbase = true, warbaseOwner: Owner = Owner.RED): WarMap {
    const objects: WarMap['objects'] = [];
    if (withWarbase) {
        objects.push({ id: 'wb', type: ObjectType.WARBASE, x: 0, y: 0, owner: warbaseOwner });
    }
    return { width: 20, height: 20, objects, projectiles: [] };
}

// ─── applyPartToggle ──────────────────────────────────────────────────────────

describe('applyPartToggle', () => {
    it('selects chassis when none is selected', () => {
        const result = applyPartToggle(EMPTY_SELECTION, 'h-bipod');
        expect(result.chassis).toBe('h-bipod');
    });

    it('deselects chassis when clicking the same one again', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        expect(applyPartToggle(sel, 'h-bipod').chassis).toBeNull();
    });

    it('switches chassis radio-style (deselects old, selects new)', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        const result = applyPartToggle(sel, 'h-tracks');
        expect(result.chassis).toBe('h-tracks');
    });

    it('selects weapon when none is selected', () => {
        const result = applyPartToggle(EMPTY_SELECTION, 'h-cannon');
        expect(result.weapon).toBe('h-cannon');
    });

    it('switches weapon radio-style', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        const result = applyPartToggle(sel, 'h-missiles');
        expect(result.weapon).toBe('h-missiles');
    });

    it('deselects weapon when clicking the same one', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        expect(applyPartToggle(sel, 'h-cannon').weapon).toBeNull();
    });

    it('toggles nuclear on', () => {
        expect(applyPartToggle(EMPTY_SELECTION, 'h-nuclear').nuclear).toBe(true);
    });

    it('toggles nuclear off', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, nuclear: true };
        expect(applyPartToggle(sel, 'h-nuclear').nuclear).toBe(false);
    });

    it('toggles electronics on/off', () => {
        const on = applyPartToggle(EMPTY_SELECTION, 'h-electronics');
        expect(on.electronics).toBe(true);
        expect(applyPartToggle(on, 'h-electronics').electronics).toBe(false);
    });

    it('is a no-op for "common"', () => {
        const result = applyPartToggle(EMPTY_SELECTION, 'common');
        expect(result).toEqual(EMPTY_SELECTION);
    });

    it('is a no-op for unknown part ids', () => {
        const result = applyPartToggle(EMPTY_SELECTION, 'unknown-part');
        expect(result).toEqual(EMPTY_SELECTION);
    });

    it('does not mutate the original selection', () => {
        const orig = { ...EMPTY_SELECTION };
        applyPartToggle(orig, 'h-bipod');
        expect(orig.chassis).toBeNull();
    });
});

// ─── getSelectedPartIds ───────────────────────────────────────────────────────

describe('getSelectedPartIds', () => {
    it('returns empty array for empty selection', () => {
        expect(getSelectedPartIds(EMPTY_SELECTION)).toEqual([]);
    });

    it('returns chassis only when only chassis selected', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        expect(getSelectedPartIds(sel)).toEqual(['h-bipod']);
    });

    it('returns parts in stacking order: chassis → weapon → nuclear → electronics', () => {
        const sel: BuildSelection = { chassis: 'h-tracks', weapon: 'h-cannon', nuclear: true, electronics: true };
        expect(getSelectedPartIds(sel)).toEqual(['h-tracks', 'h-cannon', 'h-nuclear', 'h-electronics']);
    });
});

// ─── canAffordSelection ───────────────────────────────────────────────────────

describe('canAffordSelection', () => {
    it('empty selection is always affordable', () => {
        expect(canAffordSelection(empty(), EMPTY_SELECTION)).toBe(true);
    });

    it('affordable when specific resources cover the cost', () => {
        // h-cannon costs 1 cannon
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        const res = { ...empty(), cannons: 1 };
        expect(canAffordSelection(res, sel)).toBe(true);
    });

    it('affordable when common covers the specific deficit', () => {
        // h-cannon costs 1 cannon; we have 0 cannons but 1 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        const res = { ...empty(), common: 1 };
        expect(canAffordSelection(res, sel)).toBe(true);
    });

    it('not affordable when neither specific nor common is enough', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        expect(canAffordSelection(empty(), sel)).toBe(false);
    });

    it('common pool is shared — insufficient if two parts both need common', () => {
        // h-cannon costs 1 cannon, h-electronics costs 1 electronics
        // We have 0 cannons + 0 electronics + 1 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon', electronics: true };
        const res = { ...empty(), common: 1 };
        expect(canAffordSelection(res, sel)).toBe(false);
    });

    it('common pool is shared — sufficient when common covers both deficits', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon', electronics: true };
        const res = { ...empty(), common: 2 };
        expect(canAffordSelection(res, sel)).toBe(true);
    });

    it('mixed: specific covers one part, common covers another', () => {
        // h-cannon costs 1 cannon, h-electronics costs 1 electronics
        // We have 1 cannon + 0 electronics + 1 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon', electronics: true };
        const res = { ...empty(), cannons: 1, common: 1 };
        expect(canAffordSelection(res, sel)).toBe(true);
    });

    it('partial specific resources count toward the cost', () => {
        // h-bipod costs 3 chassis. We have 2 chassis + 1 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        const res = { ...empty(), chassis: 2, common: 1 };
        expect(canAffordSelection(res, sel)).toBe(true);
    });

    it('partial not enough even with common', () => {
        // h-bipod costs 3 chassis. We have 2 chassis + 0 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        const res = { ...empty(), chassis: 2, common: 0 };
        expect(canAffordSelection(res, sel)).toBe(false);
    });
});

// ─── deductSelectionCost ──────────────────────────────────────────────────────

describe('deductSelectionCost', () => {
    it('returns false and does not mutate when not affordable', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        const res = empty();
        const before = { ...res };
        const result = deductSelectionCost(res, sel);
        expect(result).toBe(false);
        expect(res).toEqual(before);
    });

    it('deducts specific resource when available', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' }; // costs 1 cannon
        const res = { ...empty(), cannons: 3 };
        expect(deductSelectionCost(res, sel)).toBe(true);
        expect(res.cannons).toBe(2);
        expect(res.common).toBe(0);
    });

    it('deducts from common when specific is zero', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' }; // costs 1 cannon
        const res = { ...empty(), common: 2 };
        expect(deductSelectionCost(res, sel)).toBe(true);
        expect(res.cannons).toBe(0);
        expect(res.common).toBe(1);
    });

    it('uses specific resource first, then common for the remainder', () => {
        // h-bipod costs 3 chassis; we have 1 chassis + 3 common
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        const res = { ...empty(), chassis: 1, common: 3 };
        expect(deductSelectionCost(res, sel)).toBe(true);
        expect(res.chassis).toBe(0);
        expect(res.common).toBe(1); // used 2 common to cover 2-chassis deficit
    });

    it('deducts multiple parts correctly', () => {
        // h-tracks costs 1 chassis, h-cannon costs 1 cannon, h-electronics costs 1 electronics
        const sel: BuildSelection = { chassis: 'h-tracks', weapon: 'h-cannon', electronics: true, nuclear: false };
        const res = rich();
        expect(deductSelectionCost(res, sel)).toBe(true);
        expect(res.chassis).toBe(9);
        expect(res.cannons).toBe(9);
        expect(res.electronics).toBe(9);
    });

    it('returns true for empty selection (no cost)', () => {
        const res = empty();
        expect(deductSelectionCost(res, EMPTY_SELECTION)).toBe(true);
        expect(res).toEqual(empty());
    });
});

// ─── isValidBuild ─────────────────────────────────────────────────────────────

describe('isValidBuild', () => {
    it('empty selection is invalid', () => {
        expect(isValidBuild(EMPTY_SELECTION)).toBe(false);
    });

    it('chassis-only is invalid (no weapon)', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod' };
        expect(isValidBuild(sel)).toBe(false);
    });

    it('weapon-only is invalid (no chassis)', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, weapon: 'h-cannon' };
        expect(isValidBuild(sel)).toBe(false);
    });

    it('chassis + weapon is valid', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod', weapon: 'h-cannon' };
        expect(isValidBuild(sel)).toBe(true);
    });

    it('chassis + nuclear is valid (nuclear counts as weapon)', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod', nuclear: true };
        expect(isValidBuild(sel)).toBe(true);
    });

    it('chassis + weapon + nuclear is valid', () => {
        const sel: BuildSelection = { chassis: 'h-bipod', weapon: 'h-phasers', nuclear: true, electronics: false };
        expect(isValidBuild(sel)).toBe(true);
    });

    it('electronics alone does not count as a weapon', () => {
        const sel: BuildSelection = { ...EMPTY_SELECTION, chassis: 'h-bipod', electronics: true };
        expect(isValidBuild(sel)).toBe(false);
    });
});

// ─── buildRobotConfig ─────────────────────────────────────────────────────────

describe('buildRobotConfig', () => {
    it('returns null when chassis is not selected', () => {
        expect(buildRobotConfig(EMPTY_SELECTION)).toBeNull();
    });

    it('chassis-only maps to correct Chassis enum', () => {
        const cfg = buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-bipod' });
        expect(cfg?.chassis).toBe(Chassis.BIPOD);
        expect(cfg?.weapon).toBeUndefined();
    });

    it('maps all three chassis types correctly', () => {
        expect(buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-tracks' })?.chassis).toBe(Chassis.TRACKS);
        expect(buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-antigrav' })?.chassis).toBe(Chassis.ANTIGRAV);
    });

    it('maps weapon correctly', () => {
        const cfg = buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-bipod', weapon: 'h-cannon' });
        expect(cfg?.weapon).toBe(Weapon.CANNON);
    });

    it('maps all three weapon types correctly', () => {
        const m = (w: string) => buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-bipod', weapon: w })?.weapon;
        expect(m('h-missiles')).toBe(Weapon.MISSILES);
        expect(m('h-phasers')).toBe(Weapon.PHASERS);
    });

    it('sets nuclear flag', () => {
        const cfg = buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-bipod', nuclear: true });
        expect(cfg?.nuclear).toBe(true);
    });

    it('sets electronics', () => {
        const cfg = buildRobotConfig({ ...EMPTY_SELECTION, chassis: 'h-bipod', electronics: true });
        expect(cfg?.electronics).toBe(Electronics.STANDARD);
    });

    it('full config maps correctly', () => {
        const cfg = buildRobotConfig({ chassis: 'h-tracks', weapon: 'h-phasers', nuclear: true, electronics: true });
        expect(cfg).toEqual({
            chassis: Chassis.TRACKS,
            weapon: Weapon.PHASERS,
            nuclear: true,
            electronics: Electronics.STANDARD,
        });
    });
});

// ─── spawnManualRobot ─────────────────────────────────────────────────────────

describe('spawnManualRobot', () => {
    const cfg = { chassis: Chassis.TRACKS, weapon: Weapon.CANNON };

    beforeEach(() => { _resetManualBuildCount(); });

    it('returns false when no warbase exists', () => {
        const warMap = makeWarMap(false);
        expect(spawnManualRobot(warMap, cfg)).toBe(false);
        expect(warMap.objects).toHaveLength(0);
    });

    it('returns false when warbase belongs to a different owner', () => {
        const warMap = makeWarMap(true, Owner.BLUE);
        expect(spawnManualRobot(warMap, cfg, Owner.RED)).toBe(false);
    });

    it('adds a robot to warMap on success', () => {
        const warMap = makeWarMap();
        expect(spawnManualRobot(warMap, cfg)).toBe(true);
        const robots = warMap.objects.filter(o => o.type === ObjectType.ROBOT);
        expect(robots).toHaveLength(1);
    });

    it('spawns robot at the warbase spawn zone offset', () => {
        const warMap = makeWarMap();
        // warbase at (0,0); CAPTURE_ZONES.warbase = { dx: 3.5, dy: 2.0 }
        spawnManualRobot(warMap, cfg);
        const robot = warMap.objects.find(o => o.type === ObjectType.ROBOT)!;
        expect(robot.x).toBeCloseTo(3.5);
        expect(robot.y).toBeCloseTo(2.0);
    });

    it('gives the robot the supplied config', () => {
        const warMap = makeWarMap();
        spawnManualRobot(warMap, cfg);
        const robot = warMap.objects.find(o => o.type === ObjectType.ROBOT)!;
        expect(robot.robotConfig).toEqual(cfg);
    });

    it('assigns the correct owner', () => {
        const warMap = makeWarMap();
        spawnManualRobot(warMap, cfg, Owner.RED);
        const robot = warMap.objects.find(o => o.type === ObjectType.ROBOT)!;
        expect(robot.owner).toBe(Owner.RED);
    });

    it('returns false when spawn point is already occupied', () => {
        const warMap = makeWarMap();
        // Place a robot at the spawn location first
        warMap.objects.push({
            id: 'blocker',
            type: ObjectType.ROBOT,
            x: 3.5,
            y: 2.0,
            owner: Owner.RED,
        });
        expect(spawnManualRobot(warMap, cfg)).toBe(false);
    });

    it('assigns sequential unique ids across separate warbases', () => {
        // Each map has its own spawn point — both spawns succeed
        const warMap1 = makeWarMap();
        const warMap2 = makeWarMap();
        spawnManualRobot(warMap1, cfg);
        spawnManualRobot(warMap2, cfg);
        const robot1 = warMap1.objects.find(o => o.type === ObjectType.ROBOT)!;
        const robot2 = warMap2.objects.find(o => o.type === ObjectType.ROBOT)!;
        expect(robot1.id).toBe('robot_manual_0');
        expect(robot2.id).toBe('robot_manual_1');
        expect(robot1.id).not.toBe(robot2.id);
    });
});

// ─── isSpawnOccupied ──────────────────────────────────────────────────────────
// Warbase spawn offset: dx=3.5, dy=2.0 (from CAPTURE_ZONES['warbase'])

describe('isSpawnOccupied', () => {
    it('returns true when no warbase exists', () => {
        const warMap = makeWarMap(false);
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(true);
    });

    it('returns true when warbase belongs to a different owner', () => {
        const warMap = makeWarMap(true, Owner.BLUE);
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(true);
    });

    it('returns false when spawn point is clear', () => {
        const warMap = makeWarMap(true, Owner.RED);
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(false);
    });

    it('returns true when a robot occupies the spawn point', () => {
        const warMap = makeWarMap(true, Owner.RED); // warbase at (0,0)
        // spawn = (0 + 3.5, 0 + 2.0) = (3.5, 2.0)
        warMap.objects.push({ id: 'blocker', type: ObjectType.ROBOT, x: 3.5, y: 2.0, owner: Owner.RED });
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(true);
    });

    it('returns false after the blocking robot is removed', () => {
        const warMap = makeWarMap(true, Owner.RED);
        warMap.objects.push({ id: 'blocker', type: ObjectType.ROBOT, x: 3.5, y: 2.0, owner: Owner.RED });
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(true);
        warMap.objects = warMap.objects.filter(o => o.id !== 'blocker');
        expect(isSpawnOccupied(warMap, Owner.RED)).toBe(false);
    });
});
