
import { WeaponType } from "../core/warmap";
import type { WarMap, RobotObject } from '../core/warmap';
import { Weapon } from '../../data/robot';

// How much progress advances per sub-tick (5 sub-ticks = full travel at normal speed).
export const SUB_TICKS = 5;
const STEP_NORMAL = 1 / SUB_TICKS;
const STEP_SLOW   = STEP_NORMAL / 4; // missiles travel at quarter speed (20 sub-ticks)
const STEP_MED    = STEP_NORMAL / 2; // cannon travels at half speed (10 sub-ticks)

const WEAPON_STEP: Partial<Record<WeaponType, number>> = {
    missile: STEP_SLOW,
    phaser:  STEP_SLOW,
    cannon:  STEP_MED,
};

let nextId = 0;

export function spawnProjectile(warMap: WarMap, shooter: RobotObject, target: RobotObject, weapon: Weapon): void {
    const weaponType: WeaponType =
        weapon === Weapon.PHASERS  ? WeaponType.PHASER  :
        weapon === Weapon.MISSILES ? WeaponType.MISSILE : WeaponType.CANNON;

    warMap.projectiles ??= [];
    warMap.projectiles.push({
        id:         `proj_${nextId++}`,
        weaponType,
        fromX: shooter.x, fromY: shooter.y,
        toX:   target.x,  toY:   target.y,
        progress:   0,
        step:       WEAPON_STEP[weaponType] ?? STEP_NORMAL,
        ownerId:    shooter.id,
    });
}

// Advance all projectile positions by one sub-tick; remove completed ones.
export function advanceProjectiles(warMap: WarMap): void {
    if (!warMap.projectiles?.length) return;
    for (const p of warMap.projectiles) {
        p.progress += p.step;
        if (p.progress >= 1 - 1e-9) p.progress = 1;
    }
    warMap.projectiles = warMap.projectiles.filter(p => p.progress < 1);
}
