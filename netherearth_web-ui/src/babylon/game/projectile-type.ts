import type { WeaponType } from './weapon-type';

/**
 * Represents an active projectile on the map.
 * Contains information about its trajectory, speed, and the originating weapon.
 */
export interface Projectile {
    id: string;
    weaponType: WeaponType;
    fromX: number; fromY: number;
    toX:   number; toY:   number;
    progress: number; // 0.0 → 1.0
    step:     number; // progress added per sub-tick
    ownerId: string;
}
