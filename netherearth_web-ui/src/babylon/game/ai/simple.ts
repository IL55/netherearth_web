/**
 * Simple AI — main entry point for robot decision-making.
 *
 * Orchestrates combat (fight.ts) and navigation (bug2.ts / tremaux.ts).
 * Selects the navigation algorithm based on robotConfig.navAlgo:
 *   - NavAlgo.TREMAUX → Trémaux sliding-window algorithm
 *   - default (BUG2 or absent) → Bug2 wall-follow
 *
 * Also owns target selection (findTarget) and capture-zone resolution (targetPos).
 */
import { ObjectType } from '../core/warmap';
import { RobotGoal } from '../core/warmap';
import { CW_DIRS } from '../core/warmap';
import { Direction } from '../core/warmap';
import type { WarMap, WarObject, RobotObject, MapObject } from '../core/warmap';
import type { OccupancyMap } from '../core/occupancy';
import { ActionType, RotateDir, type RobotAction } from '../actions';
import { CAPTURE_ZONES, isInCaptureZone } from '../mechanics/capture';
import { dirDelta, isPassable } from './nav';
import { fightAction } from './fight';
import { NavAlgo } from './nav-algo';
import { bug2Dirs } from './bug2';
import { recordCell, tremauxDirs } from './tremaux';
import { shouldDetonateNuclear } from './nuclear';

/**
 * State changes the AI wants to apply to a robot, separate from the game
 * action (MOVE, ROTATE, FIRE, etc.).
 *
 * Note: robot.nav.visitCounts (Trémaux memory) is intentionally excluded —
 * it must be updated before tremauxDirs() reads it within the same call.
 */
export interface AIStateUpdate {
    goal?: RobotGoal;
    clearGoalPosition?: true;
    clearMoveOut?: true;
}

export interface AIResult {
    action: RobotAction;
    stateUpdate?: AIStateUpdate;
}

export function applyAIStateUpdate(robot: RobotObject, update: AIStateUpdate | undefined): void {
    if (!update) return;
    if (update.goal !== undefined)  robot.goal = update.goal;
    if (update.clearGoalPosition)   robot.goalPosition = undefined;
    if (update.clearMoveOut && robot.nav) delete robot.nav.moveOutTarget;
}

function findTarget(robot: RobotObject, warMap: WarMap): WarObject | undefined {
    let candidates: WarObject[] = [];
    if (robot.goal === RobotGoal.ATTACK_ROBOTS) {
        candidates = warMap.robots.filter(o => o.owner !== robot.owner);
    } else {
        candidates = warMap.tiles.filter(o => {
            if (robot.goal === RobotGoal.CAPTURE_FACTORY)         return o.type === ObjectType.FACTORY && o.owner !== robot.owner;
            if (robot.goal === RobotGoal.CAPTURE_ENEMY_FACTORY)   return o.type === ObjectType.FACTORY && !!o.owner && o.owner !== robot.owner;
            if (robot.goal === RobotGoal.CAPTURE_NEUTRAL_FACTORY) return o.type === ObjectType.FACTORY && !o.owner;
            if (robot.goal === RobotGoal.CAPTURE_WARBASE)         return o.type === ObjectType.WARBASE && o.owner !== robot.owner;
            if (robot.goal === RobotGoal.CAPTURE_ENEMY_WARBASE)   return o.type === ObjectType.WARBASE && !!o.owner && o.owner !== robot.owner;
            if (robot.goal === RobotGoal.CAPTURE_NEUTRAL_WARBASE) return o.type === ObjectType.WARBASE && !o.owner;
            if (robot.goal === RobotGoal.NUKE_FACTORY)            return o.type === ObjectType.FACTORY && !!o.owner && o.owner !== robot.owner;
            if (robot.goal === RobotGoal.NUKE_WARBASE)            return o.type === ObjectType.WARBASE && !!o.owner && o.owner !== robot.owner;
            return false;
        });
    }
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, c) => {
        const d  = Math.abs(c.x - robot.x) + Math.abs(c.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? c : best;
    });
}

function targetPos(target: MapObject): { x: number; y: number } {
    const zone = CAPTURE_ZONES[target.type];
    if (zone) return { x: target.x + zone.dx, y: target.y + zone.dy };
    return { x: target.x, y: target.y };
}

