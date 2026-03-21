import type { MapData } from '../data/map';
import type { RobotConfig } from '../data/robot';

export interface WarObject {
    id: string;
    type: string;       // 'tile' | 'factory' | 'warbase' | 'robot' | 'wall*' | 'fence'
    x: number;
    y: number;
    owner?: number;     // 1=red (right flag), 2=blue (left flag), absent=neutral
    subtype?: string;   // tile type (e.g. 'G'), factory subtype
    rotation?: number;  // robot facing (radians)
    robotConfig?: RobotConfig;
}

export interface WarMap {
    width: number;
    height: number;
    objects: WarObject[];
}

export function createWarMap(mapData: MapData): WarMap {
    const objects: WarObject[] = [];

    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            objects.push({ id: `tile_${x}_${y}`, type: 'tile', x, y, subtype: mapData.tiles[y][x] });
        }
    }

    mapData.objects.forEach((obj, i) => {
        objects.push({
            id: `${obj.type}_${i}`,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            ...(obj.owner !== undefined ? { owner: obj.owner } : {}),
            ...(obj.subtype ? { subtype: obj.subtype } : {}),
        });
    });

    return { width: mapData.width, height: mapData.height, objects };
}

export function removeObject(warMap: WarMap, id: string): void {
    warMap.objects = warMap.objects.filter(o => o.id !== id);
}

export function findLastByType(warMap: WarMap, type: string): WarObject | undefined {
    return [...warMap.objects].reverse().find(o => o.type === type);
}

// Cycles owner: undefined → 1 → 2 → undefined
export function cycleOwner(obj: WarObject): void {
    if (obj.owner === undefined) obj.owner = 1;
    else if (obj.owner === 1)    obj.owner = 2;
    else                         obj.owner = undefined;
}

// Rotates all robots by 90 degrees (π/2)
export function rotateRobots(warMap: WarMap): void {
    warMap.objects
        .filter(o => o.type === 'robot')
        .forEach(o => { o.rotation = (o.rotation ?? 0) + Math.PI / 2; });
}
