/**
 * Balance tests — assert that game constants fit together in a playable configuration.
 * These tests catch regressions when a single value is tuned without considering
 * its downstream effects (e.g. buffing damage so much that robots die in one hit).
 */
import { describe, it, expect } from 'vitest';
import * as C from '../../game/config';
import { Chassis, Weapon, Electronics, calcHealth, calcDamageFalloff } from '../../data/robot';

// ── Time to kill ──────────────────────────────────────────────────────────────

describe('time to kill', () => {
    it('no weapon one-shots the weakest chassis (no electronics, no weapons)', () => {
        const hp = calcHealth({ chassis: Chassis.ANTIGRAV }); // antigrav is lowest HP chassis
        for (const weapon of Object.values(Weapon)) {
            const damage = C.WEAPON_DAMAGE[weapon as Weapon];
            expect(damage, `${weapon} one-shots a bare ${Chassis.ANTIGRAV}`).toBeLessThan(hp);
        }
    });

    it('all weapon/chassis combos: 2–15 shots to kill a bare robot', () => {
        for (const chassis of Object.values(Chassis)) {
            const hp = calcHealth({ chassis: chassis as Chassis });
            for (const weapon of Object.values(Weapon)) {
                const damage = C.WEAPON_DAMAGE[weapon as Weapon];
                const shots  = Math.ceil(hp / damage);
                expect(shots, `${weapon} vs bare ${chassis}: shots`).toBeGreaterThanOrEqual(2);
                expect(shots, `${weapon} vs bare ${chassis}: shots`).toBeLessThanOrEqual(15);
            }
        }
    });

    it('fully-equipped robot (bipod + phasers + missiles + nuclear + electronics) survives ≥ 5 phaser hits', () => {
        const hp = calcHealth({
            chassis:     Chassis.BIPOD,
            weapons:     [Weapon.PHASERS, Weapon.MISSILES],
            nuclear:     true,
            electronics: Electronics.STANDARD,
        });
        const shots = Math.ceil(hp / C.WEAPON_DAMAGE.phasers);
        expect(shots).toBeGreaterThanOrEqual(5);
    });

    it('no robot can be killed with a single hit at max range (falloff reduces damage)', () => {
        for (const chassis of Object.values(Chassis)) {
            const hp = calcHealth({ chassis: chassis as Chassis });
            for (const weapon of Object.values(Weapon)) {
                const baseDamage  = C.WEAPON_DAMAGE[weapon as Weapon];
                const range       = C.WEAPON_RANGE[weapon as Weapon];
                const falloff     = calcDamageFalloff(range, range);
                const maxRangeDmg = baseDamage * falloff;
                expect(maxRangeDmg, `${weapon} at max range one-shots bare ${chassis}`).toBeLessThan(hp);
            }
        }
    });
});

// ── Damage falloff ────────────────────────────────────────────────────────────

describe('damage falloff', () => {
    it('at distance 1, multiplier is 1.0 for all weapons', () => {
        for (const weapon of Object.values(Weapon)) {
            const range = C.WEAPON_RANGE[weapon as Weapon];
            expect(calcDamageFalloff(1, range)).toBeCloseTo(1.0, 5);
        }
    });

    it('at max range, multiplier equals DAMAGE_FALLOFF_BASE', () => {
        for (const weapon of Object.values(Weapon)) {
            const range = C.WEAPON_RANGE[weapon as Weapon];
            expect(calcDamageFalloff(range, range)).toBeCloseTo(C.DAMAGE_FALLOFF_BASE, 5);
        }
    });

    it('falloff base is between 0.1 and 0.9 (meaningful but not punishing)', () => {
        expect(C.DAMAGE_FALLOFF_BASE).toBeGreaterThan(0.1);
        expect(C.DAMAGE_FALLOFF_BASE).toBeLessThan(0.9);
    });

    it('damage always decreases or stays flat as distance increases', () => {
        for (const weapon of Object.values(Weapon)) {
            const range = C.WEAPON_RANGE[weapon as Weapon];
            let prev = calcDamageFalloff(1, range);
            for (let d = 2; d <= range; d++) {
                const curr = calcDamageFalloff(d, range);
                expect(curr, `falloff increased from dist ${d - 1} to ${d} for ${weapon}`).toBeLessThanOrEqual(prev + 1e-9);
                prev = curr;
            }
        }
    });
});

