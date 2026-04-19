import { ObjectType, RobotGoal, Owner, Direction, CW_DIRS } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import type { ShipState } from '../../game/ship/types';
import { ActionType, RotateDir, type RobotAction } from '../../game/actions';
import { calcHealth, calcRobotHeight, WEAPON_RANGE, WEAPON_DAMAGE } from '../../data/robot';
import { ROBOT_HEIGHT } from '../../game/core/occupancy';
import type { Weapon } from '../../data/robot';
import { HOVER_DISTANCE, ORDERABLE_GOALS, GOAL_LABELS } from './constants';

// ─── Life / health ────────────────────────────────────────────────────────────

/**
 * Returns true if the robot with the given id is still present in the warMap
 * and has not started its death animation.
 */
export function isRobotAlive(warMap: WarMap, robotId: string | null): boolean {
    if (!robotId) return false;
    const obj = warMap.objects.find(o => o.id === robotId) as RobotObject | undefined;
    return !!obj && obj.dyingTicks === undefined;
}

/**
 * Returns the robot's current health as a rounded percentage of its maximum.
 * Returns 0 if config is missing or max health is zero.
 */
export function getRobotHealthPercent(robot: RobotObject): number {
    const maxHealth = calcHealth(robot.robotConfig);
    if (!maxHealth) return 0;
    return Math.max(0, Math.round((robot.health / maxHealth) * 100));
}

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Returns the first live robot owned by `owner` that the ship is hovering over,
 * or null if none qualifies.
 *
 * Proximity uses Chebyshev distance so diagonal approach works naturally.
 * The ship must be at or below the robot's own calcRobotHeight — the same
 * value the physics uses as the floor, so any robot the ship rests on triggers.
 */
export function findRobotUnderShip(
    warMap: WarMap,
    ship: ShipState,
    owner: Owner,
): RobotObject | null {
    for (const obj of warMap.objects) {
        if (obj.type !== ObjectType.ROBOT) continue;
        if (obj.owner !== owner) continue;
        if ((obj as RobotObject).dyingTicks !== undefined) continue;
        const dx = Math.abs(ship.x - obj.x);
        const dy = Math.abs(ship.y - obj.y);
        if (Math.max(dx, dy) > HOVER_DISTANCE) continue;
        const robotHeight = calcRobotHeight((obj as RobotObject).robotConfig);
        if (ship.height <= robotHeight) return obj as RobotObject;
    }
    return null;
}

// ─── Goal management ──────────────────────────────────────────────────────────

/**
 * Advances the robot's goal to the next entry in ORDERABLE_GOALS.
 * If the current goal is not in the list, starts from the beginning.
 */
export function cycleRobotGoal(robot: RobotObject): void {
    const idx = ORDERABLE_GOALS.indexOf(robot.goal);
    robot.goal = ORDERABLE_GOALS[(idx + 1) % ORDERABLE_GOALS.length];
}

/**
 * Switches the robot to DEFEND mode and clears its move-out target so it
 * stops in place immediately. Represents "manual control" hand-off.
 */
export function setManualControl(robot: RobotObject): void {
    robot.goal = RobotGoal.DEFEND;
    if (robot.nav) robot.nav.moveOutTarget = undefined;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Human-readable label for the robot's current goal. */
export function getGoalLabel(goal: RobotGoal | undefined): string {
    return GOAL_LABELS[goal ?? RobotGoal.ATTACK_ROBOTS] ?? 'Unknown';
}

/**
 * Sets MOVE_FORWARD or MOVE_BACKWARD goal on the robot.
 * "Forward" means toward the enemy base: east for RED, west for BLUE.
 * The robot stops and switches to DEFEND once it reaches the target tile.
 */
/**
 * Returns the action that moves the robot one step in `targetDir`:
 * - If already facing that direction → MOVE
 * - Otherwise → ROTATE toward it (shortest path)
 */
export function buildDirectionAction(robot: RobotObject, targetDir: Direction): RobotAction {
    const facing = robot.facing;
    if (facing === targetDir) return { type: ActionType.MOVE, direction: targetDir };
    const steps = (CW_DIRS.indexOf(targetDir) - CW_DIRS.indexOf(facing) + 4) % 4;
    return { type: ActionType.ROTATE, direction: steps <= 2 ? RotateDir.RIGHT : RotateDir.LEFT };
}

const FACING_VECTOR: Record<Direction, { dx: number; dy: number }> = {
    [Direction.E]: {  dx: 1,  dy: 0 },
    [Direction.W]: {  dx: -1, dy: 0 },
    [Direction.S]: {  dx: 0,  dy: 1 },
    [Direction.N]: {  dx: 0,  dy: -1 },
};

/**
 * Finds the nearest live enemy robot in the robot's forward half-plane.
 * Returns null if no enemy is ahead — the robot must rotate to face one first.
 */
function findNearestEnemy(robot: RobotObject, warMap: WarMap): { target: RobotObject; dist: number } | null {
    const fv = FACING_VECTOR[robot.facing];
    let best: RobotObject | null = null;
    let bestDist = Infinity;

    for (const obj of warMap.objects) {
        if (obj.type !== ObjectType.ROBOT) continue;
        if (obj.owner === robot.owner) continue;
        if ((obj as RobotObject).dyingTicks !== undefined) continue;
        const dx = obj.x - robot.x;
        const dy = obj.y - robot.y;
        // dot product > 0 means enemy is in the forward half-plane
        if (dx * fv.dx + dy * fv.dy <= 0) continue;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < bestDist) { best = obj as RobotObject; bestDist = dist; }
    }

    return best ? { target: best, dist: bestDist } : null;
}

