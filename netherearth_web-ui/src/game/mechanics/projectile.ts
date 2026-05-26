
import { WeaponType } from "../core/warmap";
import type { WarMap, RobotObject } from '../core/warmap';
import { Weapon, WEAPON_RANGE } from '../../data/robot';

import { SUB_TICKS, PROJECTILE_SPEED_NORMAL, PROJECTILE_SPEED_CANNON, PROJECTILE_SPEED_SLOW } from '../config';
export { SUB_TICKS };

const STEP_NORMAL = PROJECTILE_SPEED_NORMAL / SUB_TICKS;
const STEP_SLOW   = STEP_NORMAL * PROJECTILE_SPEED_SLOW;   // missile/phaser — slow travel
const STEP_MED    = STEP_NORMAL * PROJECTILE_SPEED_CANNON; // cannon — medium travel

const WEAPON_STEP: Partial<Record<WeaponType, number>> = {
    missile: STEP_SLOW,
    phaser:  STEP_SLOW,
    cannon:  STEP_MED,
};

let nextId = 0;

export function spawnProjectile(warMap: WarMap, shooter: RobotObject, target: { x: number; y: number }, weapon: Weapon): void {
    const weaponType: WeaponType =
        weapon === Weapon.PHASERS  ? WeaponType.PHASER  :
        weapon === Weapon.MISSILES ? WeaponType.MISSILE : WeaponType.CANNON;

    // Cap the visual endpoint at WEAPON_RANGE cells from the shooter so the
    // projectile beam never flies further than the weapon's design range,
    // even when the target is out of range (damage is applied before this call).
    const maxRange = WEAPON_RANGE[weapon] ?? 1;
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scale = dist > maxRange ? maxRange / dist : 1;
    const toX = shooter.x + dx * scale;
    const toY = shooter.y + dy * scale;

    warMap.projectiles ??= [];
    warMap.projectiles.push({
        id:         `proj_${nextId++}`,
        weaponType,
        fromX: shooter.x, fromY: shooter.y,
        toX,   toY,
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
