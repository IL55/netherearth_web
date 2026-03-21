import type { MapData } from '../data/map';
import type { RobotConfig } from '../data/robot';

export interface WarObject {
    id: string;
    type: string;       // 'tile' | 'factory' | 'warbase' | 'robot' | 'wall*' | 'fence'
    x: number;
    y: number;
    owner?: number;
    subtype?: string;   // tile type (e.g. 'G'), factory subtype, robot chassis info
    flagSide?: string;  // factory flag position
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
            ...(obj.flagSide ? { flagSide: obj.flagSide } : {}),
        });
    });

    return { width: mapData.width, height: mapData.height, objects };
}
