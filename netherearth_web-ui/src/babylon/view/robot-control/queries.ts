import { calcHealth } from '../../data/robot';
import { RobotGoal } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import { GOAL_LABELS } from './constants';

// ─── Life / health ────────────────────────────────────────────────────────────

/**
 * Returns true if the robot with the given id is still present in the warMap
 * and has not started its death animation.
 */
export function isRobotAlive(warMap: WarMap, robotId: string | null): boolean {
    if (!robotId) return false;
    const obj = warMap.robots.find(o => o.id === robotId);
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

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Human-readable label for the robot's current goal. */
export function getGoalLabel(goal: RobotGoal | undefined): string {
    return GOAL_LABELS[goal ?? RobotGoal.ATTACK_ROBOTS] ?? 'Unknown';
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
