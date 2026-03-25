/**
 * Trémaux navigation algorithm.
 *
 * Maintains a permanent map of visit counts per position (at 0.25-cell
 * resolution to handle sub-cell AABB boundaries). Each tick it prefers the
 * passable direction with the fewest visits, using Manhattan distance to the
 * goal as a tiebreaker. Permanent markers (never forgotten) allow the robot
 * to reliably escape dead-ends and loops of any size.
 *
 * Exports:
 *   recordCell  — call once per tick to increment robot.nav.visitCounts
 *   tremauxDirs — returns directions sorted by visit count (least visited first)
 */
import { CW_DIRS } from '../warmap';
import type { WarMap, RobotObject, Direction } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { dirDelta, isPassable } from './nav';

// Position key at 0.25-cell resolution — distinguishes sub-cell positions so
// a factory AABB bisecting a grid cell does not cause infinite oscillation.
function posKey(x: number, y: number): string {
    return `${Math.round(x * 4)},${Math.round(y * 4)}`;
}

/** Increment the visit count for the robot's current position. Call once per tick. */
export function recordCell(robot: RobotObject): void {
    const nav = robot.nav ??= {};
    if (!nav.visitCounts) nav.visitCounts = new Map<string, number>();
    const key = posKey(robot.x, robot.y);
    nav.visitCounts.set(key, (nav.visitCounts.get(key) ?? 0) + 1);
}

/**
 * Trémaux direction selection: prefer less-visited passable directions,
 * with Manhattan distance to goal as tiebreaker.
 */
export function tremauxDirs(
    robot: RobotObject,
    warMap: WarMap,
    occupancy: OccupancyMap,
    tx: number,
    ty: number,
): Direction[] {
    const counts = robot.nav?.visitCounts;

    const scored = CW_DIRS.map(dir => {
        const { dx, dy } = dirDelta(dir);
        const nx = robot.x + dx;
        const ny = robot.y + dy;
        if (!isPassable(warMap, occupancy, robot, nx, ny)) return null;
        const visits = counts?.get(posKey(nx, ny)) ?? 0;
        // Manhattan distance to goal — distinguishes all directions correctly
        // even when the robot is at an integer position.
        const manhattan = Math.abs(nx - tx) + Math.abs(ny - ty);
        return { dir, visits, manhattan };
    }).filter((s): s is { dir: Direction; visits: number; manhattan: number } => s !== null);

    // Fewest visits first; Manhattan to goal as tiebreaker
    scored.sort((a, b) => a.visits !== b.visits ? a.visits - b.visits : a.manhattan - b.manhattan);

    return scored.map(s => s.dir);
}
