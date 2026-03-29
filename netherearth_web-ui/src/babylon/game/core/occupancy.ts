import { ObjectType } from './warmap';
import type { WarMap } from './warmap';

interface AABBDef { dx0: number; dy0: number; dx1: number; dy1: number; }

// All structures are 1×1 blocks. AABBs use exact visual boundaries (±0.5 from center).
// isOccupied checks robot box [rx±0.5] vs structure box overlap — no inflation needed.

const DEFAULT_AABB: AABBDef = { dx0: -0.5, dy0: -0.5, dx1: 0.5, dy1: 0.5 };

// Per-structure AABB parts (relative to obj.x, obj.y), one entry per 1×1 block.
// Factory is C-shaped: left column at xo=0 (yo=0,1,2) + right top/bottom at xo=1 (yo=0,2).
// Hole at (xo=1, yo=1) is the capture slot.
// Warbase: 15 blocks; hole at (xo≈3.5, yo≈2) is the capture slot.
const STRUCTURE_PARTS: Partial<Record<string, AABBDef[]>> = {
    factory: [
        { dx0: -0.5, dy0: -0.5, dx1:  0.5, dy1:  0.5 },  // (0,0)
        { dx0: -0.5, dy0:  0.5, dx1:  0.5, dy1:  1.5 },  // (0,1)
        { dx0: -0.5, dy0:  1.5, dx1:  0.5, dy1:  2.5 },  // (0,2)
        { dx0:  0.5, dy0: -0.5, dx1:  1.5, dy1:  0.5 },  // (1,0)
        { dx0:  0.5, dy0:  1.5, dx1:  1.5, dy1:  2.5 },  // (1,2)
    ],
    warbase: [
        { dx0:  0.0, dy0: -0.5, dx1:  1.0, dy1:  0.5 },  // xo=0.5, yo=0
        { dx0:  1.0, dy0: -0.5, dx1:  2.0, dy1:  0.5 },  // xo=1.5, yo=0
        { dx0: -0.5, dy0:  0.5, dx1:  0.5, dy1:  1.5 },  // xo=0,   yo=1
        { dx0:  0.5, dy0:  0.5, dx1:  1.5, dy1:  1.5 },  // xo=1,   yo=1
        { dx0:  1.5, dy0:  0.5, dx1:  2.5, dy1:  1.5 },  // xo=2,   yo=1
        { dx0:  2.5, dy0:  0.5, dx1:  3.5, dy1:  1.5 },  // xo=3,   yo=1
        { dx0:  0.0, dy0:  1.5, dx1:  1.0, dy1:  2.5 },  // xo=0.5, yo=2
        { dx0:  1.0, dy0:  1.5, dx1:  2.0, dy1:  2.5 },  // xo=1.5, yo=2
        { dx0:  2.0, dy0:  1.5, dx1:  3.0, dy1:  2.5 },  // xo=2.5, yo=2
        { dx0: -0.5, dy0:  2.5, dx1:  0.5, dy1:  3.5 },  // xo=0,   yo=3
        { dx0:  0.5, dy0:  2.5, dx1:  1.5, dy1:  3.5 },  // xo=1,   yo=3
        { dx0:  1.5, dy0:  2.5, dx1:  2.5, dy1:  3.5 },  // xo=2,   yo=3
        { dx0:  2.5, dy0:  2.5, dx1:  3.5, dy1:  3.5 },  // xo=3,   yo=3
        { dx0:  0.0, dy0:  3.5, dx1:  1.0, dy1:  4.5 },  // xo=0.5, yo=4
        { dx0:  1.0, dy0:  3.5, dx1:  2.0, dy1:  4.5 },  // xo=1.5, yo=4
    ],
};

// Minimum Chebyshev distance between two robot centers.
export const ROBOT_COLLISION_DISTANCE = 1.0;

interface RobotPos { id: string; x: number; y: number; }

interface StructureAABB { x0: number; y0: number; x1: number; y1: number; }

export interface OccupancyMap {
    robots: RobotPos[];
    structures: StructureAABB[];
    ship?: { x: number; y: number; height: number; };
}

export function buildOccupancy(warMap: WarMap, ship?: { x: number; y: number; height: number; }): OccupancyMap {
    const robots: RobotPos[] = [];
    const structures: StructureAABB[] = [];
    for (const obj of warMap.objects) {
        if (obj.type === ObjectType.ROBOT) {
            robots.push({ id: obj.id, x: obj.x, y: obj.y });
        } else {
            const parts = STRUCTURE_PARTS[obj.type];
            if (parts) {
                for (const def of parts) {
                    structures.push({ x0: obj.x + def.dx0, y0: obj.y + def.dy0, x1: obj.x + def.dx1, y1: obj.y + def.dy1 });
                }
            } else if (isBlockingType(obj.type)) {
                structures.push({ x0: obj.x + DEFAULT_AABB.dx0, y0: obj.y + DEFAULT_AABB.dy0, x1: obj.x + DEFAULT_AABB.dx1, y1: obj.y + DEFAULT_AABB.dy1 });
            }
        }
    }
    return { robots, structures, ship };
}

function isBlockingType(type: string): boolean {
    return ['wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence'].includes(type);
}

// Returns true if the robot box [tx±0.5, ty±0.5] overlaps any structure AABB or another robot.
export function isOccupied(
    occupancy: OccupancyMap,
    tx: number, ty: number,
    excludeId?: string,
): boolean {
    if (occupancy.structures.some(s =>
        tx - 0.5 < s.x1 && tx + 0.5 > s.x0 &&
        ty - 0.5 < s.y1 && ty + 0.5 > s.y0,
    )) return true;
    // A robot can go under the ship only if the ship is above the WALL_HEIGHT
    // So if the ship height is <= WALL_HEIGHT, the robot will be blocked by the ship
    if (occupancy.ship && occupancy.ship.height <= 3.5 /* WALL_HEIGHT */) {
        if (Math.max(Math.abs(occupancy.ship.x - tx), Math.abs(occupancy.ship.y - ty)) < ROBOT_COLLISION_DISTANCE) {
            return true;
        }
    }
    return occupancy.robots.some(r =>
        r.id !== excludeId &&
        Math.max(Math.abs(r.x - tx), Math.abs(r.y - ty)) < ROBOT_COLLISION_DISTANCE
    );
}

// Returns true if a structure AABB crosses the direct line between two positions.
// Only valid for cardinal directions (shooter and target share x or y coordinate).
// Robots are not treated as LOS blockers — only structures are.
export function isLOSBlocked(
    occupancy: OccupancyMap,
    sx: number, sy: number,
    tx: number, ty: number,
): boolean {
    if (sy === ty) {
        const minX = Math.min(sx, tx);
        const maxX = Math.max(sx, tx);
        return occupancy.structures.some(s =>
            s.x0 < maxX && s.x1 > minX && s.y0 <= sy && s.y1 >= sy
        );
    } else {
        const minY = Math.min(sy, ty);
        const maxY = Math.max(sy, ty);
        return occupancy.structures.some(s =>
            s.y0 < maxY && s.y1 > minY && s.x0 <= sx && s.x1 >= sx
        );
    }
}

export function updateRobotPosition(
    occupancy: OccupancyMap,
    robotId: string,
    x: number, y: number,
): void {
    const pos = occupancy.robots.find(r => r.id === robotId);
    if (pos) { pos.x = x; pos.y = y; }
}

export function key(x: number, y: number): string {
    return `${x},${y}`;
}
