import { WeaponType } from "../../../game/core/warmap";

import { ObjectType } from '../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { spawnProjectile, advanceProjectiles, SUB_TICKS } from '../../../game/mechanics/projectile';
import { Owner } from '../../../game/types/owner';
import { Weapon } from '../../../data/robot';
import type { WarMap, RobotObject } from '../../../game/core/warmap';

function makeMap(): WarMap {
    return { width: 20, height: 20, objects: [] };
}

function makeRobot(id: string, x: number, y: number): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y, owner: Owner.NEUTRAL,
    };
}

describe('spawnProjectile', () => {
    it('initialises projectiles array if absent', () => {
        const map = makeMap();
        const shooter = makeRobot('s', 0, 0);
        const target  = makeRobot('t', 3, 0);
        spawnProjectile(map, shooter, target, Weapon.CANNON);
        expect(map.projectiles).toHaveLength(1);
    });

    it('records from/to positions', () => {
        const map = makeMap();
        const shooter = makeRobot('s', 1, 2);
        const target  = makeRobot('t', 4, 2);
        spawnProjectile(map, shooter, target, Weapon.CANNON);
        const p = map.projectiles![0];
        expect(p.fromX).toBe(1); expect(p.fromY).toBe(2);
        expect(p.toX).toBe(4);   expect(p.toY).toBe(2);
    });

    it('starts at progress 0', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 3, 0), Weapon.CANNON);
        expect(map.projectiles![0].progress).toBe(0);
    });

    it('sets weaponType=cannon for cannon weapon', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 3, 0), Weapon.CANNON);
        expect(map.projectiles![0].weaponType).toBe(WeaponType.CANNON);
    });

    it('sets weaponType=missile for missiles weapon', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 4, 0), Weapon.MISSILES);
        expect(map.projectiles![0].weaponType).toBe(WeaponType.MISSILE);
    });

    it('sets weaponType=phaser for phasers weapon', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 5, 0), Weapon.PHASERS);
        expect(map.projectiles![0].weaponType).toBe(WeaponType.PHASER);
    });

    it('records ownerId', () => {
        const map = makeMap();
        const shooter = makeRobot('shooter1', 0, 0);
        spawnProjectile(map, shooter, makeRobot('t', 3, 0), Weapon.CANNON);
        expect(map.projectiles![0].ownerId).toBe('shooter1');
    });
});

describe('advanceProjectiles', () => {
    it('advances cannon progress by 1/(SUB_TICKS*2) each call (half speed)', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 3, 0), Weapon.CANNON);
        advanceProjectiles(map);
        expect(map.projectiles![0].progress).toBeCloseTo(1 / (SUB_TICKS * 2), 5);
    });

    it('removes cannon projectile when progress reaches 1 after SUB_TICKS*2 advances', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s', 0, 0), makeRobot('t', 3, 0), Weapon.CANNON);
        for (let i = 0; i < SUB_TICKS * 2; i++) advanceProjectiles(map);
        expect(map.projectiles ?? []).toHaveLength(0);
    });

    it('handles empty or absent projectiles without throwing', () => {
        const map = makeMap(); // no projectiles
        expect(() => advanceProjectiles(map)).not.toThrow();
    });

    it('multiple projectiles advance independently at their own speed', () => {
        const map = makeMap();
        spawnProjectile(map, makeRobot('s1', 0, 0), makeRobot('t1', 3, 0), Weapon.CANNON);
        spawnProjectile(map, makeRobot('s2', 0, 0), makeRobot('t2', 4, 0), Weapon.MISSILES);
        advanceProjectiles(map);
        expect(map.projectiles).toHaveLength(2);
        const [cannon, missile] = map.projectiles!;
        expect(cannon.progress).toBeCloseTo(1 / (SUB_TICKS * 2), 5);
        expect(missile.progress).toBeCloseTo(1 / (SUB_TICKS * 4), 5);
    });
});
