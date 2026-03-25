/**
 * Dummy AI — main entry point for robot decision-making.
 *
 * Orchestrates combat (fight.ts) and navigation (bug2.ts / tremaux.ts).
 * Selects the navigation algorithm based on robotConfig.navAlgo:
 *   - NavAlgo.TREMAUX → Trémaux sliding-window algorithm
 *   - default (BUG2 or absent) → Bug2 wall-follow
 *
 * Also owns target selection (findTarget) and capture-zone resolution (targetPos).
 */
import { RobotGoal } from '../warmap';
import { CW_DIRS } from '../warmap';
import type { WarMap, WarObject, RobotObject, Direction } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { ActionType, RotateDir, type RobotAction } from '../actions';
import { CAPTURE_ZONES } from '../capture';
import { dirDelta, isPassable } from './nav';
import { fightAction } from './fight';
import { NavAlgo } from './nav-algo';
import { bug2Dirs } from './bug2';
import { recordCell, tremauxDirs } from './tremaux';

function findTarget(robot: RobotObject, warMap: WarMap): WarObject | undefined {
    const candidates = warMap.objects.filter(o => {
        if (robot.goal === RobotGoal.ATTACK_ROBOTS)           return o.type === 'robot'   && o.owner !== robot.owner;
        if (robot.goal === RobotGoal.CAPTURE_FACTORY)         return o.type === 'factory' && o.owner !== robot.owner;
        if (robot.goal === RobotGoal.CAPTURE_ENEMY_FACTORY)   return o.type === 'factory' && !!o.owner && o.owner !== robot.owner;
        if (robot.goal === RobotGoal.CAPTURE_NEUTRAL_FACTORY) return o.type === 'factory' && !o.owner;
        if (robot.goal === RobotGoal.CAPTURE_WARBASE)         return o.type === 'warbase' && o.owner !== robot.owner;
        if (robot.goal === RobotGoal.CAPTURE_ENEMY_WARBASE)   return o.type === 'warbase' && !!o.owner && o.owner !== robot.owner;
        if (robot.goal === RobotGoal.CAPTURE_NEUTRAL_WARBASE) return o.type === 'warbase' && !o.owner;
        return false;
    });
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, c) => {
        const d  = Math.abs(c.x - robot.x) + Math.abs(c.y - robot.y);
        const db = Math.abs(best.x - robot.x) + Math.abs(best.y - robot.y);
        return d < db ? c : best;
    });
}

function targetPos(target: WarObject): { x: number; y: number } {
    const zone = CAPTURE_ZONES[target.type];
    if (zone) return { x: target.x + zone.dx, y: target.y + zone.dy };
    return { x: target.x, y: target.y };
}

export function dummyAI(robot: RobotObject, warMap: WarMap, occupancy: OccupancyMap): RobotAction {
    // 1. Combat: fire or advance toward a visible enemy
    const combat = fightAction(robot, warMap, occupancy);
    if (combat) return combat;

    // 2. Goal navigation
    const target = findTarget(robot, warMap);
    if (!target) return { type: ActionType.IDLE };

    const { x: tx, y: ty } = targetPos(target);
    const facing = robot.facing ?? 'N';

    let dirsToTry: Direction[];
    if (robot.robotConfig?.navAlgo === NavAlgo.TREMAUX) {
        recordCell(robot);
        dirsToTry = tremauxDirs(robot, warMap, occupancy, tx, ty);
    } else {
        dirsToTry = bug2Dirs(robot, warMap, occupancy, tx, ty,
            Math.abs(robot.x - tx) + Math.abs(robot.y - ty));
    }

    for (const dir of dirsToTry) {
        const { dx, dy } = dirDelta(dir);
        if (!isPassable(warMap, occupancy, robot, robot.x + dx, robot.y + dy)) continue;

        if (facing === dir) return { type: ActionType.MOVE, direction: dir };
        const steps = (CW_DIRS.indexOf(dir) - CW_DIRS.indexOf(facing) + 4) % 4;
        return { type: ActionType.ROTATE, direction: steps <= 2 ? RotateDir.RIGHT : RotateDir.LEFT };
    }

    return { type: ActionType.IDLE };
}
