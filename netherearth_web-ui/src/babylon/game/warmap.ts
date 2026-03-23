import type { MapData } from '../data/map';
import type { RobotConfig } from '../data/robot';

export type WeaponType = 'cannon' | 'missile' | 'phaser';

export interface Projectile {
    id: string;
    weaponType: WeaponType;
    fromX: number; fromY: number;
    toX:   number; toY:   number;
    progress: number; // 0.0 → 1.0; advances each sub-tick by 1/SUB_TICKS
    ownerId: string;
}

export type RobotGoal =
    | 'attack_robots'
    | 'capture_factory'         // any non-owned factory (enemy or neutral)
    | 'capture_enemy_factory'   // enemy-owned factories only
    | 'capture_neutral_factory' // neutral (unowned) factories only
    | 'capture_warbase'         // any non-owned warbase (enemy or neutral)
    | 'capture_enemy_warbase'   // enemy-owned warbases only
    | 'capture_neutral_warbase' // neutral (unowned) warbases only
    | 'defend';
export type RobotAI   = 'dummy' | 'advanced';

export interface WarObject {
    id: string;
    type: string;       // 'tile' | 'factory' | 'warbase' | 'robot' | 'wall*' | 'fence'
    x: number;
    y: number;
    owner?: number;     // 1=red (right flag), 2=blue (left flag), absent=neutral
    subtype?: string;   // tile type (e.g. 'G'), factory subtype
    rotation?: number;  // robot facing (radians)
    robotConfig?: RobotConfig;
    goal?: RobotGoal;
    ai?: RobotAI;
    health?: number;         // hit points 1–100, derived from robot parts at creation; decreases when hit
    lastFiredAt?: number;    // warMap.tick when this robot last fired (for weapon cooldown)
    dyingTicks?: number;     // countdown for death-blink animation; robot removed when it reaches 0
    slowCounter?: number;    // ticks accumulated for terrain speed penalty
    captureCounter?: number; // ticks a robot has been in this structure's capture zone
    stuckTicks?: number;          // consecutive ticks with no progress toward goal (distance not decreasing)
    stuckCheckDist?: number;      // last recorded Manhattan distance to goal — used to detect stagnation
    navMode?: 'goal' | 'wall_follow'; // 'wall_follow' = boundary tracing when stuck (Bug2-style)
    wallFollowStartDist?: number; // dist to goal when wall_follow mode was entered; exit when dist falls below this
}

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
            type: obj.type,
            x: obj.x,
            y: obj.y,
            ...(obj.owner !== undefined ? { owner: obj.owner } : {}),
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

// Moves all robots 1 unit forward in their facing direction
export function moveRobotsForward(warMap: WarMap): void {
    warMap.objects
        .filter(o => o.type === 'robot')
        .forEach(o => {
            const r = o.rotation ?? 0;
            o.x += Math.round(Math.sin(r));
            o.y += Math.round(Math.cos(r));
        });
}
