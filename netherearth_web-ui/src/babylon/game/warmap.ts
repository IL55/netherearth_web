import type { MapData } from '../data/map';
import type { RobotConfig } from '../data/robot';
import { Owner } from './owner';

export type Direction = 'N' | 'E' | 'S' | 'W';
// Clockwise order — used for rotation index math and direction iteration.
export const CW_DIRS: Direction[] = ['N', 'E', 'S', 'W'];

export type WeaponType = 'cannon' | 'missile' | 'phaser';

export interface Projectile {
    id: string;
    weaponType: WeaponType;
    fromX: number; fromY: number;
    toX:   number; toY:   number;
    progress: number; // 0.0 → 1.0
    step:     number; // progress added per sub-tick
    ownerId: string;
}

export enum RobotGoal {
    /** Hunt and attack the nearest enemy robot. */
    ATTACK_ROBOTS           = 'attack_robots',
    /** Capture the nearest non-owned factory (enemy or neutral). */
    CAPTURE_FACTORY         = 'capture_factory',
    /** Capture the nearest enemy-owned factory only. */
    CAPTURE_ENEMY_FACTORY   = 'capture_enemy_factory',
    /** Capture the nearest neutral (unowned) factory only. */
    CAPTURE_NEUTRAL_FACTORY = 'capture_neutral_factory',
    /** Capture the nearest non-owned warbase (enemy or neutral). */
    CAPTURE_WARBASE         = 'capture_warbase',
    /** Capture the nearest enemy-owned warbase only. */
    CAPTURE_ENEMY_WARBASE   = 'capture_enemy_warbase',
    /** Capture the nearest neutral (unowned) warbase only. */
    CAPTURE_NEUTRAL_WARBASE = 'capture_neutral_warbase',
    /** Stay in place; no movement target. */
    DEFEND                  = 'defend',
}
export type RobotAI = 'dummy' | 'advanced';

export enum NavMode {
    /** Greedy movement: head directly toward the goal by Manhattan distance. */
    GOAL        = 'goal',
    /** Bug2 wall-follow: hug the obstacle (right-hand rule) until the path to the goal is clear. */
    WALL_FOLLOW = 'wall_follow',
}

/** Runtime navigation + movement state — kept in one sub-object so it is easy to inspect or reset. */
export interface NavState {
    // terrain speed accumulator (all chassis types)
    slowCounter?: number;
    // Bug2 wall-follow state (h-electronics / e-electronics)
    stuckTicks?: number;
    stuckCheckDist?: number;
    navMode?: NavMode;
    wallFollowStartDist?: number;
    // Trémaux state
    visitCounts?: Map<string, number>; // visit count per position key (0.25-cell resolution, permanent)
}

// All non-robot map objects (tiles, structures, walls)
export type StructureType =
    | 'tile'
    | 'factory' | 'warbase'
    | 'wall1' | 'wall2' | 'wall3' | 'wall4' | 'wall5' | 'wall6'
    | 'fence';

interface ObjectBase { id: string; x: number; y: number; }

export { Owner };

// Mobile unit — robot-specific fields
export interface RobotObject extends ObjectBase {
    type: 'robot';
    owner: Owner;
    facing?: Direction;
    robotConfig?: RobotConfig;
    goal?: RobotGoal;
    ai?: RobotAI;
    health?: number;
    lastFiredAt?: number;
    lastMovedAt?: number;
    lastRotatedAt?: number;
    dyingTicks?: number;
    captureCounter?: number;
    nav?: NavState;
}

// Static map object (tile, factory, warbase, wall, fence)
export interface MapObject extends ObjectBase {
    type: StructureType;
    owner?: Owner;
    subtype?: string;
    captureCounter?: number;
}

export type WarObject = RobotObject | MapObject;

export function isRobot(obj: WarObject): obj is RobotObject { return obj.type === 'robot'; }
export function isMapObj(obj: WarObject): obj is MapObject  { return obj.type !== 'robot'; }

export interface WarMap {
    width: number;
    height: number;
    objects: WarObject[];
    tick?: number;
    projectiles?: Projectile[];
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
            type: obj.type as StructureType,
            x: obj.x,
            y: obj.y,
            owner: obj.owner !== undefined ? obj.owner : Owner.NEUTRAL,
            ...(obj.subtype ? { subtype: obj.subtype } : {}),
        });
    });

    return { width: mapData.width, height: mapData.height, objects, projectiles: [] };
}

export function removeObject(warMap: WarMap, id: string): void {
    warMap.objects = warMap.objects.filter(o => o.id !== id);
}

export function findLastByType(warMap: WarMap, type: string): WarObject | undefined {
    return [...warMap.objects].reverse().find(o => o.type === type);
}

// Cycles owner: NEUTRAL → RED → BLUE → NEUTRAL (undefined is treated as NEUTRAL)
export function cycleOwner(obj: WarObject): void {
    if (!obj.owner)                    obj.owner = Owner.RED;
    else if (obj.owner === Owner.RED)  obj.owner = Owner.BLUE;
    else                               obj.owner = Owner.NEUTRAL;
}
