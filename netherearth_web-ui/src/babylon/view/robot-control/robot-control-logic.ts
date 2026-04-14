import { ObjectType, RobotGoal, Owner } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import type { ShipState } from '../../game/ship/types';
import { HOVER_DISTANCE, HOVER_HEIGHT, ORDERABLE_GOALS, GOAL_LABELS } from './constants';

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

/** Short description of the robot's loadout (chassis + primary weapon). */
export function getRobotDescription(config: RobotObject['robotConfig']): string {
    if (!config) return 'Unknown Robot';
    const chassis = config.chassis.charAt(0).toUpperCase() + config.chassis.slice(1);
    const weapon = config.weapon
        ? config.weapon.charAt(0).toUpperCase() + config.weapon.slice(1)
        : config.nuclear ? 'Nuclear' : 'Unarmed';
    return `${chassis} / ${weapon}`;
}
