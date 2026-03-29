import { ObjectType } from '../types/object-type';
import type { WarMap, RobotObject, MapObject } from '../core/warmap';

// Terrain upgrade thresholds (cumulative kills at a position):
//   1st kill  → grass becomes sand
//   4th kill  → sand becomes mountains  (3 more kills while on sand)
//   7th kill  → mountains get a wall    (3 more kills while on mountains)

const SAND_THRESHOLD     = 1;
const MOUNTAIN_THRESHOLD = 4;
const WALL_THRESHOLD     = 7;

function posKey(x: number, y: number): string {
    return `${Math.round(x)},${Math.round(y)}`;
}

function tileAt(warMap: WarMap, x: number, y: number): MapObject | undefined {
    const rx = Math.round(x);
    const ry = Math.round(y);
    return warMap.objects.find(
        o => o.type === ObjectType.TILE && Math.round(o.x) === rx && Math.round(o.y) === ry,
    ) as MapObject | undefined;
}

export function recordKill(warMap: WarMap, robot: RobotObject): void {
    if (!warMap.killCounts) warMap.killCounts = {};

    const key = posKey(robot.x, robot.y);
    const count = (warMap.killCounts[key] ?? 0) + 1;
    warMap.killCounts[key] = count;

    const tile = tileAt(warMap, robot.x, robot.y);

    if (count === SAND_THRESHOLD && tile && tile.subtype === 'G') {
        tile.subtype = 'S';
    } else if (count === MOUNTAIN_THRESHOLD && tile && (tile.subtype === 'S' || tile.subtype === 'S2')) {
        tile.subtype = 'M';
    } else if (count === WALL_THRESHOLD && tile && tile.subtype === 'M') {
        const rx = Math.round(robot.x);
        const ry = Math.round(robot.y);
        const wall: MapObject = {
            id: `wall_kill_${key}`,
            type: ObjectType.WALL1,
            x: rx,
            y: ry,
        };
        warMap.objects.push(wall);
    }
}
