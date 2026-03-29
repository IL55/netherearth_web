import type { RobotConfig } from '../../data/robot';
import { Owner } from '../types/owner';
import { Direction, CW_DIRS } from '../types/direction';
import { ObjectType } from '../types/object-type';
import { RobotGoal } from '../types/robot-goal';
import { NavMode } from '../types/nav-mode';
import { WeaponType } from '../types/weapon-type';
import { RobotAI } from '../types/robot-ai';
import type { Projectile } from '../types/projectile-type';
import type { NavState } from '../types/nav-state';
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
    RobotAI,
    isRobot,
    isMapObj,
    createWarMap,
    removeObject,
    findLastByType,
    cycleOwner,
};

export type { Projectile, NavState };

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
    killCounts?: Record<string, number>;
}
