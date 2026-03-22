import type { WarMap } from './warmap';

// Types that block movement into a cell
const BLOCKING_TYPES = new Set(['factory', 'warbase', 'wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence']);


// Game-level footprints: which cells (relative to floor(x), floor(y)) each structure occupies.
// Defined as pure game logic — independent of how the renderer places visual model parts.
//   factory: 2×3 cells (columns × rows)
//   warbase: 4×5 cells
const STRUCTURE_FOOTPRINTS: Partial<Record<string, Array<{ dx: number; dy: number }>>> = {
    factory: [
        { dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 2 },
        { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 1, dy: 2 },
    ],
    warbase: [
        { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 3, dy: 1 },
        { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 }, { dx: 3, dy: 2 },
        { dx: 0, dy: 3 }, { dx: 1, dy: 3 }, { dx: 2, dy: 3 }, { dx: 3, dy: 3 },
        { dx: 0, dy: 4 }, { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: 3, dy: 4 },
    ],
};

// Minimum distance between two robots (Manhattan). Prevents visual overlap with ~1-unit wide models.
export const ROBOT_COLLISION_DISTANCE = 1.0;

interface RobotPos { id: string; x: number; y: number; }

export interface OccupancyMap {
    robots: RobotPos[];       // exact positions of all robots
    structures: Set<string>;  // cell keys of blocking structures
}

export function buildOccupancy(warMap: WarMap): OccupancyMap {
    const robots: RobotPos[] = [];
    const structures = new Set<string>();
    for (const obj of warMap.objects) {
        if (obj.type === 'robot') {
            robots.push({ id: obj.id, x: obj.x, y: obj.y });
        } else if (BLOCKING_TYPES.has(obj.type)) {
            const footprint = STRUCTURE_FOOTPRINTS[obj.type];
            if (footprint) {
                const x0 = Math.floor(obj.x);
                const y0 = Math.floor(obj.y);
                for (const { dx, dy } of footprint) {
                    structures.add(`${x0 + dx},${y0 + dy}`);
                }
            } else {
                structures.add(cellKey(obj.x, obj.y));
            }
        }
    }
    return { robots, structures };
}

// Returns true if (tx, ty) is blocked by any robot other than excludeId,
// or by a structure occupying that cell.
export function isOccupied(
    occupancy: OccupancyMap,
    tx: number, ty: number,
    excludeId?: string,
): boolean {
    if (occupancy.structures.has(cellKey(tx, ty))) return true;
    return occupancy.robots.some(r =>
        r.id !== excludeId &&
        Math.max(Math.abs(r.x - tx), Math.abs(r.y - ty)) < ROBOT_COLLISION_DISTANCE
    );
}

// Update a robot's stored position after it moves.
export function updateRobotPosition(
    occupancy: OccupancyMap,
    robotId: string,
    x: number, y: number,
): void {
    const pos = occupancy.robots.find(r => r.id === robotId);
    if (pos) { pos.x = x; pos.y = y; }
}

export function cellKey(x: number, y: number): string {
    return `${Math.floor(x)},${Math.floor(y)}`;
}

export function key(x: number, y: number): string {
    return `${x},${y}`;
}
