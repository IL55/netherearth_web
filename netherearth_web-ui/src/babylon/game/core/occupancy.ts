import { ObjectType } from './warmap';
import type { WarMap } from './warmap';

interface AABBDef { dx0: number; dy0: number; dx1: number; dy1: number; height?: number; }

// All structures are 1×1 blocks. AABBs use exact visual boundaries (±0.5 from center).
// isOccupied checks robot box [rx±0.5] vs structure box overlap — no inflation needed.

const DEFAULT_AABB: AABBDef = { dx0: -0.5, dy0: -0.5, dx1: 0.5, dy1: 0.5 };

// Per-structure AABB parts (relative to obj.x, obj.y), one entry per 1×1 block.
// Factory is C-shaped: left column at xo=0 (yo=0,1,2) + right top/bottom at xo=1 (yo=0,2).
// Hole at (xo=1, yo=1) is the capture slot.
// Warbase: 15 blocks; hole at (xo≈3.5, yo≈2) is the capture slot.
const STRUCTURE_PARTS: Partial<Record<string, AABBDef[]>> = {
    factory: [
        { dx0: -0.5, dy0: -0.5, dx1:  0.5, dy1:  0.5, height: 1.0 },  // highwall1 (xo=0, yo=0)
        { dx0: -0.5, dy0:  0.5, dx1:  0.5, dy1:  1.5, height: 1.5 },  // highwall1 (xo=0, yo=1)
        { dx0: -0.5, dy0:  1.5, dx1:  0.5, dy1:  2.5, height: 1.0 },  // highwall1 (xo=0, yo=2)
        { dx0:  0.5, dy0: -0.5, dx1:  1.5, dy1:  0.5, height: 0.5 },  // lowwall2  (xo=1, yo=0)
        { dx0:  0.5, dy0:  1.5, dx1:  1.5, dy1:  2.5, height: 0.5 },  // lowwall2  (xo=1, yo=2)
    ],
    warbase: [
        { dx0:  0.0, dy0: -0.5, dx1:  1.0, dy1:  0.5, height: 1.0 },  // highwall1 (xo=0.5, yo=0)
        { dx0:  1.0, dy0: -0.5, dx1:  2.0, dy1:  0.5, height: 1.0 },  // highwall2 (xo=1.5, yo=0)
        { dx0: -0.5, dy0:  0.5, dx1:  0.5, dy1:  1.5, height: 1.0 },  // highwall1 (xo=0, yo=1)
        { dx0:  0.5, dy0:  0.5, dx1:  1.5, dy1:  1.5, height: 0.5 },  // lowwall1  (xo=1, yo=1)
        { dx0:  1.5, dy0:  0.5, dx1:  2.5, dy1:  1.5, height: 0.5 },  // lowwall1  (xo=2, yo=1)
        { dx0:  2.5, dy0:  0.5, dx1:  3.5, dy1:  1.5, height: 0.5 },  // lowwall2  (xo=3, yo=1)
        { dx0:  0.0, dy0:  1.5, dx1:  1.0, dy1:  2.5, height: 1.0 },  // highwall1 (xo=0.5, yo=2)
        { dx0:  1.0, dy0:  1.5, dx1:  2.0, dy1:  2.5, height: 1.0 },  // warbase   (xo=1.5, yo=2)
        { dx0:  2.0, dy0:  1.5, dx1:  3.0, dy1:  2.5, height: 0.5 },  // lowwall2  (xo=2.5, yo=2)
        { dx0: -0.5, dy0:  2.5, dx1:  0.5, dy1:  3.5, height: 1.0 },  // highwall1 (xo=0, yo=3)
        { dx0:  0.5, dy0:  2.5, dx1:  1.5, dy1:  3.5, height: 0.5 },  // lowwall1  (xo=1, yo=3)
        { dx0:  1.5, dy0:  2.5, dx1:  2.5, dy1:  3.5, height: 0.5 },  // lowwall1  (xo=2, yo=3)
        { dx0:  2.5, dy0:  2.5, dx1:  3.5, dy1:  3.5, height: 0.5 },  // lowwall2  (xo=3, yo=3)
        { dx0:  0.0, dy0:  3.5, dx1:  1.0, dy1:  4.5, height: 1.0 },  // highwall1 (xo=0.5, yo=4)
        { dx0:  1.0, dy0:  3.5, dx1:  2.0, dy1:  4.5, height: 1.0 },  // highwall2 (xo=1.5, yo=4)
    ],
};

// Minimum Chebyshev distance between two robot centers.
export const ROBOT_COLLISION_DISTANCE = 1.0;
export const ROBOT_HEIGHT = 1.0;

import { calcRobotHeight } from '../../data/robot';

export interface RobotPos { id: string; x: number; y: number; height: number; }

export interface StructureAABB { x0: number; y0: number; x1: number; y1: number; height: number; }

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
            const h = obj.robotConfig ? calcRobotHeight(obj.robotConfig) : ROBOT_HEIGHT;
            robots.push({ id: obj.id, x: obj.x, y: obj.y, height: h });
        } else {
            const parts = STRUCTURE_PARTS[obj.type];
            if (parts) {
                for (const def of parts) {
                    structures.push({ x0: obj.x + def.dx0, y0: obj.y + def.dy0, x1: obj.x + def.dx1, y1: obj.y + def.dy1, height: def.height ?? getStructureHeight(obj.type) });
                }
            } else if (isBlockingType(obj.type)) {
                structures.push({ x0: obj.x + DEFAULT_AABB.dx0, y0: obj.y + DEFAULT_AABB.dy0, x1: obj.x + DEFAULT_AABB.dx1, y1: obj.y + DEFAULT_AABB.dy1, height: getStructureHeight(obj.type) });
            }
        }
    }
    return { robots, structures, ship };
}

function isBlockingType(type: string): boolean {
    return ['wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence'].includes(type);
}

function getStructureHeight(type: string): number {
    // Low walls and fences are height 0.5
    if (type.startsWith('wall1') || type.startsWith('wall2') || type.startsWith('wall3') || type === 'fence') {
        return 0.5;
    }
    // Warbase has mixed heights, but if considered as a single block for other purposes, default to 1.0
    if (type === 'warbase') {
        return 1.0;
    }
    // High walls and factories are height 2.0
    return 2.0;
}

// Returns true if the robot box [tx±0.5, ty±0.5] overlaps any structure AABB or another robot.
export function isOccupied(
    occupancy: OccupancyMap,
    tx: number, ty: number,
    excludeId?: string,
    robotHeight?: number,
): boolean {
    if (occupancy.structures.some(s =>
        tx - 0.5 < s.x1 && tx + 0.5 > s.x0 &&
        ty - 0.5 < s.y1 && ty + 0.5 > s.y0,
    )) return true;
    
    let movingHeight = robotHeight ?? ROBOT_HEIGHT;
    if (!robotHeight && excludeId) {
        const r = occupancy.robots.find(r => r.id === excludeId);
        if (r) movingHeight = r.height;
    }

    // A robot can go under the ship only if the ship is above the robot's height
    if (occupancy.ship && occupancy.ship.height <= movingHeight) {
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
