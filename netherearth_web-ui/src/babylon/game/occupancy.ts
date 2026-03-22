import type { WarMap, WarObject } from './warmap';

// Types that block movement into a cell
const BLOCKING_TYPES = new Set(['factory', 'warbase', 'wall1', 'wall2', 'wall3', 'wall4', 'wall5', 'wall6', 'fence']);

export type OccupancyMap = Map<string, WarObject>;

export function buildOccupancy(warMap: WarMap): OccupancyMap {
    const map: OccupancyMap = new Map();
    for (const obj of warMap.objects) {
        if (obj.type === 'robot' || BLOCKING_TYPES.has(obj.type)) {
            map.set(key(obj.x, obj.y), obj);
        }
    }
    return map;
}

export function isOccupied(occupancy: OccupancyMap, x: number, y: number): boolean {
    return occupancy.has(key(x, y));
}

export function key(x: number, y: number): string {
    return `${x},${y}`;
}
