import { Owner } from './owner';
import type { WarMap } from './warmap';

/** Number of ticks in one in-game "day" — resources are credited at the end of each day. */
export const DAY_TICKS = 40;

/** Factory subtypes that produce a specific resource when owned. */
export type FactoryResource = 'electronics' | 'chassis' | 'missiles' | 'cannons' | 'phasers' | 'nuclear';

const FACTORY_RESOURCE_SET: ReadonlySet<string> = new Set<FactoryResource>(
    ['electronics', 'chassis', 'missiles', 'cannons', 'phasers', 'nuclear'],
);

/** All resources held by one owner. */
export interface Resources {
    common:      number;
    electronics: number;
    chassis:     number;
    missiles:    number;
    cannons:     number;
    phasers:     number;
    nuclear:     number;
}

/** Resources for both playing owners (NEUTRAL is excluded — it never earns income). */
export type OwnerResources = Record<Owner.RED | Owner.BLUE, Resources>;

export function createResources(): Resources {
    return { common: 0, electronics: 0, chassis: 0, missiles: 0, cannons: 0, phasers: 0, nuclear: 0 };
}

export function createOwnerResources(): OwnerResources {
    return {
        [Owner.RED]:  createResources(),
        [Owner.BLUE]: createResources(),
    };
}

/**
 * Call once per tick after all actions.
 * On each day boundary (tick divisible by DAY_TICKS, tick > 0) credits income:
 *   - warbase  owned → +4 common
 *   - factory  owned → +2 of its specific resource (keyed by subtype)
 */
export function tickResources(warMap: WarMap, ownerResources: OwnerResources, tick: number): void {
    if (tick === 0 || tick % DAY_TICKS !== 0) return;

    for (const obj of warMap.objects) {
        if (obj.owner !== Owner.RED && obj.owner !== Owner.BLUE) continue;
        const res = ownerResources[obj.owner];

        if (obj.type === 'warbase') {
            res.common += 4;
        } else if (obj.type === 'factory' && obj.subtype && FACTORY_RESOURCE_SET.has(obj.subtype)) {
            res[obj.subtype as FactoryResource] += 2;
        }
    }
}
