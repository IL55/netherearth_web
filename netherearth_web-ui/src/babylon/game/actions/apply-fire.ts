import { Direction } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';
import { ROBOT_HALF_SIZE } from '../core/occupancy';
import type { OccupancyMap } from '../core/occupancy';
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

function findRaycastHit(
    robot: RobotObject, 
    warMap: WarMap, 
    occupancy: OccupancyMap, 
    maxRange: number
): { dist: number, hitRobot?: RobotObject } {
    const fv = FACING_VECTOR[robot.facing];
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
    for (const r of warMap.robots) {
        if (r.id === robot.id) continue;
        if (r.dyingTicks !== undefined) continue;

        const rx = r.x;
        const ry = r.y;
        // Assume robot collision box is 1x1
        const x0 = rx - ROBOT_HALF_SIZE;
        const x1 = rx + ROBOT_HALF_SIZE;
        const y0 = ry - ROBOT_HALF_SIZE;
        const y1 = ry + ROBOT_HALF_SIZE;

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
    warMap: WarMap,
    occupancy: OccupancyMap,
    weapon: Weapon,
): boolean {
    const tick = warMap.tick ?? 0;
    
    // Cannot fire if a projectile is still in the air
    const inFlight = warMap.projectiles?.some(p => p.ownerId === robot.id) ?? false;
    if (inFlight) return false;
    
    // Cannot fire if weapon is still reloading
    if (tick < (robot.weaponReadyAt ?? 0)) return false;

    robot.weaponReadyAt = tick + (WEAPON_COOLDOWN[weapon] ?? 3);
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
    const fv = FACING_VECTOR[robot.facing];
    spawnProjectile(warMap, robot, { x: robot.x + fv.dx * dist, y: robot.y + fv.dy * dist }, weapon);
    
    return true;
}
