import { ObjectType } from '../core/warmap';
import { Direction } from "../core/warmap";
import type { WarMap, RobotObject, MapObject } from '../core/warmap';
import type { OccupancyMap } from '../core/occupancy';
import { isOccupied, updateRobotPosition } from '../core/occupancy';
import { getTerrainRule, Chassis } from '../core/terrain';
import { MOVE_STEP, MOVE_COOLDOWN } from './types';

// Map coordinate system:
//   x: 0 = west edge, increases eastward,  max center = width−1
//   y: 0 = north edge, increases southward, max center = height−1
// Tiles are centered at integer positions, so tile (x,y) occupies [x−0.5, x+0.5] in world space.
// Robot center is kept in [0, width−1] × [0, height−1]; body (±0.5) then stays within the tile grid.
const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
    N: { dx:  0, dy: -MOVE_STEP },
    S: { dx:  0, dy:  MOVE_STEP },
    E: { dx:  MOVE_STEP, dy:  0 },
    W: { dx: -MOVE_STEP, dy:  0 },
};

function getTileSubtype(warMap: WarMap, x: number, y: number): string {
    const tile = warMap.objects.find(
        (o): o is MapObject => o.type === ObjectType.TILE && o.x === Math.floor(x) && o.y === Math.floor(y),
    );
    return tile?.subtype ?? 'G';
}

export function isTerrainPassable(warMap: WarMap, tx: number, ty: number, chassis: Chassis): boolean {
    const EPSILON = 0.01;
    const xMin = Math.ceil(tx - 1 + EPSILON);
    const xMax = Math.floor(tx + 1 - EPSILON);
    const yMin = Math.ceil(ty - 1 + EPSILON);
    const yMax = Math.floor(ty + 1 - EPSILON);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            const subtype = getTileSubtype(warMap, x, y);
            if (!getTerrainRule(subtype, chassis).passable) {
                return false;
            }
        }
    }
    return true;
}

export function applyMove(
    robot: RobotObject,
    direction: Direction,
    warMap: WarMap,
    occupancy: OccupancyMap,
    tick: number,
): boolean {
    if ((robot.facing ?? Direction.N) !== direction) return false;
    if (tick - (robot.lastMovedAt ?? tick - MOVE_COOLDOWN) < MOVE_COOLDOWN) return false;

    const chassis = robot.robotConfig?.chassis ?? Chassis.TRACKS;
    const { dx, dy } = DIR_DELTA[direction];
    const tx = robot.x + dx;
    const ty = robot.y + dy;

    if (tx < 0 || tx > warMap.width - 1 || ty < 0 || ty > warMap.height - 1) return false;

    if (!isTerrainPassable(warMap, tx, ty, chassis)) return false;
    if (isOccupied(occupancy, tx, ty, robot.id)) return false;

    const rule = getTerrainRule(getTileSubtype(warMap, tx, ty), chassis);
    if (rule.speedFactor < 1) {
        robot.nav ??= {};
        robot.nav.slowCounter = (robot.nav.slowCounter ?? 0) + rule.speedFactor;
        if (robot.nav.slowCounter < 1) return false;
        robot.nav.slowCounter -= 1;
    }

    robot.x = tx;
    robot.y = ty;
    robot.lastMovedAt = tick;
    updateRobotPosition(occupancy, robot.id, tx, ty);
    return true;
}
