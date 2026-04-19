import type { MapData } from '../../data/map';
import { Owner } from '../types/owner';
import { ObjectType } from '../types/object-type';
import type { WarMap, RobotObject, MapObject, StructureType } from './warmap';

export function isRobot(o: RobotObject | MapObject): o is RobotObject {
    return o.type === ObjectType.ROBOT;
}

export function isMapObj(o: RobotObject | MapObject): o is MapObject {
    return o.type !== ObjectType.ROBOT;
}

/**
 * Converts raw MapData (typically from JSON) into the runtime WarMap structure.
 */
export function createWarMap(mapData: MapData): WarMap {
    const tiles: MapObject[] = [];
    const robots: RobotObject[] = [];

    // Construct tiles
    if (mapData.tiles) {
        for (let x = 0; x < mapData.width; x++) {
            for (let y = 0; y < mapData.height; y++) {
                const row = mapData.tiles[y];
                if (!row || !row[x]) continue;

                const tType = row[x] as string;

                tiles.push({
                    id: `tile_${x}_${y}`,
                    type: ObjectType.TILE,
                    x,
                    y,
                    subtype: tType,
                });
            }
        }
    }

    mapData.objects.forEach((obj, i) => {
        if (obj.type === ObjectType.ROBOT) {
            robots.push({
                id: `${obj.type}_${i}`,
                type: ObjectType.ROBOT,
                x: obj.x,
                y: obj.y,
                owner: obj.owner !== undefined ? obj.owner : Owner.NEUTRAL,
                ...(obj.subtype ? { subtype: obj.subtype } : {}),
            } as RobotObject);
        } else {
            tiles.push({
                id: `${obj.type}_${i}`,
                type: obj.type as StructureType,
                x: obj.x,
                y: obj.y,
                owner: obj.owner !== undefined ? obj.owner : Owner.NEUTRAL,
                ...(obj.subtype ? { subtype: obj.subtype } : {}),
            });
        }
    });

    return { 
        width: mapData.width, 
        height: mapData.height, 
        tiles, 
        robots, 
        tick: 0, 
        projectiles: [],
        killCounts: {},
    };
}

/**
 * Removes an object from the map given its ID.
 */
export function removeObject(warMap: WarMap, id: string): void {
    warMap.tiles = warMap.tiles.filter(o => o.id !== id);
    warMap.robots = warMap.robots.filter(o => o.id !== id);
}

/**
 * Finds the latest object added to the map matching the requested type string.
 */
export function findLastByType(warMap: WarMap, type: ObjectType): RobotObject | MapObject | undefined {
    if (type === ObjectType.ROBOT) {
        return [...warMap.robots].reverse().find(o => o.type === type);
    }
    return [...warMap.tiles].reverse().find(o => o.type === type);
}

/**
 * Cycles the owner of an object in a predictable order:
 * NEUTRAL → RED → BLUE → NEUTRAL
 */
export function cycleOwner(obj: RobotObject | MapObject): void {
    if (!obj.owner)                    obj.owner = Owner.RED;
    else if (obj.owner === Owner.RED)  obj.owner = Owner.BLUE;
    else                               obj.owner = Owner.NEUTRAL;
}
