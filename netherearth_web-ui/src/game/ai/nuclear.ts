import { ObjectType, Owner } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';
import {
    NUKE_KILL_RADIUS,
    FACTORY_FOOTPRINT_WIDTH, WARBASE_FOOTPRINT_WIDTH, STRUCTURE_FOOTPRINT_HEIGHT,
} from '../actions/apply-nuclear';

import { NUKE_DETONATE_CHANCE } from '../config';

/**
 * Evaluates whether a robot should detonate its nuclear bomb.
 * Returns true if the robot decides to detonate.
 *
 * Rules:
 * - Must be equipped with a nuclear bomb.
 * - Detonates randomly (5% per tick, ~10% per second at 500ms game ticks)
 *   OR if the robot is considered "stuck" (not implemented here directly, but could be passed in).
 * - MUST kill at least one enemy robot, or an enemy/neutral factory, or enemy/neutral warbase in the 3x3 kill zone.
 */
export function shouldDetonateNuclear(robot: RobotObject, warMap: WarMap, isStuck: boolean = false): boolean {
    if (!robot.robotConfig.nuclear) return false;

    // Check if we hit the random chance OR we're stuck
    // If not stuck, we only have a small random chance to consider blowing up.
    // At 500ms/tick, 0.05 is 5% per tick, so ~10% per second.
    if (!isStuck && Math.random() > NUKE_DETONATE_CHANCE) {
        return false;
    }

    const rx = Math.round(robot.x);
    const ry = Math.round(robot.y);
    const myOwner = robot.owner;

    let hasValuableTarget = false;

    for (const obj of warMap.robots) {
        if (obj === robot) continue;

        if (obj.owner !== myOwner && obj.owner !== Owner.NEUTRAL) {
            // Check if enemy robot is in 3x3 kill zone
            const chebyshev = Math.max(Math.abs(Math.round(obj.x) - rx), Math.abs(Math.round(obj.y) - ry));
            if (chebyshev <= NUKE_KILL_RADIUS) {
                hasValuableTarget = true;
                break;
            }
        }
    }

    if (!hasValuableTarget) {
        for (const obj of warMap.tiles) {
            if (obj.type === ObjectType.FACTORY || obj.type === ObjectType.WARBASE) {
            // We consider destroying enemy or neutral structures as valuable.
            // Destroying our own structures is not valuable.
            if (obj.owner === myOwner) continue;

            let intersects = false;
            const width  = obj.type === ObjectType.FACTORY ? FACTORY_FOOTPRINT_WIDTH : WARBASE_FOOTPRINT_WIDTH;
            const height = STRUCTURE_FOOTPRINT_HEIGHT;

            for (let bx = Math.round(obj.x); bx < Math.round(obj.x) + width; bx++) {
                for (let by = Math.round(obj.y); by < Math.round(obj.y) + height; by++) {
                    if (Math.abs(bx - rx) <= NUKE_KILL_RADIUS && Math.abs(by - ry) <= NUKE_KILL_RADIUS) {
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
    }

    return hasValuableTarget;
}
