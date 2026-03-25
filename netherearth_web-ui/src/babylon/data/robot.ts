import type { NavAlgo } from '../game/ai/nav-algo';

// ─── Part enums ───────────────────────────────────────────────────────────────

/** Chassis type — determines terrain passability and movement speed. */
export enum Chassis {
    TRACKS   = 'tracks',
    ANTIGRAV = 'antigrav',
    BIPOD    = 'bipod',
}

/** Weapon type — determines range, cooldown, and damage. */
export enum Weapon {
    CANNON   = 'cannon',
    MISSILES = 'missiles',
    PHASERS  = 'phasers',
}

/**
 * Electronics type — determines sight range and targeting.
 * Optional on a robot; absent means no sensor module and the robot never fires.
 * One tier for now; add more values (and matching model files) for balance later.
 */
export enum Electronics {
    STANDARD = 'electronics',  // enum value = model name suffix: h-electronics / e-electronics
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface RobotConfig {
    chassis:      Chassis;
    weapon?:      Weapon;
    nuclear?:     boolean;       // true → place the team-coloured nuclear model
    electronics?: Electronics;   // absent → no sensor, robot never fires
    navAlgo?:     NavAlgo;
}

// ─── Stat tables (keyed by enum — no h-/e- duplication) ──────────────────────

// How far a robot can see an enemy in its forward direction (cells).
export const SIGHT_RANGE: Record<Electronics, number> = {
    [Electronics.STANDARD]: 4,
};

// Maximum fire range per weapon (cells).
export const WEAPON_RANGE: Record<Weapon, number> = {
    [Weapon.CANNON]:   3,
    [Weapon.MISSILES]: 4,
    [Weapon.PHASERS]:  5,
};

// Minimum game ticks between shots (firing cooldown per weapon type).
export const WEAPON_COOLDOWN: Record<Weapon, number> = {
    [Weapon.PHASERS]:  2,
    [Weapon.CANNON]:   3,
    [Weapon.MISSILES]: 5,
};

// HP dealt to target per shot.
export const WEAPON_DAMAGE: Record<Weapon, number> = {
    [Weapon.CANNON]:   8,
    [Weapon.MISSILES]: 14,
    [Weapon.PHASERS]:  20,
};

// Damage contribution per part (1–100 scale) used by calcHealth.
const CHASSIS_HP: Record<Chassis, number> = {
    [Chassis.TRACKS]:   15,
    [Chassis.ANTIGRAV]: 10,
    [Chassis.BIPOD]:    12,
};

const WEAPON_HP: Record<Weapon, number> = {
    [Weapon.CANNON]:   30,
    [Weapon.MISSILES]: 42,
    [Weapon.PHASERS]:  25,
};

const ELECTRONICS_HP: Record<Electronics, number> = {
    [Electronics.STANDARD]: 5,
};

const NUCLEAR_HP = 18;

// ─── Damage falloff & health ──────────────────────────────────────────────────

// Damage multiplier based on shot distance (linear from 100% at dist=1 to 40% at maxRange).
export function calcDamageFalloff(dist: number, maxRange: number): number {
    if (maxRange <= 1) return 1;
    return 0.4 + 0.6 * Math.max(0, (maxRange - dist) / (maxRange - 1));
}

// Sum health from all parts present in the config; clamp to [1, 100].
export function calcHealth(config: RobotConfig): number {
    let total = CHASSIS_HP[config.chassis] ?? 0;
    if (config.weapon)      total += WEAPON_HP[config.weapon];
    if (config.electronics) total += ELECTRONICS_HP[config.electronics];
    if (config.nuclear)     total += NUCLEAR_HP;
    return Math.max(1, Math.min(100, total));
}

// ─── Preset configs ───────────────────────────────────────────────────────────

export const robotConfigs = {
    cannon:   { chassis: Chassis.TRACKS,   weapon: Weapon.CANNON,   electronics: Electronics.STANDARD },
    missiles: { chassis: Chassis.ANTIGRAV, weapon: Weapon.MISSILES, electronics: Electronics.STANDARD },
    phasers:  { chassis: Chassis.BIPOD,    weapon: Weapon.PHASERS,  nuclear: true, electronics: Electronics.STANDARD },
    scout:    { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
} satisfies Record<string, RobotConfig>;

export type RobotConfigName = keyof typeof robotConfigs;
