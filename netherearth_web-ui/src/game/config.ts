// ─────────────────────────────────────────────────────────────────────────────
// Game configuration — single source of truth for all balance constants.
//
// Change a value here and it takes effect everywhere. Each entry documents
// its unit, valid range, and how it interacts with related constants.
//
// NO imports from game/ or data/ — this file sits at the bottom of the
// dependency graph so any module can safely import from it.
// ─────────────────────────────────────────────────────────────────────────────

// ── Timing ────────────────────────────────────────────────────────────────────

/** Sub-ticks per full game tick.
 * @unit sub-ticks  @range 1–20 */
export const SUB_TICKS = 5;

/** Real-time interval between sub-ticks.
 * @unit ms  @range 50–500 */
export const SUB_TICK_MS = 100;

/** Full game-tick duration in real milliseconds. Derived: SUB_TICKS × SUB_TICK_MS. */
export const GAME_TICK_MS = SUB_TICKS * SUB_TICK_MS; // 500 ms at defaults

/** Game ticks per in-game day. Controls resource income and capture cadence.
 * One day = DAY_TICKS × GAME_TICK_MS ms of real time (20 s at defaults).
 * @unit ticks  @range 10–200 */
export const DAY_TICKS = 40;

/** Death-blink animation length. Show/hide alternates each tick; robot is removed after.
 * 6 ticks = 3 visible blinks.
 * @unit ticks  @range 2–20 */
export const DEATH_BLINK_TICKS = 6;

// ── Movement ──────────────────────────────────────────────────────────────────

/** Grid cells moved per MOVE action.
 * @unit cells  @range 0.1–1.0 */
export const MOVE_STEP = 0.25;

/** Number of MOVE actions needed to cross one full grid cell. Derived: 1 / MOVE_STEP. */
export const STEPS_PER_CELL = Math.round(1 / MOVE_STEP); // 4 at defaults

/** Minimum ticks between consecutive MOVE actions.
 * At 500 ms/tick, MOVE_COOLDOWN=2 → 1 move/s.
 * @unit ticks  @range 1–10 */
export const MOVE_COOLDOWN = 2;

/** Minimum ticks between consecutive ROTATE actions.
 * At 500 ms/tick, ROTATE_COOLDOWN=4 → 1 rotation/2 s.
 * @unit ticks  @range 1–10 */
export const ROTATE_COOLDOWN = 4;

// ── Sight ─────────────────────────────────────────────────────────────────────

/** Cells a robot with standard electronics can see an enemy in its forward direction.
 * Affects when fightAction() fires vs. continues navigating.
 * @unit cells  @range 3–20 */
export const SIGHT_RANGE_STANDARD = 8;

// ── Weapon stats ──────────────────────────────────────────────────────────────

/** HP dealt to the target per hit at point-blank range (dist ≤ 1).
 * Damage scales down to DAMAGE_FALLOFF_BASE × this value at max range.
 * Keys match Weapon enum string values.
 * @unit HP/shot  @range 1–20 per weapon */
export const WEAPON_DAMAGE = {
    cannon:   4,   // cheap; medium rate of fire
    missiles: 6,   // long range; slowest fire rate
    phasers:  8,   // highest DPS; expensive to build
} as const;

/** Maximum fire range. Targets further away cannot be hit.
 * @unit cells  @range 2–15 per weapon */
export const WEAPON_RANGE = {
    cannon:   5,
    missiles: 7,   // longest range in the game
    phasers:  5,
} as const;

/** Minimum game ticks between consecutive shots.
 * Effective DPS ≈ WEAPON_DAMAGE / WEAPON_COOLDOWN.
 * @unit ticks  @range 1–20 per weapon */
export const WEAPON_COOLDOWN = {
    phasers:  6,   // highest DPS — phasers are the premium weapon
    cannon:   7,
    missiles: 12,  // long range trades against fire rate
} as const;

/** Damage multiplier at maximum range (falloff floor).
 * Scales linearly from 1.0 at dist=1 down to this value at dist=maxRange.
 * @range 0.0–1.0 */
export const DAMAGE_FALLOFF_BASE = 0.4;

// ── Robot HP ──────────────────────────────────────────────────────────────────