// ── Weapon DPS balance ────────────────────────────────────────────────────────

describe('weapon DPS balance', () => {
    it('all weapons have positive effective DPS', () => {
        for (const weapon of Object.values(Weapon)) {
            const dps = C.WEAPON_DAMAGE[weapon as Weapon] / C.WEAPON_COOLDOWN[weapon as Weapon];
            expect(dps, `${weapon} DPS`).toBeGreaterThan(0);
        }
    });

    it('no weapon has more than 4× the DPS of any other (no dominant choice)', () => {
        const dpsValues = Object.values(Weapon).map(
            w => C.WEAPON_DAMAGE[w as Weapon] / C.WEAPON_COOLDOWN[w as Weapon],
        );
        const maxDPS = Math.max(...dpsValues);
        const minDPS = Math.min(...dpsValues);
        expect(maxDPS / minDPS).toBeLessThan(4);
    });
});

// ── Economy ───────────────────────────────────────────────────────────────────

describe('economy', () => {
    it('income rates are positive', () => {
        expect(C.WARBASE_INCOME).toBeGreaterThan(0);
        expect(C.FACTORY_INCOME).toBeGreaterThan(0);
    });

    it('build cooldown is at least one full in-game day', () => {
        expect(C.BUILD_COOLDOWN_DAYS).toBeGreaterThanOrEqual(1);
    });

    it('build cooldown is at most 10 days (warbases stay relevant)', () => {
        expect(C.BUILD_COOLDOWN_DAYS).toBeLessThanOrEqual(10);
    });

    it('cheapest robot costs ≤ 5 days of combined income to afford', () => {
        // Cheapest: tracks + cannon + electronics = 1 chassis + 1 cannons + 1 electronics
        const cheapestCost = C.CHASSIS_COST.tracks + C.WEAPON_COST.cannon + C.ELECTRONICS_COST;
        // With matching factories: income per day = FACTORY_INCOME per resource type
        const incomePerDay = C.FACTORY_INCOME;
        const daysPerUnit  = 1 / incomePerDay; // days to produce 1 of any specific resource
        const daysToAfford = cheapestCost * daysPerUnit; // assumes one factory per resource type
        expect(daysToAfford).toBeLessThanOrEqual(5);
    });
});

// ── Capture timing ────────────────────────────────────────────────────────────

describe('capture timing', () => {
    it('factory captures faster than warbase', () => {
        expect(C.FACTORY_CAPTURE_DAYS).toBeLessThan(C.WARBASE_CAPTURE_DAYS);
    });

    it('capture times are positive', () => {
        expect(C.FACTORY_CAPTURE_DAYS).toBeGreaterThan(0);
        expect(C.WARBASE_CAPTURE_DAYS).toBeGreaterThan(0);
    });

    it('warbase capture takes at most 20 days (still achievable)', () => {
        expect(C.WARBASE_CAPTURE_DAYS).toBeLessThanOrEqual(20);
    });
});

// ── Terrain degradation ───────────────────────────────────────────────────────

describe('terrain degradation', () => {
    it('kill thresholds are strictly increasing', () => {
        expect(C.SAND_THRESHOLD).toBeLessThan(C.MOUNTAIN_THRESHOLD);
        expect(C.MOUNTAIN_THRESHOLD).toBeLessThan(C.WALL_THRESHOLD);
    });

    it('first kill immediately triggers grass→sand transition', () => {
        expect(C.SAND_THRESHOLD).toBe(1);
    });

    it('wall spawns within 30 kills (terrain evolves at a reasonable pace)', () => {
        expect(C.WALL_THRESHOLD).toBeLessThanOrEqual(30);
    });
});

