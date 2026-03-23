import type { WarMap } from './warmap';

interface AABBDef { dx0: number; dy0: number; dx1: number; dy1: number; }

// Inflate all AABBs by MOVE_STEP (0.25) beyond the visual model edge so robot
// chassis (~1.0 unit wide) clears the wall visually on all four sides.
// Both bounds are INCLUSIVE (>=, <=) for symmetric clearance.
// DO NOT switch back to floor()/cellKey — see game.md "Collision System".
const INFLATE = 0.25;

const DEFAULT_AABB: AABBDef = {
    dx0: -(0.5 + INFLATE), dy0: -(0.5 + INFLATE),
    dx1:   0.5 + INFLATE,  dy1:   0.5 + INFLATE,
};

// Per-structure AABB parts (relative to obj.x, obj.y).
// Factory is C-shaped: left column of 3 + right top+bottom, hole at (xo=1, yo=1).
// Any type not listed here uses a single DEFAULT_AABB.
const STRUCTURE_PARTS: Partial<Record<string, AABBDef[]>> = {
    factory: [
        // Left column: highwall1 at (xo=0, yo=0..2)
        { dx0: -0.75, dy0: -0.75, dx1:  0.75, dy1:  0.75 },  // (0,0)
        { dx0: -0.75, dy0:  0.25, dx1:  0.75, dy1:  1.75 },  // (0,1)
        { dx0: -0.75, dy0:  1.25, dx1:  0.75, dy1:  2.75 },  // (0,2)
        // Right column: lowwall2 at (xo=1, yo=0) and (xo=1, yo=2) — yo=1 is the capture slot
        { dx0:  0.25, dy0: -0.75, dx1:  1.75, dy1:  0.75 },  // (1,0)
        { dx0:  0.25, dy0:  1.25, dx1:  1.75, dy1:  2.75 },  // (1,2)
    ],
    // Warbase: 15 individual parts matching WARBASE_PARTS in view/map/warbase.ts.
    // Each part is a 1×1 model centered at (obj.x + xo, obj.y + yo), inflated by INFLATE.
    // Hole at (xo≈3.5, yo≈2.0): gap between right-column parts (xo=3,yo=1) and (xo=3,yo=3).
    warbase: [
        { dx0: -0.25, dy0: -0.75, dx1:  1.25, dy1:  0.75 },  // xo=0.5, yo=0
        { dx0:  0.75, dy0: -0.75, dx1:  2.25, dy1:  0.75 },  // xo=1.5, yo=0
        { dx0: -0.75, dy0:  0.25, dx1:  0.75, dy1:  1.75 },  // xo=0,   yo=1
        { dx0:  0.25, dy0:  0.25, dx1:  1.75, dy1:  1.75 },  // xo=1,   yo=1
        { dx0:  1.25, dy0:  0.25, dx1:  2.75, dy1:  1.75 },  // xo=2,   yo=1
        { dx0:  2.25, dy0:  0.25, dx1:  3.75, dy1:  1.75 },  // xo=3,   yo=1
        { dx0: -0.25, dy0:  1.25, dx1:  1.25, dy1:  2.75 },  // xo=0.5, yo=2
        { dx0:  0.75, dy0:  1.25, dx1:  2.25, dy1:  2.75 },  // xo=1.5, yo=2
        { dx0:  1.75, dy0:  1.25, dx1:  3.25, dy1:  2.75 },  // xo=2.5, yo=2
        { dx0: -0.75, dy0:  2.25, dx1:  0.75, dy1:  3.75 },  // xo=0,   yo=3
        { dx0:  0.25, dy0:  2.25, dx1:  1.75, dy1:  3.75 },  // xo=1,   yo=3
        { dx0:  1.25, dy0:  2.25, dx1:  2.75, dy1:  3.75 },  // xo=2,   yo=3
        { dx0:  2.25, dy0:  2.25, dx1:  3.75, dy1:  3.75 },  // xo=3,   yo=3
        { dx0: -0.25, dy0:  3.25, dx1:  1.25, dy1:  4.75 },  // xo=0.5, yo=4
        { dx0:  0.75, dy0:  3.25, dx1:  2.25, dy1:  4.75 },  // xo=1.5, yo=4
    ],
};

// Minimum Chebyshev distance between two robot centers.
export const ROBOT_COLLISION_DISTANCE = 1.0;

interface RobotPos { id: string; x: number; y: number; }

interface StructureAABB { x0: number; y0: number; x1: number; y1: number; }

export interface OccupancyMap {
    robots: RobotPos[];
    structures: StructureAABB[];
}

export function buildOccupancy(warMap: WarMap): OccupancyMap {
    const robots: RobotPos[] = [];
    const structures: StructureAABB[] = [];
    for (const obj of warMap.objects) {
        if (obj.type === 'robot') {
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
    return { robots, structures };
}

function isBlockingType(type: string): boolean {
    return ['wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence'].includes(type);
}

// Returns true if (tx, ty) is blocked by any structure AABB or by another robot.
export function isOccupied(
    occupancy: OccupancyMap,
    tx: number, ty: number,
    excludeId?: string,
): boolean {
    if (occupancy.structures.some(s => tx >= s.x0 && tx <= s.x1 && ty >= s.y0 && ty <= s.y1)) return true;
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
        // Horizontal ray
        const minX = Math.min(sx, tx);
        const maxX = Math.max(sx, tx);
        return occupancy.structures.some(s =>
            s.x0 < maxX && s.x1 > minX && s.y0 <= sy && s.y1 >= sy
        );
    } else {
        // Vertical ray
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
