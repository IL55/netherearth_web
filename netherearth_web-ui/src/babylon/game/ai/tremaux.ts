/**
 * Trémaux navigation algorithm.
 *
 * Maintains a sliding window of the last ~40 visited grid positions (at 0.25-cell
 * resolution to handle sub-cell AABB boundaries). Each tick it prefers the
 * passable direction with the fewest recent visits, using Chebyshev distance
 * to the goal as a tiebreaker. This naturally escapes dead-ends and loops
 * without needing an explicit wall-follow mode.
 *
 * Exports:
 *   recordCell — call once per tick to update robot.nav.recentCells
 *   tremauxDirs — returns directions sorted by visit count (least visited first)
 */
import { CW_DIRS } from '../warmap';
import type { WarMap, RobotObject, Direction } from '../warmap';
import type { NavState } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { dirDelta, isPassable } from './nav';

// Position key at 0.25-cell resolution — distinguishes sub-cell positions so
// a factory AABB bisecting a grid cell does not cause infinite oscillation.
function posKey(x: number, y: number): string {
    return `${Math.round(x * 4)},${Math.round(y * 4)}`;
}

const TREMAUX_WINDOW = 160; // ≈ 40 grid cells × 4 quarter-steps per cell

function visitCount(nav: NavState, key: string): number {
    if (!nav.recentCells) return 0;
    let count = 0;
    for (const k of nav.recentCells) if (k === key) count++;
    return count;
}

/** Record the robot's current position in the sliding window. Call once per tick before choosing direction. */
export function recordCell(robot: RobotObject): void {
    const nav = robot.nav ??= {};
    const key = posKey(robot.x, robot.y);
    if (!nav.recentCells) nav.recentCells = [];
    // Avoid inflating the same key consecutively (robot standing still or rotating)
    if (nav.recentCells[nav.recentCells.length - 1] !== key) {
        nav.recentCells.push(key);
        if (nav.recentCells.length > TREMAUX_WINDOW) nav.recentCells.shift();
    }
}

/**
 * Trémaux direction selection: prefer less-visited passable directions,
 * with Chebyshev distance to goal as tiebreaker.
 * Uses cell-aligned positions to avoid direction flip at fractional coordinates.
 */
export function tremauxDirs(
    robot: RobotObject,
    warMap: WarMap,
    occupancy: OccupancyMap,
    tx: number,
    ty: number,
): Direction[] {
    const nav = robot.nav ??= {};

    const scored = CW_DIRS.map(dir => {
        const { dx, dy } = dirDelta(dir);
        const nx = robot.x + dx;
        const ny = robot.y + dy;
        if (!isPassable(warMap, occupancy, robot, nx, ny)) return null;
        const visits = visitCount(nav, posKey(nx, ny));
        // Cell-aligned Chebyshev to goal — avoids direction flip at fractional positions
        const chebyshev = Math.max(
            Math.abs(Math.round(nx) - Math.round(tx)),
            Math.abs(Math.round(ny) - Math.round(ty)),
        );
        return { dir, visits, chebyshev };
    }).filter((s): s is { dir: Direction; visits: number; chebyshev: number } => s !== null);

    // Fewest visits first; Chebyshev to goal as tiebreaker
    scored.sort((a, b) => a.visits !== b.visits ? a.visits - b.visits : a.chebyshev - b.chebyshev);

    return scored.map(s => s.dir);
}
