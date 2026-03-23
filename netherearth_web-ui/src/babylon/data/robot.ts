export interface RobotConfig {
    chassis: string;
    weapon?: string;       // absent = no weapon, robot never fires
    nuclearModel?: string; // explicit model name so color matches team
    electronics: string;
}

// How far a robot can see an enemy in its forward direction (cells), by electronics type.
export const SIGHT_RANGE: Record<string, number> = {
    'h-electronics': 4,
    'e-electronics': 2,
};

// Maximum fire range per weapon (cells). Absent key = weapon unknown, treat as 0.
export const WEAPON_RANGE: Record<string, number> = {
    'h-cannon':   3, 'e-cannon':   3,
    'h-missiles': 4, 'e-missiles': 4,
    'h-phasers':  5, 'e-phasers':  5,
};

// Minimum game ticks between shots (firing cooldown per weapon type).
// Phasers fire fastest; missiles slowest.
export const WEAPON_COOLDOWN: Record<string, number> = {
    'h-phasers':  2, 'e-phasers':  2,
    'h-cannon':   3, 'e-cannon':   3,
    'h-missiles': 5, 'e-missiles': 5,
};

// HP dealt to target per shot.
export const WEAPON_DAMAGE: Record<string, number> = {
    'h-cannon':   8,  'e-cannon':   8,
    'h-missiles': 14, 'e-missiles': 14,
    'h-phasers':  20, 'e-phasers':  20,
};

// Damage contribution per part name (1–100 scale).
// Weapon is the dominant factor; chassis affects mobility vs. firepower tradeoff;
// electronics add targeting precision; nuclearModel is a large bonus for having a nuke.
const PART_DAMAGE: Record<string, number> = {
    // chassis
    'h-tracks':   15,  // heavy ground, durable
    'h-antigrav': 10,  // light, fast — less raw power
    'h-bipod':    12,  // balanced
    'e-tracks':   15,
    'e-antigrav': 10,
    'e-bipod':    12,
    // weapon
    'h-cannon':   30,  // reliable ballistic
    'h-missiles': 42,  // explosive, area damage
    'h-phasers':  25,  // energy — precise but lighter
    'e-cannon':   30,
    'e-missiles': 42,
    'e-phasers':  25,
    // electronics
    'h-electronics': 5,
    'e-electronics': 5,
    // nuclear payload (optional) — large damage multiplier part
    'h-nuclear': 18,
    'e-nuclear': 18,
};

// Damage multiplier based on shot distance (linear from 100% at dist=1 to 40% at maxRange).
export function calcDamageFalloff(dist: number, maxRange: number): number {
    if (maxRange <= 1) return 1;
    return 0.4 + 0.6 * Math.max(0, (maxRange - dist) / (maxRange - 1));
}

// Sum health from all parts present in the config; clamp to [1, 100].
export function calcHealth(config: RobotConfig): number {
    const parts = [config.chassis, config.weapon, config.electronics, config.nuclearModel];
    let total = 0;
    for (const p of parts) if (p) total += PART_DAMAGE[p] ?? 0;
    return Math.max(1, Math.min(100, total));
}

export const robotConfigs = {
    'h-cannon':   { chassis: 'h-tracks',   weapon: 'h-cannon',                              electronics: 'h-electronics' },
    'h-missiles': { chassis: 'h-antigrav', weapon: 'h-missiles',                            electronics: 'h-electronics' },
    'h-phasers':  { chassis: 'h-bipod',    weapon: 'h-phasers',  nuclearModel: 'h-nuclear', electronics: 'h-electronics' },
    'e-cannon':   { chassis: 'e-tracks',   weapon: 'e-cannon',                              electronics: 'e-electronics' },
    'e-missiles': { chassis: 'e-antigrav', weapon: 'e-missiles',  nuclearModel: 'e-nuclear', electronics: 'e-electronics' },
    'e-phasers':  { chassis: 'e-bipod',    weapon: 'e-phasers',                             electronics: 'e-electronics' },
    // Scout: no weapon — used for testing and future factory-born unarmed robots
    'scout':      { chassis: 'h-antigrav',                                                  electronics: 'h-electronics' },
} satisfies Record<string, RobotConfig>;

export type RobotConfigName = keyof typeof robotConfigs;