/** HP contributed by the chassis (always present; added first).
 * Keys match Chassis enum string values.
 * @unit HP  @range 1–50 per chassis */
export const CHASSIS_HP = {
    tracks:   15,  // tankiest chassis
    antigrav: 10,  // fragile — pays for universal terrain passability
    bipod:    12,
} as const;

/** HP contributed by each weapon module (stacks additively).
 * @unit HP  @range 1–60 per weapon */
export const WEAPON_HP = {
    cannon:   30,
    missiles: 42,  // heaviest weapon module
    phasers:  25,
} as const;

/** HP contributed by the electronics module.
 * Key matches Electronics enum string value ('electronics').
 * @unit HP  @range 1–20 */
export const ELECTRONICS_HP = {
    electronics: 5,
} as const;

/** HP contributed by the nuclear module.
 * @unit HP  @range 1–30 */
export const NUCLEAR_HP = 18;

// ── Build costs ───────────────────────────────────────────────────────────────

/** Chassis resource cost per chassis type.
 * Keys match Chassis enum string values.
 * @unit chassis resources  @range 1–10 */
export const CHASSIS_COST = {
    tracks:   1,
    antigrav: 2,
    bipod:    3,
} as const;

/** Weapon-specific resource cost per weapon type.
 * Each weapon consumes its own resource: cannon→cannons, missiles→missiles, phasers→phasers.
 * Keys match Weapon enum string values.
 * @range 1–10 per weapon */
export const WEAPON_COST = {
    cannon:   1,
    missiles: 2,
    phasers:  3,
} as const;

/** Electronics resource cost.
 * @unit electronics resources  @range 1–5 */
export const ELECTRONICS_COST = 1;

/** Nuclear module resource cost.
 * @unit nuclear resources  @range 1–5 */
export const NUCLEAR_COST = 2;

/** Warbase build cooldown expressed as in-game days.
 * @range 1.0–10.0 days */
export const BUILD_COOLDOWN_DAYS = 2.5;

/** Ticks a warbase must wait between consecutive robot builds. Derived: BUILD_COOLDOWN_DAYS × DAY_TICKS. */
export const BUILD_COOLDOWN_BLUE = Math.round(BUILD_COOLDOWN_DAYS * DAY_TICKS); // 100 ticks at defaults

// ── AI — army composition ─────────────────────────────────────────────────────

/** Build only captors (no fighters) until this many robots are alive.
 * After this threshold, the fighter/captor mix kicks in.
 * @range 0–50 */
export const EARLY_GAME_CAPTORS_LIMIT = 10;

/** Fighter ratio denominator for the mid-game maintenance rule.
 * The AI always ensures ≥ 1 fighter per FIGHTER_RATIO_DIVISOR robots total.
 * @range 2–10 */
export const FIGHTER_RATIO_DIVISOR = 3;

/** Late-game target fraction of the army that should be fighters (0.0–1.0).
 * Reached when no neutral structures remain.
 * Must be > 1/FIGHTER_RATIO_DIVISOR so the late-game rule is reachable.
 * @range 0.0–1.0 */
export const LATE_GAME_FIGHTER_RATIO = 0.5;

// ── Resources ─────────────────────────────────────────────────────────────────

/** Starting amount of every resource type for both players at game begin.
 * @unit resources  @range 0–50 */
export const INITIAL_RESOURCES = 5;

/** Common resources earned per owned warbase per in-game day.
 * @unit resources/day  @range 1–20 */
export const WARBASE_INCOME = 4;

/** Specific resources earned per owned factory per in-game day.
 * @unit resources/day  @range 1–10 */
export const FACTORY_INCOME = 2;

// ── Capture ───────────────────────────────────────────────────────────────────

/** In-game days a robot must hold the factory capture zone to claim it.
 * Actual tick cost = FACTORY_CAPTURE_DAYS × DAY_TICKS.
 * @unit days  @range 1–10 */
export const FACTORY_CAPTURE_DAYS = 1;

/** In-game days a robot must hold the warbase capture zone to claim it.
 * Must be > FACTORY_CAPTURE_DAYS (warbases are higher-value targets).
 * @unit days  @range 2–20 */
export const WARBASE_CAPTURE_DAYS = 3;

// ── Nuclear ───────────────────────────────────────────────────────────────────

