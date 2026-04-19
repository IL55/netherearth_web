import type { Owner, WarMap, RobotObject } from '../../game/core/warmap';
import type { ShipState } from '../../game/ship/types';
import { calcRobotHeight } from '../../data/robot';
import { HOVER_DISTANCE, HOVER_GAP } from './constants';

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
    for (const obj of warMap.robots) {
        if (obj.owner !== owner) continue;
        if (obj.dyingTicks !== undefined) continue;
        const dx = Math.abs(ship.x - obj.x);
        const dy = Math.abs(ship.y - obj.y);
        if (Math.max(dx, dy) > HOVER_DISTANCE) continue;
        const robotHeight = calcRobotHeight(obj.robotConfig);
        if (ship.height <= robotHeight) return obj;
    }
    return null;
}

// ─── Ship height management ───────────────────────────────────────────────────

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
