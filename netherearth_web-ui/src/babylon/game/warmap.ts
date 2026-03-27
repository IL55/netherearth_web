import type { RobotConfig } from '../data/robot';
import { Owner } from './owner';
import { Direction, CW_DIRS } from './direction';
import { ObjectType } from './object-type';
import { RobotGoal } from './robot-goal';
import { NavMode } from './nav-mode';
import { WeaponType } from './weapon-type';
import {
    isRobot,
    isMapObj,
    createWarMap,
    removeObject,
    findLastByType,
    cycleOwner,
} from './utils';

export {
    Direction,
    CW_DIRS,
    ObjectType,
    RobotGoal,
    NavMode,
    WeaponType,
    isRobot,
    isMapObj,
    createWarMap,
    removeObject,
    findLastByType,
    cycleOwner,
};

export interface Projectile {
    id: string;
    weaponType: WeaponType;
    fromX: number; fromY: number;
    toX:   number; toY:   number;
    progress: number; // 0.0 → 1.0
    step:     number; // progress added per sub-tick
    ownerId: string;
}

export type RobotAI = 'dummy' | 'advanced';

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
export type StructureType = Exclude<ObjectType, ObjectType.ROBOT>;

interface ObjectBase { id: string; x: number; y: number; }

export { Owner };

// Mobile unit — robot-specific fields
export interface RobotObject extends ObjectBase {
    type: ObjectType.ROBOT;
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

export interface WarMap {
    width: number;
    height: number;
    objects: WarObject[];
    tick?: number;
    projectiles?: Projectile[];
}
