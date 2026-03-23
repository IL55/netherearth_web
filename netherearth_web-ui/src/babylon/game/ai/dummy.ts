import type { WarMap, WarObject } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { isOccupied, isLOSBlocked } from '../occupancy';
import { type RobotAction, type Direction, rotationToDirection, directionToRotation, MOVE_STEP } from '../actions';
import { CAPTURE_ZONES } from '../capture';
import { SIGHT_RANGE, WEAPON_RANGE, WEAPON_COOLDOWN } from '../../data/robot';
import { getTerrainRule, chassisTypeOf } from '../terrain';

const ALL_DIRS: Direction[] = ['N', 'E', 'S', 'W'];

function tileAt(warMap: WarMap, x: number, y: number): string {
    return warMap.objects.find(
        o => o.type === 'tile' && o.x === Math.floor(x) && o.y === Math.floor(y),
    )?.subtype ?? 'G';
}

// Clockwise (right-hand) rotation helpers used by wall-follow mode
function rightOf(d: Direction): Direction { return ({ N:'E', E:'S', S:'W', W:'N' } as Record<Direction,Direction>)[d]; }
function leftOf (d: Direction): Direction { return ({ N:'W', W:'S', S:'E', E:'N' } as Record<Direction,Direction>)[d]; }
function backOf (d: Direction): Direction { return ({ N:'S', S:'N', E:'W', W:'E' } as Record<Direction,Direction>)[d]; }

// Find the nearest living enemy robot in the forward direction within sight range.
// Returns undefined if none found or if LOS is blocked by a structure.
function scanForwardEnemy(
    robot: WarObject,
    dir: Direction,
    sightRange: number,
    warMap: WarMap,
    occupancy: OccupancyMap,
): WarObject | undefined {
    const enemies = warMap.objects.filter(
        o => o.type === 'robot' && o.owner !== robot.owner && o.dyingTicks === undefined,
    );

    // Filter to enemies ahead on the forward axis within sight range, allowing ±0.5 lateral drift
    const inSight = enemies.filter(e => {
        const dx = e.x - robot.x;
        const dy = e.y - robot.y;
        let along: number, perp: number;
        if      (dir === 'E') { along =  dx; perp = Math.abs(dy); }
        else if (dir === 'W') { along = -dx; perp = Math.abs(dy); }
        else if (dir === 'S') { along =  dy; perp = Math.abs(dx); }
        else                  { along = -dy; perp = Math.abs(dx); } // N
        return along > 0 && along <= sightRange && perp < 0.5;
    });

    if (inSight.length === 0) return undefined;

    const closest = inSight.reduce((best, e) => {
        const d  = Math.abs(e.x - robot.x) + Math.abs(e.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? e : best;
    });

    return isLOSBlocked(occupancy, robot.x, robot.y, closest.x, closest.y)
        ? undefined
        : closest;
}

function findTarget(robot: WarObject, warMap: WarMap): WarObject | undefined {
    const candidates = warMap.objects.filter(o => {
        if (robot.goal === 'attack_robots')           return o.type === 'robot'   && o.owner !== robot.owner;
        if (robot.goal === 'capture_factory')         return o.type === 'factory' && o.owner !== robot.owner;
        if (robot.goal === 'capture_enemy_factory')   return o.type === 'factory' && o.owner !== undefined && o.owner !== robot.owner;
        if (robot.goal === 'capture_neutral_factory') return o.type === 'factory' && o.owner === undefined;
        if (robot.goal === 'capture_warbase')         return o.type === 'warbase' && o.owner !== robot.owner;
        if (robot.goal === 'capture_enemy_warbase')   return o.type === 'warbase' && o.owner !== undefined && o.owner !== robot.owner;
        if (robot.goal === 'capture_neutral_warbase') return o.type === 'warbase' && o.owner === undefined;
        return false;
    });
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, c) => {
        const d  = Math.abs(c.x - robot.x) + Math.abs(c.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? c : best;
    });
}

