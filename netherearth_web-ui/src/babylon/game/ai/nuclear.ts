import { ObjectType, Owner } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';

/**
 * Evaluates whether a robot should detonate its nuclear bomb.
 * Returns true if the robot decides to detonate.
 *
 * Rules:
 * - Must be equipped with a nuclear bomb.
 * - Detonates randomly (10% chance per tick when conditions are met)
 *   OR if the robot is considered "stuck" (not implemented here directly, but could be passed in).
 * - MUST kill at least one enemy robot, or an enemy/neutral factory, or enemy/neutral warbase in the 3x3 kill zone.
 */
export function shouldDetonateNuclear(robot: RobotObject, warMap: WarMap, isStuck: boolean = false): boolean {
    if (!robot.robotConfig?.nuclear) return false;

    // Check if we hit the random chance OR we're stuck
    // If not stuck, we only have a small random chance to consider blowing up.
    // At 500ms/tick, 0.05 is 5% per tick, so ~10% per second.
    if (!isStuck && Math.random() > 0.05) {
        return false;
    }

    const rx = Math.round(robot.x);
    const ry = Math.round(robot.y);
    const myOwner = robot.owner;

    let hasValuableTarget = false;

    for (const obj of warMap.objects) {
        if (obj === robot) continue;

        if (obj.type === ObjectType.ROBOT && obj.owner !== myOwner && obj.owner !== Owner.NEUTRAL) {
            // Check if enemy robot is in 3x3 kill zone
            const chebyshev = Math.max(Math.abs(Math.round(obj.x) - rx), Math.abs(Math.round(obj.y) - ry));
            if (chebyshev <= 1) {
                hasValuableTarget = true;
                break;
            }
        } else if (obj.type === ObjectType.FACTORY || obj.type === ObjectType.WARBASE) {
            // We consider destroying enemy or neutral structures as valuable.
            // Destroying our own structures is not valuable.
            if (obj.owner === myOwner) continue;

            let intersects = false;
            const width = obj.type === ObjectType.FACTORY ? 2 : 5;
            const height = 3;

            for (let bx = Math.round(obj.x); bx < Math.round(obj.x) + width; bx++) {
                for (let by = Math.round(obj.y); by < Math.round(obj.y) + height; by++) {
                    if (Math.abs(bx - rx) <= 1 && Math.abs(by - ry) <= 1) {
                        intersects = true;
                        break;
                    }
                }
                if (intersects) break;
            }

            if (intersects) {
                hasValuableTarget = true;
                break;
            }
        }
    }

    return hasValuableTarget;
}