/**
 * Returns a FIRE action using the best available weapon (highest damage). 
 * TargetId is omitted to fire straight ahead. Returns null if no weapons.
 */
export function buildFireAction(robot: RobotObject, warMap: WarMap): RobotAction | null {
    const weapons = robot.robotConfig.weapons ?? [];
    if (weapons.length === 0) return null;
    
    // Always select the highest damage weapon for manual fire
    const weapon = weapons.reduce((best: Weapon, w: Weapon) => 
        (WEAPON_DAMAGE[w] ?? 0) > (WEAPON_DAMAGE[best] ?? 0) ? w : best
    );

    return { type: ActionType.FIRE, weapon };
}

/**
 * Returns a FIRE action using the specified weapon straight ahead.
 */
export function buildFireActionForWeapon(robot: RobotObject, warMap: WarMap, weapon: Weapon): RobotAction | null {
    return { type: ActionType.FIRE, weapon };
}

/** Assigns one of the orderable goals to the robot, clearing any waypoint position. */
export function setRobotGoal(robot: RobotObject, goal: RobotGoal): void {
    robot.goal = goal;
    robot.goalPosition = undefined;
}

export function setMoveGoal(robot: RobotObject, forward: boolean, distance: number): void {
    const dir = (robot.owner === Owner.RED) ? 1 : -1;
    const dx = forward ? dir * distance : -dir * distance;
    robot.goal = forward ? RobotGoal.MOVE_FORWARD : RobotGoal.MOVE_BACKWARD;
    robot.goalPosition = { x: robot.x + dx, y: robot.y };
}

// ─── Ship height management ───────────────────────────────────────────────────

/**
 * Gap between the robot's visual top and the ship's underside while the
 * control panel is open. The same gap is applied as an upward jump on exit
 * so the ship clears the robot before tickShip resumes descent.
 */
export const HOVER_GAP = 0.5;

/**
 * Sets ship.height so the ship hovers exactly HOVER_GAP above the robot's
 * calcRobotHeight. Called both when the control panel opens and each tick
 * while it remains open (so the ship follows the robot if it moves).
 */
export function setHoverHeight(
    ship: { height: number },
    robot: RobotObject,
): void {
    ship.height = calcRobotHeight(robot.robotConfig) + HOVER_GAP;
}

/**
 * Bumps ship.height by HOVER_GAP when the player exits robot control.
 * Gives the ship a small upward nudge so it doesn't immediately clip back
 * into the robot's top part before tickShip resumes control of descent.
 */
export function applyExitBump(ship: { height: number }): void {
    ship.height += HOVER_GAP;
}

/** Short description of the robot's loadout (chassis + weapons). */
export function getRobotDescription(config: RobotObject['robotConfig']): string {
    if (!config) return 'Unknown Robot';
    const chassis = config.chassis.charAt(0).toUpperCase() + config.chassis.slice(1);
    const parts: string[] = [];
    for (const w of config.weapons ?? []) {
        parts.push(w.charAt(0).toUpperCase() + w.slice(1));
    }
    if (config.nuclear) parts.push('Nuclear');
    if (parts.length === 0) parts.push('Unarmed');
    return `${chassis} / ${parts.join(' + ')}`;
}
