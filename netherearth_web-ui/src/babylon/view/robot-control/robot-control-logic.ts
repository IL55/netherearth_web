import { ObjectType, RobotGoal, Owner, Direction, CW_DIRS } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import type { ShipState } from '../../game/ship/types';
import { ActionType, RotateDir, type RobotAction } from '../../game/actions';
import { calcHealth } from '../../data/robot';
import { HOVER_DISTANCE, HOVER_HEIGHT, ORDERABLE_GOALS, GOAL_LABELS } from './constants';

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
    if (!robot.robotConfig) return 0;
    const maxHealth = calcHealth(robot.robotConfig);
    if (!maxHealth) return 0;
    return Math.max(0, Math.round(((robot.health ?? 0) / maxHealth) * 100));
}

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Returns the first live robot owned by `owner` that the ship is hovering over,
 * or null if none qualifies.
 *
 * Proximity uses Chebyshev distance so diagonal approach works naturally.
 * Height must be at or below HOVER_HEIGHT (ship flying low, not ascending).
 */
export function findRobotUnderShip(
    warMap: WarMap,
    ship: ShipState,
    owner: Owner,
): RobotObject | null {
    if (ship.height > HOVER_HEIGHT) return null;
    for (const obj of warMap.objects) {
        if (obj.type !== ObjectType.ROBOT) continue;
        if (obj.owner !== owner) continue;
        if ((obj as RobotObject).dyingTicks !== undefined) continue;
        const dx = Math.abs(ship.x - obj.x);
        const dy = Math.abs(ship.y - obj.y);
        if (Math.max(dx, dy) <= HOVER_DISTANCE) return obj as RobotObject;
    }
    return null;
}

// ─── Goal management ──────────────────────────────────────────────────────────

/**
 * Advances the robot's goal to the next entry in ORDERABLE_GOALS.
 * If the current goal is not in the list, starts from the beginning.
 */
export function cycleRobotGoal(robot: RobotObject): void {
    const idx = ORDERABLE_GOALS.indexOf(robot.goal ?? RobotGoal.ATTACK_ROBOTS);
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
    const facing = robot.facing ?? Direction.N;
    if (facing === targetDir) return { type: ActionType.MOVE, direction: targetDir };
    const steps = (CW_DIRS.indexOf(targetDir) - CW_DIRS.indexOf(facing) + 4) % 4;
    return { type: ActionType.ROTATE, direction: steps <= 2 ? RotateDir.RIGHT : RotateDir.LEFT };
}

/**
 * Returns a FIRE action targeting the nearest live enemy robot, or null if none exist.
 */
export function buildFireAction(robot: RobotObject, warMap: WarMap): RobotAction | null {
    let nearest: RobotObject | null = null;
    let nearestDist = Infinity;
    for (const obj of warMap.objects) {
        if (obj.type !== ObjectType.ROBOT) continue;
        if (obj.owner === robot.owner) continue;
        if ((obj as RobotObject).dyingTicks !== undefined) continue;
        const dist = Math.abs(obj.x - robot.x) + Math.abs(obj.y - robot.y);
        if (dist < nearestDist) { nearest = obj as RobotObject; nearestDist = dist; }
    }
    if (!nearest) return null;
    return { type: ActionType.FIRE, targetId: nearest.id };
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

/** Short description of the robot's loadout (chassis + primary weapon). */
export function getRobotDescription(config: RobotObject['robotConfig']): string {
    if (!config) return 'Unknown Robot';
    const chassis = config.chassis.charAt(0).toUpperCase() + config.chassis.slice(1);
    const weapon = config.weapon
        ? config.weapon.charAt(0).toUpperCase() + config.weapon.slice(1)
        : config.nuclear ? 'Nuclear' : 'Unarmed';
    return `${chassis} / ${weapon}`;
}