/** Chebyshev radius of the instant-kill zone. At radius=1 the blast covers a 3×3 area.
 * @unit cells  @range 1–3 */
export const NUKE_KILL_RADIUS = 1;

/** Chebyshev radius of the outer damage zone. Must be > NUKE_KILL_RADIUS.
 * At radius=2 the outer ring is 5×5 minus the 3×3 kill zone.
 * @unit cells  @range 2–5 */
export const NUKE_DAMAGE_RADIUS = 2;

/** Health fraction remaining after an outer-zone nuclear hit.
 * 0.5 → robot keeps 50% of current HP (takes 50% damage). Lower = more damage.
 * @range 0.0–1.0 */
export const NUKE_OUTER_HP_FRACTION = 0.5;

/** Probability per game tick that a nuclear robot considers detonating (random trigger).
 * Expected time to consider: 1/NUKE_DETONATE_CHANCE ticks.
 * At 500 ms/tick, 0.05 → expected ~20 ticks / 10 real seconds.
 * @range 0.01–0.5 */
export const NUKE_DETONATE_CHANCE = 0.05;

// ── Terrain degradation ───────────────────────────────────────────────────────

/** Cumulative kills at a cell to convert GRASS → SAND. Must equal 1.
 * @unit kills  @range 1–5 */
export const SAND_THRESHOLD = 1;

/** Cumulative kills at a cell to convert SAND → MOUNTAIN. Must be > SAND_THRESHOLD.
 * @unit kills  @range 2–15 */
export const MOUNTAIN_THRESHOLD = 4;

/** Cumulative kills at a cell to spawn a WALL on MOUNTAIN. Must be > MOUNTAIN_THRESHOLD.
 * @unit kills  @range 3–30 */
export const WALL_THRESHOLD = 7;

// ── Projectile speed ──────────────────────────────────────────────────────────

/** Base travel speed factor for projectiles (relative to 1/SUB_TICKS per sub-tick).
 * A factor of 1.0 → full travel in SUB_TICKS sub-ticks.
 * @range 0.25–1.0 */
export const PROJECTILE_SPEED_NORMAL = 1.0;

/** Speed factor for cannon projectiles relative to PROJECTILE_SPEED_NORMAL.
 * 0.5 → travels in 2×SUB_TICKS sub-ticks (10 sub-ticks at SUB_TICKS=5).
 * @range 0.1–1.0 */
export const PROJECTILE_SPEED_CANNON = 0.5;

/** Speed factor for missile and phaser projectiles relative to PROJECTILE_SPEED_NORMAL.
 * 0.25 → travels in 4×SUB_TICKS sub-ticks (20 sub-ticks at SUB_TICKS=5).
 * @range 0.1–1.0 */
export const PROJECTILE_SPEED_SLOW = 0.25;

// ── AI — navigation ───────────────────────────────────────────────────────────

/** Manhattan distance threshold to detect that a robot is at its warbase spawn point.
 * @unit cells  @range 0.05–1.0 */
export const SPAWN_PROXIMITY = 0.2;

/** Cells to move away from spawn before switching to goal-directed navigation.
 * Should exceed the warbase footprint depth so robots clear the structure.
 * @unit cells  @range 2–10 */
export const MOVEOUT_DISTANCE = 4;

/** Manhattan distance to consider a waypoint goal reached (switches to DEFEND).
 * @unit cells  @range 0.1–1.0 */
export const WAYPOINT_ARRIVAL_DIST = 0.3;

/** Manhattan distance to consider the move-out target reached.
 * @unit cells  @range 0.05–0.5 */
export const MOVEOUT_ARRIVAL_DIST = 0.1;

/** Minimum Manhattan distance from spawn before move-out is forced complete.
 * @unit cells  @range 1–10 */
export const MOVEOUT_MIN_DIST_FROM_SPAWN = 3;

/** Maximum cells a robot may retreat from its furthest-forward position during wall-follow
 * before falling back to goal-mode navigation.
 * @unit cells  @range 2–20 */
export const MAX_BACKTRACK = 4;

/** Consecutive ticks blocked in the primary direction before activating wall-follow.
 * @unit ticks  @range 1–10 */
export const STUCK_TICKS = 3;
