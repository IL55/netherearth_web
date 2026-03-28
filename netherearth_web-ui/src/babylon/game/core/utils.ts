import type { MapData } from '../../data/map';
import { Owner } from '../types/owner';
import { ObjectType } from '../types/object-type';
import type { WarMap, WarObject, RobotObject, MapObject, StructureType } from './warmap';

/**
 * Checks if the given object is a RobotObject.
 */
export function isRobot(obj: WarObject): obj is RobotObject { 
    return obj.type === ObjectType.ROBOT; 
}

/**
 * Checks if the given object is a MapObject (structure or tile).
 */
export function isMapObj(obj: WarObject): obj is MapObject { 
    return obj.type !== ObjectType.ROBOT; 
}

/**
 * Creates a WarMap instance from map layout data, parsing objects and establishing initial state.
 */
export function createWarMap(mapData: MapData): WarMap {
    const objects: WarObject[] = [];

    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            objects.push({ id: `tile_${x}_${y}`, type: ObjectType.TILE, x, y, subtype: mapData.tiles[y][x] });
        }
    }

    mapData.objects.forEach((obj, i) => {
        objects.push({
            id: `${obj.type}_${i}`,
            type: obj.type as StructureType,
            x: obj.x,
            y: obj.y,
            owner: obj.owner !== undefined ? obj.owner : Owner.NEUTRAL,
            ...(obj.subtype ? { subtype: obj.subtype } : {}),
        });
    });

    return { width: mapData.width, height: mapData.height, objects, projectiles: [] };
}

/**
 * Removes an object from the map given its ID.
 */
export function removeObject(warMap: WarMap, id: string): void {
    warMap.objects = warMap.objects.filter(o => o.id !== id);
}

/**
 * Finds the latest object added to the map matching the requested type string.
 */
export function findLastByType(warMap: WarMap, type: string): WarObject | undefined {
    return [...warMap.objects].reverse().find(o => o.type === type);
}

/**
 * Cycles the owner of an object in a predictable order:
 * NEUTRAL → RED → BLUE → NEUTRAL
 */
export function cycleOwner(obj: WarObject): void {
    if (!obj.owner)                    obj.owner = Owner.RED;
    else if (obj.owner === Owner.RED)  obj.owner = Owner.BLUE;
    else                               obj.owner = Owner.NEUTRAL;
}