export function simpleAI(robot: RobotObject, warMap: WarMap, occupancy: OccupancyMap): AIResult {
    const su: AIStateUpdate = {};
    const r = (action: RobotAction): AIResult => {
        const hasUpdate = Object.keys(su).length > 0;
        return { action, stateUpdate: hasUpdate ? su : undefined };
    };

    // 0. Nuclear check (random chance, e.g. when close to multiple enemies)
    if (shouldDetonateNuclear(robot, warMap, false)) {
        return r({ type: ActionType.DETONATE });
    }

    // 1. Combat: fire or advance toward a visible enemy
    const combat = fightAction(robot, warMap, occupancy);
    if (combat) return r(combat);

    // 2. Waypoint goals (MOVE_FORWARD / MOVE_BACKWARD)
    if (robot.goal === RobotGoal.MOVE_FORWARD || robot.goal === RobotGoal.MOVE_BACKWARD) {
        if (!robot.goalPosition) return r({ type: ActionType.IDLE });
        const { x: wx, y: wy } = robot.goalPosition;
        if (Math.abs(robot.x - wx) + Math.abs(robot.y - wy) < 0.3) {
            su.goal = RobotGoal.DEFEND;
            su.clearGoalPosition = true;
            return r({ type: ActionType.IDLE });
        }
        const facing = robot.facing;
        const dirs = bug2Dirs(robot, warMap, occupancy, wx, wy,
            Math.abs(robot.x - wx) + Math.abs(robot.y - wy));
        for (const dir of dirs) {
            const { dx, dy } = dirDelta(dir);
            if (!isPassable(warMap, occupancy, robot, robot.x + dx, robot.y + dy)) continue;
            if (facing === dir) return r({ type: ActionType.MOVE, direction: dir });
            const steps = (CW_DIRS.indexOf(dir) - CW_DIRS.indexOf(facing) + 4) % 4;
            return r({ type: ActionType.ROTATE, direction: steps <= 2 ? RotateDir.RIGHT : RotateDir.LEFT });
        }
        return r({ type: ActionType.IDLE });
    }

    // 3. Goal navigation
    let tx = robot.x, ty = robot.y;
    let isMoveOut = false;

    if (robot.nav?.moveOutTarget) {
        tx = robot.nav.moveOutTarget.x;
        ty = robot.nav.moveOutTarget.y;
        isMoveOut = true;
        // If we reached the target or very close to it, schedule a clear.
        if (Math.abs(robot.x - tx) + Math.abs(robot.y - ty) < 0.1) {
            su.clearMoveOut = true;
            isMoveOut = false;
        }
    }

    if (!isMoveOut) {
        const target = findTarget(robot, warMap);
        if (!target) return r({ type: ActionType.IDLE });

        const isNukeGoal = robot.goal === RobotGoal.NUKE_FACTORY || robot.goal === RobotGoal.NUKE_WARBASE;

        // Already in the capture zone — hold position to complete capture (not for nuke goals)
        if (!isNukeGoal && CAPTURE_ZONES[target.type] && isInCaptureZone(robot, target as MapObject)) {
            return r({ type: ActionType.IDLE });
        }

        // Nuke goals navigate to the structure center; capture goals use the capture slot
        const pos = isNukeGoal ? { x: target.x, y: target.y } : targetPos(target as MapObject);
        tx = pos.x;
        ty = pos.y;
    }

    const facing = robot.facing;

    let dirsToTry: Direction[];
    if (isMoveOut) {
        // Just use greedy directions for the initial move out
        dirsToTry = bug2Dirs(robot, warMap, occupancy, tx, ty, Math.abs(robot.x - tx) + Math.abs(robot.y - ty));
    } else if (robot.robotConfig.navAlgo === NavAlgo.TREMAUX) {
        recordCell(robot); // must run before tremauxDirs reads visitCounts
        dirsToTry = tremauxDirs(robot, warMap, occupancy, tx, ty);
    } else {
        dirsToTry = bug2Dirs(robot, warMap, occupancy, tx, ty,
            Math.abs(robot.x - tx) + Math.abs(robot.y - ty));
    }

    for (const dir of dirsToTry) {
        const { dx, dy } = dirDelta(dir);
        if (!isPassable(warMap, occupancy, robot, robot.x + dx, robot.y + dy)) continue;

        if (facing === dir) return r({ type: ActionType.MOVE, direction: dir });
        const steps = (CW_DIRS.indexOf(dir) - CW_DIRS.indexOf(facing) + 4) % 4;
        return r({ type: ActionType.ROTATE, direction: steps <= 2 ? RotateDir.RIGHT : RotateDir.LEFT });
    }

    // Stuck (no passable directions). If equipped with nuclear, detonate if targets are nearby.
    if (shouldDetonateNuclear(robot, warMap, true)) {
        return r({ type: ActionType.DETONATE });
    }

    return r({ type: ActionType.IDLE });
}

/**
 * Convenience wrapper: runs simpleAI, applies the state update, and returns
 * only the game action. Use this in tests and any caller that doesn't need
 * to inspect AIStateUpdate directly.
 */
export function stepSimpleAI(robot: RobotObject, warMap: WarMap, occupancy: OccupancyMap): RobotAction {
    const { action, stateUpdate } = simpleAI(robot, warMap, occupancy);
    applyAIStateUpdate(robot, stateUpdate);
    return action;
}
