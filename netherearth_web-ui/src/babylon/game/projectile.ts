import type { WarMap, RobotObject, WeaponType } from './warmap';

// How much progress advances per sub-tick (5 sub-ticks = full travel).
export const SUB_TICKS = 5;
const PROGRESS_STEP = 1 / SUB_TICKS;

let nextId = 0;

export function spawnProjectile(warMap: WarMap, shooter: RobotObject, target: RobotObject): void {
    const w = shooter.robotConfig?.weapon ?? '';
    const weaponType: WeaponType =
        w.includes('phaser')  ? 'phaser'  :
        w.includes('missile') ? 'missile' : 'cannon';

    warMap.projectiles ??= [];
    warMap.projectiles.push({
        id:         `proj_${nextId++}`,
        weaponType,
        fromX: shooter.x, fromY: shooter.y,
        toX:   target.x,  toY:   target.y,
        progress:   0,
        ownerId:    shooter.id,
    });
}

// Advance all projectile positions by one sub-tick; remove completed ones.
export function advanceProjectiles(warMap: WarMap): void {
    if (!warMap.projectiles?.length) return;
    for (const p of warMap.projectiles) {
        p.progress = Math.min(1, p.progress + PROGRESS_STEP);
    }
    warMap.projectiles = warMap.projectiles.filter(p => p.progress < 1);
}