// ── Nuclear ───────────────────────────────────────────────────────────────────

describe('nuclear', () => {
    it('kill zone radius is strictly inside damage zone radius', () => {
        expect(C.NUKE_KILL_RADIUS).toBeLessThan(C.NUKE_DAMAGE_RADIUS);
    });

    it('outer-zone HP fraction is between 0.1 and 0.9', () => {
        expect(C.NUKE_OUTER_HP_FRACTION).toBeGreaterThan(0.1);
        expect(C.NUKE_OUTER_HP_FRACTION).toBeLessThan(0.9);
    });

    it('detonate chance yields an expected trigger window of 5–100 ticks', () => {
        const expectedTicks = 1 / C.NUKE_DETONATE_CHANCE;
        expect(expectedTicks).toBeGreaterThanOrEqual(5);
        expect(expectedTicks).toBeLessThanOrEqual(100);
    });
});

// ── Army composition ──────────────────────────────────────────────────────────

describe('army composition', () => {
    it('fighter ratio divisor is at least 2 (at most half the army is fighters by default)', () => {
        expect(C.FIGHTER_RATIO_DIVISOR).toBeGreaterThanOrEqual(2);
    });

    it('late-game fighter ratio is strictly above the mid-game minimum', () => {
        const midGameMin = 1 / C.FIGHTER_RATIO_DIVISOR;
        expect(C.LATE_GAME_FIGHTER_RATIO).toBeGreaterThan(midGameMin);
    });

    it('late-game fighter ratio is at most 100%', () => {
        expect(C.LATE_GAME_FIGHTER_RATIO).toBeLessThanOrEqual(1.0);
    });
});

// ── Timing ────────────────────────────────────────────────────────────────────

describe('timing', () => {
    it('game tick interval is 200–2000 ms (responsive but not overwhelming)', () => {
        expect(C.GAME_TICK_MS).toBeGreaterThanOrEqual(200);
        expect(C.GAME_TICK_MS).toBeLessThanOrEqual(2000);
    });

    it('one in-game day is 5–120 real seconds', () => {
        const dayMs = C.DAY_TICKS * C.GAME_TICK_MS;
        expect(dayMs).toBeGreaterThanOrEqual(5_000);
        expect(dayMs).toBeLessThanOrEqual(120_000);
    });

    it('death blink is at least 2 ticks (visually noticeable)', () => {
        expect(C.DEATH_BLINK_TICKS).toBeGreaterThanOrEqual(2);
    });
});

// ── Projectile speeds ─────────────────────────────────────────────────────────

describe('projectile speeds', () => {
    it('all speed factors are positive', () => {
        expect(C.PROJECTILE_SPEED_NORMAL).toBeGreaterThan(0);
        expect(C.PROJECTILE_SPEED_CANNON).toBeGreaterThan(0);
        expect(C.PROJECTILE_SPEED_SLOW).toBeGreaterThan(0);
    });

    it('cannon and slow are not faster than normal', () => {
        expect(C.PROJECTILE_SPEED_CANNON).toBeLessThanOrEqual(C.PROJECTILE_SPEED_NORMAL);
        expect(C.PROJECTILE_SPEED_SLOW).toBeLessThanOrEqual(C.PROJECTILE_SPEED_NORMAL);
    });

    it('slowest projectile travels in at most 30 sub-ticks (visible travel time)', () => {
        // STEP = SPEED_SLOW * (SPEED_NORMAL/SUB_TICKS), travel time = 1/STEP sub-ticks
        const stepSlow = (C.PROJECTILE_SPEED_SLOW * C.PROJECTILE_SPEED_NORMAL) / C.SUB_TICKS;
        const travelSubTicks = 1 / stepSlow;
        expect(travelSubTicks).toBeLessThanOrEqual(30);
    });
});