// Returns the position the robot should navigate toward.
// For structures with a capture zone (e.g. factory), navigate to the zone center
// so the robot enters the hole rather than walking into the wall.
function targetPos(target: WarObject): { x: number; y: number } {
    const zone = CAPTURE_ZONES[target.type];
    if (zone) return { x: target.x + zone.dx, y: target.y + zone.dy };
    return { x: target.x, y: target.y };
}

function preferredDirs(robot: WarObject, tx: number, ty: number): Direction[] {
    const dx = tx - robot.x;
    const dy = ty - robot.y;
    const primary:   Direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
    const secondary: Direction = Math.abs(dx) >= Math.abs(dy) ? (dy > 0 ? 'S' : 'N') : (dx > 0 ? 'E' : 'W');
    const rest = ALL_DIRS.filter(d => d !== primary && d !== secondary);
    return [primary, secondary, ...rest];
}

// Returns one action per tick.
// Priority: fire (if cooldown elapsed and no shot in flight) → move toward enemy or goal → idle.
export function dummyAI(robot: WarObject, warMap: WarMap, occupancy: OccupancyMap): RobotAction {
    const facing     = rotationToDirection(robot.rotation ?? 0);
    const chassis    = chassisTypeOf(robot.robotConfig?.chassis ?? 'tracks');
    const weapon     = robot.robotConfig?.weapon;
    const weapRange  = weapon ? (WEAPON_RANGE[weapon]  ?? 0) : 0;
    const sightRange = SIGHT_RANGE[robot.robotConfig?.electronics ?? ''] ?? 0;

    if (weapon && sightRange > 0) {
        const enemy = scanForwardEnemy(robot, facing, sightRange, warMap, occupancy);
        if (enemy) {
            const dist = Math.abs(enemy.x - robot.x) + Math.abs(enemy.y - robot.y);

            // Fire if in range and weapon is ready
            if (dist <= weapRange) {
                const cooldown  = WEAPON_COOLDOWN[weapon] ?? 3;
                const inFlight  = warMap.projectiles?.some(p => p.ownerId === robot.id) ?? false;
                const lastFired = robot.lastFiredAt ?? -(cooldown + 1);
                if (!inFlight && (warMap.tick ?? 0) - lastFired >= cooldown) {
                    return { type: 'fire', targetId: enemy.id };
                }
            }

            // Weapon reloading or enemy out of range — advance toward enemy
            const delta = facing === 'N' ? { dx:  0,         dy: -MOVE_STEP }
                        : facing === 'S' ? { dx:  0,         dy:  MOVE_STEP }
                        : facing === 'E' ? { dx:  MOVE_STEP, dy:  0         }
                        :                  { dx: -MOVE_STEP, dy:  0         };
            const nx = robot.x + delta.dx;
            const ny = robot.y + delta.dy;
            if (nx >= 0 && ny >= 0 && nx < warMap.width && ny < warMap.height
                    && !isOccupied(occupancy, nx, ny, robot.id)) {
                return { type: 'move', direction: facing };
            }

            return { type: 'idle' };
        }
    }

    // No enemy in sight — pursue goal
    const target = findTarget(robot, warMap);
    if (!target) return { type: 'idle' };

    const { x: tx, y: ty } = targetPos(target);
    const distToGoal = Math.abs(robot.x - tx) + Math.abs(robot.y - ty);

    // --- Bug2-style wall-follow ---
    // When the robot's primary direction toward the goal is blocked for 3 consecutive ticks,
    // it switches to wall-follow mode: keep going straight unless blocked, turning
    // clockwise (right-hand rule) when forced to change direction.
    // Exit wall-follow when the primary direction is clear again AND the robot is closer
    // to the goal than it was at the moment the mode was entered.

    // Pre-compute primary direction and whether it is currently blocked (or out of bounds).
    // We look 4 steps (one full grid cell) ahead so that a robot one MOVE_STEP away from a
    // wall AABB edge doesn't spuriously exit wall_follow before truly clearing the obstacle.
    const [primaryDir] = preferredDirs(robot, tx, ty);
    const pDelta = primaryDir === 'N' ? { dx:  0,         dy: -MOVE_STEP }
                 : primaryDir === 'S' ? { dx:  0,         dy:  MOVE_STEP }
                 : primaryDir === 'E' ? { dx:  MOVE_STEP, dy:  0         }
                 :                      { dx: -MOVE_STEP, dy:  0         };
    let primaryBlocked = false;
    for (let step = 1; step <= 4; step++) {
        const px = robot.x + pDelta.dx * step;
        const py = robot.y + pDelta.dy * step;
        if (px < 0 || py < 0 || px >= warMap.width || py >= warMap.height
                || !getTerrainRule(tileAt(warMap, px, py), chassis).passable
                || isOccupied(occupancy, px, py, robot.id)) {
            primaryBlocked = true;
            break;
        }
    }

    // Check exit condition for wall-follow: primary direction is clear all the way to the goal.
    // We scan from the robot's position to the goal's primary coordinate (not just 4 steps),
    // so a robot at y=7 facing E won't falsely exit when the right wall blocks at x=10.25.
    if (robot.navMode === 'wall_follow') {
        const primaryGoalDist = primaryDir === 'E' ? tx - robot.x
                              : primaryDir === 'W' ? robot.x - tx
                              : primaryDir === 'S' ? ty - robot.y
                              :                     robot.y - ty; // N
        const exitSteps = Math.max(0, Math.ceil(primaryGoalDist / MOVE_STEP));
        let clearToGoal = true;
        for (let step = 1; step <= exitSteps; step++) {
            const px = robot.x + pDelta.dx * step;
            const py = robot.y + pDelta.dy * step;
            if (px < 0 || py < 0 || px >= warMap.width || py >= warMap.height
                    || !getTerrainRule(tileAt(warMap, px, py), chassis).passable
                    || isOccupied(occupancy, px, py, robot.id)) {
                clearToGoal = false;
                break;
            }
        }
        if (clearToGoal) {
            robot.navMode = 'goal';
            robot.stuckTicks = 0;
        }
    }

    // Stagnation detection in goal mode: count consecutive ticks where the primary
    // direction toward the goal is physically blocked (ignores rotations and slow terrain).
    if (robot.navMode !== 'wall_follow') {
        if (primaryBlocked) {
            robot.stuckTicks = (robot.stuckTicks ?? 0) + 1;
            if (robot.stuckTicks >= 3) {
                robot.navMode = 'wall_follow';
                robot.wallFollowStartDist = distToGoal;
                // stuckTicks intentionally not reset here — visible to tests; reset on exit
            }
        } else {
            robot.stuckTicks = 0;
        }
    }

    // Direction priorities:
    //   goal mode      — greedy toward target
    //   wall_follow    — continue straight; only turn clockwise when blocked (right-hand rule)
    const dirsToTry: Direction[] = robot.navMode === 'wall_follow'
        ? [facing, rightOf(facing), leftOf(facing), backOf(facing)]
        : preferredDirs(robot, tx, ty);

    for (const dir of dirsToTry) {
        const delta = dir === 'N' ? { dx:  0,         dy: -MOVE_STEP }
                    : dir === 'S' ? { dx:  0,         dy:  MOVE_STEP }
                    : dir === 'E' ? { dx:  MOVE_STEP, dy:  0         }
                    :               { dx: -MOVE_STEP, dy:  0         };
        const nx = robot.x + delta.dx;
        const ny = robot.y + delta.dy;
        if (nx < 0 || ny < 0 || nx >= warMap.width || ny >= warMap.height) continue;
        if (!getTerrainRule(tileAt(warMap, nx, ny), chassis).passable) continue;
        if (isOccupied(occupancy, nx, ny, robot.id)) continue;

        if (facing === dir) {
            return { type: 'move', direction: dir };
        }
        const currentAngle = directionToRotation(facing);
        const targetAngle  = directionToRotation(dir);
        const diff = ((targetAngle - currentAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        return { type: 'rotate', direction: diff > 0 ? 'right' : 'left' };
    }

    return { type: 'idle' };
}
