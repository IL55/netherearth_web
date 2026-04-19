import { ActionType, RotateDir, type RobotAction } from '../../game/actions';
import { WEAPON_DAMAGE } from '../../data/robot';
import type { Weapon } from '../../data/robot';
import { Direction, CW_DIRS } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';

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
