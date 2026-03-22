import type { WarMap } from './warmap';

// Types that block movement into a cell
const BLOCKING_TYPES = new Set(['factory', 'warbase', 'wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence']);

// AABB offsets relative to the structure's (x, y) origin.
// All models are visually centered on their origin (±0.5 in x and y for a 1×1 model),
// so offsets reflect actual model extents — NOT floor()-based cell indices.
//
// DO NOT switch back to floor()/cellKey collision — see game.md "Collision System".
//
// Default for any 1×1 structure (walls, fences): ±0.5 from origin.
// factory: 2 columns × 3 rows  → x ∈ [−0.5, +1.5],  y ∈ [−0.5, +2.5]
// warbase: 4 columns × 5 rows  → x ∈ [−0.5, +3.5],  y ∈ [−0.5, +4.5]
interface AABBDef { dx0: number; dy0: number; dx1: number; dy1: number; }

// Inflate all AABBs by MOVE_STEP (0.25) beyond the visual model edge.
// Robot chassis models are ~1.0 unit wide (half-width ≈ 0.5), so the robot center
// must stop at least 0.5 units from any wall visual edge to avoid visual overlap.
// The AABB edge is at ±0.5 (visual edge); inflating by 0.25 forces the robot to stop
// one extra MOVE_STEP back, giving a 0.5-unit clearance from the visual edge.
const INFLATE = 0.25;

const DEFAULT_AABB: AABBDef = { dx0: -(0.5 + INFLATE), dy0: -(0.5 + INFLATE), dx1: 0.5 + INFLATE, dy1: 0.5 + INFLATE };

const STRUCTURE_AABB: Partial<Record<string, AABBDef>> = {
    factory: { dx0: -(0.5 + INFLATE), dy0: -(0.5 + INFLATE), dx1: 1.5 + INFLATE, dy1: 2.5 + INFLATE },
    warbase: { dx0: -(0.5 + INFLATE), dy0: -(0.5 + INFLATE), dx1: 3.5 + INFLATE, dy1: 4.5 + INFLATE },
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
        } else if (BLOCKING_TYPES.has(obj.type)) {
            const def = STRUCTURE_AABB[obj.type] ?? DEFAULT_AABB;
            structures.push({
                x0: obj.x + def.dx0,
                y0: obj.y + def.dy0,
                x1: obj.x + def.dx1,
                y1: obj.y + def.dy1,
            });
        }
    }
    return { robots, structures };
}

// Returns true if (tx, ty) is blocked by any structure AABB or by another robot.
// Structure check: robot center must not land inside any AABB.
// Robot check: Chebyshev distance < ROBOT_COLLISION_DISTANCE (square 1×1 footprint).
export function isOccupied(
    occupancy: OccupancyMap,
    tx: number, ty: number,
    excludeId?: string,
): boolean {
    if (occupancy.structures.some(s => tx >= s.x0 && tx < s.x1 && ty >= s.y0 && ty < s.y1)) return true;
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

export function key(x: number, y: number): string {
    return `${x},${y}`;
}
