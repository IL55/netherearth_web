import { ObjectType } from '../types/object-type';
import type { WarMap, RobotObject, MapObject } from '../core/warmap';
import { TileSubtype } from '../core/terrain';

import { SAND_THRESHOLD, MOUNTAIN_THRESHOLD, WALL_THRESHOLD } from '../config';

function posKey(x: number, y: number): string {
    return `${Math.round(x)},${Math.round(y)}`;
}

function tileAt(warMap: WarMap, x: number, y: number): MapObject | undefined {
    const rx = Math.round(x);
    const ry = Math.round(y);
    return warMap.tiles.find(
        o => o.type === ObjectType.TILE && Math.round(o.x) === rx && Math.round(o.y) === ry,
    );
}

export function recordKill(warMap: WarMap, robot: RobotObject): void {
    if (!warMap.killCounts) warMap.killCounts = {};

    const key = posKey(robot.x, robot.y);
    const count = (warMap.killCounts[key] ?? 0) + 1;
    warMap.killCounts[key] = count;

    const tile = tileAt(warMap, robot.x, robot.y);

    if (count === SAND_THRESHOLD && tile && tile.subtype === TileSubtype.GRASS) {
        tile.subtype = TileSubtype.SAND;
    } else if (count === MOUNTAIN_THRESHOLD && tile && (tile.subtype === TileSubtype.SAND || tile.subtype === TileSubtype.SAND2)) {
        tile.subtype = TileSubtype.MOUNTAIN;
    } else if (count === WALL_THRESHOLD && tile && tile.subtype === TileSubtype.MOUNTAIN) {
        const rx = Math.round(robot.x);
        const ry = Math.round(robot.y);
        const id = `wall_kill_${key}`;
        if (!warMap.tiles.some(t => t.id === id)) {
            warMap.tiles.push({ id, type: ObjectType.WALL1, x: rx, y: ry });
        }
    }
}
