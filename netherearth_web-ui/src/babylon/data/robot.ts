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
    weapons?:     Weapon[];
    nuclear?:     boolean;       // true → place the team-coloured nuclear model
    electronics?: Electronics;   // absent → no sensor, robot never fires
    navAlgo?:     NavAlgo;
}

export const WEAPON_RENDER_ORDER: Weapon[] = [Weapon.CANNON, Weapon.MISSILES, Weapon.PHASERS];

// ─── Stat tables (keyed by enum — no h-/e- duplication) ──────────────────────

// How far a robot can see an enemy in its forward direction (cells).
export const SIGHT_RANGE: Record<Electronics, number> = {
    [Electronics.STANDARD]: 8,
};

// Maximum fire range per weapon (cells).
export const WEAPON_RANGE: Record<Weapon, number> = {
    [Weapon.CANNON]:   5,
    [Weapon.MISSILES]: 7,
    [Weapon.PHASERS]:  5,
};

// Minimum game ticks between shots (firing cooldown per weapon type).
export const WEAPON_COOLDOWN: Record<Weapon, number> = {
    [Weapon.PHASERS]:  6,
    [Weapon.CANNON]:   7,
    [Weapon.MISSILES]: 12,
};

// HP dealt to target per shot.
export const WEAPON_DAMAGE: Record<Weapon, number> = {
    [Weapon.CANNON]:   4,
    [Weapon.MISSILES]: 6,
    [Weapon.PHASERS]:  8,
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

// Physical height contribution per part (used for collision with the ship)
export const CHASSIS_HEIGHT: Record<Chassis, number> = {
    [Chassis.TRACKS]:   0.4,
    [Chassis.ANTIGRAV]: 0.3,
    [Chassis.BIPOD]:    0.5,
};

export const WEAPON_HEIGHT: Record<Weapon, number> = {
    [Weapon.CANNON]:   0.3,
    [Weapon.MISSILES]: 0.4,
    [Weapon.PHASERS]:  0.3,
};

export const ELECTRONICS_HEIGHT: Record<Electronics, number> = {
    [Electronics.STANDARD]: 0.2,
};

export const NUCLEAR_HEIGHT = 0.6;

// ─── Damage falloff & health ──────────────────────────────────────────────────

// Damage multiplier based on shot distance (linear from 100% at dist=1 to 40% at maxRange).
export function calcDamageFalloff(dist: number, maxRange: number): number {
    if (maxRange <= 1) return 1;
    return 0.4 + 0.6 * Math.max(0, (maxRange - dist) / (maxRange - 1));
}

// Sum health from all parts present in the config; clamp to [1, 100].
export function calcHealth(config: RobotConfig): number {
    let total = CHASSIS_HP[config.chassis] ?? 0;
    for (const w of config.weapons ?? []) total += WEAPON_HP[w] ?? 0;
    if (config.electronics) total += ELECTRONICS_HP[config.electronics];
    if (config.nuclear)     total += NUCLEAR_HP;
    return Math.max(1, Math.min(100, total));
}

// Must match stackGap in view/map/robot.ts — each part overlaps the one below by this much.
const ROBOT_STACK_GAP = 0.15;
// Safety margin so the ship doesn't clip into the top part if a model is slightly taller than estimated.
const ROBOT_HEIGHT_CLEARANCE = 0.2;

// Calculate the total physical height of the robot based on its configured parts.
// Parts are stacked with ROBOT_STACK_GAP overlap between each pair. Electronics gets an extra
// overlap because the renderer subtracts an additional stackGap before placing it.
export function calcRobotHeight(config: RobotConfig): number {
    let total = CHASSIS_HEIGHT[config.chassis] ?? 0.4;
    let n = 1; // chassis counts as first part
    for (const w of config.weapons ?? []) { total += WEAPON_HEIGHT[w] ?? 0.3; n++; }
    if (config.nuclear)     { total += NUCLEAR_HEIGHT; n++; }
    if (config.electronics) { total += ELECTRONICS_HEIGHT[config.electronics] ?? 0.2; n++; }
    // Without electronics: (n-1) gaps used for stacking. With electronics: n gaps (one extra from placement).
    const gaps = config.electronics ? n : n - 1;
    return total - gaps * ROBOT_STACK_GAP + ROBOT_HEIGHT_CLEARANCE;
}

// ─── Preset configs ───────────────────────────────────────────────────────────

export const robotConfigs = {
    cannon:   { chassis: Chassis.TRACKS,   weapons: [Weapon.CANNON],   electronics: Electronics.STANDARD },
    missiles: { chassis: Chassis.ANTIGRAV, weapons: [Weapon.MISSILES], electronics: Electronics.STANDARD },
    phasers:  { chassis: Chassis.BIPOD,    weapons: [Weapon.PHASERS],  nuclear: true, electronics: Electronics.STANDARD },
    scout:    { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
} satisfies Record<string, RobotConfig>;

export type RobotConfigName = keyof typeof robotConfigs;
