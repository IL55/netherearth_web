import type { MapData } from '../../data/map';
import { Owner } from '../types/owner';
import { ObjectType } from '../types/object-type';
import { Direction, RobotAI, RobotGoal } from './warmap';
import { Chassis, calcHealth } from '../../data/robot';
import type { RobotConfig } from '../../data/robot';
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
            robots.push(spawnRobot({
                id: `${obj.type}_${i}`,
                x: obj.x,
                y: obj.y,
                owner: obj.owner,
            }));
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

export function spawnRobot(params: {
    id: string;
    x: number;
    y: number;
    owner?: Owner;
    facing?: Direction;
    goal?: RobotGoal;
    robotConfig?: RobotConfig;
    ai?: RobotAI;
    health?: number;
}): RobotObject {
    const config = params.robotConfig ?? { chassis: Chassis.TRACKS };
    return {
        id: params.id,
        type: ObjectType.ROBOT,
        x: params.x,
        y: params.y,
        owner: params.owner !== undefined ? params.owner : Owner.NEUTRAL,
        facing: params.facing !== undefined ? params.facing : Direction.E,
        goal: params.goal !== undefined ? params.goal : RobotGoal.DEFEND,
        robotConfig: config,
        health: params.health !== undefined ? params.health : calcHealth(config),
        ai: params.ai !== undefined ? params.ai : RobotAI.SIMPLE,
    };
}
