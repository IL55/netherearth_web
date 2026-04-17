import { ObjectType } from '../core/warmap';
import { Direction } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';
import { Weapon, WEAPON_DAMAGE, WEAPON_RANGE, WEAPON_COOLDOWN, calcDamageFalloff } from '../../data/robot';
import { spawnProjectile } from '../mechanics/projectile';

function directionToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? Direction.E: Direction.W;
    return dy > 0 ? Direction.S: Direction.N;
}

const FACING_VECTOR: Record<Direction, { dx: number; dy: number }> = {
    [Direction.E]: {  dx: 1,  dy: 0 },
    [Direction.W]: {  dx: -1, dy: 0 },
    [Direction.S]: {  dx: 0,  dy: 1 },
    [Direction.N]: {  dx: 0,  dy: -1 },
};

import type { OccupancyMap } from '../core/occupancy';

function findRaycastHit(
    robot: RobotObject, 
    warMap: WarMap, 
    occupancy: OccupancyMap, 
    maxRange: number
): { dist: number, hitRobot?: RobotObject } {
    const fv = FACING_VECTOR[robot.facing ?? Direction.E];
    const sx = robot.x;
    const sy = robot.y;
    
    let minDist = maxRange;
    let hitRobot: RobotObject | undefined = undefined;

    // Check structures in the occupancy map
    for (const s of occupancy.structures) {
        if (fv.dx !== 0) { // Horizontal ray
            if (sy >= s.y0 && sy <= s.y1) { // Ray crosses structure's Y
                if (fv.dx > 0 && s.x0 >= sx) { // Facing East
                    if (s.x0 - sx < minDist) minDist = s.x0 - sx;
                } else if (fv.dx < 0 && s.x1 <= sx) { // Facing West
                    if (sx - s.x1 < minDist) minDist = sx - s.x1;
                }
            }
        } else { // Vertical ray
            if (sx >= s.x0 && sx <= s.x1) {
                if (fv.dy > 0 && s.y0 >= sy) { // Facing South
                    if (s.y0 - sy < minDist) minDist = s.y0 - sy;
                } else if (fv.dy < 0 && s.y1 <= sy) { // Facing North
                    if (sy - s.y1 < minDist) minDist = sy - s.y1;
                }
            }
        }
    }

    // Check robots
    for (const r of warMap.objects) {
        if (r.type !== ObjectType.ROBOT) continue;
        if (r.id === robot.id) continue;
        if ((r as RobotObject).dyingTicks !== undefined) continue;

        const rx = r.x;
        const ry = r.y;
        // Assume robot collision box is 1x1
        const x0 = rx - 0.5;
        const x1 = rx + 0.5;
        const y0 = ry - 0.5;
        const y1 = ry + 0.5;

        if (fv.dx !== 0) { // Horizontal
            if (sy >= y0 && sy <= y1) {
                if (fv.dx > 0 && x0 >= sx) { // East
                    if (x0 - sx < minDist) { minDist = x0 - sx; hitRobot = r as RobotObject; }
                } else if (fv.dx < 0 && x1 <= sx) { // West
                    if (sx - x1 < minDist) { minDist = sx - x1; hitRobot = r as RobotObject; }
                }
            }
        } else { // Vertical
            if (sx >= x0 && sx <= x1) {
                if (fv.dy > 0 && y0 >= sy) { // South
                    if (y0 - sy < minDist) { minDist = y0 - sy; hitRobot = r as RobotObject; }
                } else if (fv.dy < 0 && y1 <= sy) { // North
                    if (sy - y1 < minDist) { minDist = sy - y1; hitRobot = r as RobotObject; }
                }
            }
        }
    }

    return { dist: minDist, hitRobot };
}

export function applyFire(
    robot: RobotObject,
    targetId: string | undefined, // Not heavily used anymore, but kept for signature
    warMap: WarMap,
    occupancy: OccupancyMap,
    weapon: Weapon,
): boolean {
    robot.weaponReadyAt = (warMap.tick ?? 0) + (WEAPON_COOLDOWN[weapon] ?? 3);
    const maxRange = WEAPON_RANGE[weapon] ?? 1;

    // Fire perfectly straight along the axis the robot is facing, 
    // stopping at the first robot or structure.
    const { dist, hitRobot } = findRaycastHit(robot, warMap, occupancy, maxRange);

    if (hitRobot) {
        if (hitRobot.health !== undefined) {
            const baseDmg  = WEAPON_DAMAGE[weapon] ?? 0;
            const dmg      = Math.round(baseDmg * calcDamageFalloff(dist, maxRange));
            hitRobot.health  = Math.max(0, hitRobot.health - dmg);
        }
        hitRobot.facing = directionToward(hitRobot.x, hitRobot.y, robot.x, robot.y);
    }

    // Always spawn a projectile going exactly straight, ending at `dist`
    const fv = FACING_VECTOR[robot.facing ?? Direction.E];
    const dummyTarget = {
        ...robot, // to satisfy RobotObject type
        x: robot.x + fv.dx * dist,
        y: robot.y + fv.dy * dist,
    } as RobotObject;
    
    spawnProjectile(warMap, robot, dummyTarget, weapon);
    
    return true;
}
