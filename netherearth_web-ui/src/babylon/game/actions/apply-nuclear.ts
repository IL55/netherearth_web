import { ObjectType } from '../core/warmap';
import type { WarMap, RobotObject } from '../core/warmap';

/** Chebyshev radius of the instant-kill zone (3×3 area centred on the blast). */
export const NUKE_KILL_RADIUS = 1;
/** Chebyshev radius of the half-damage zone (5×5 area, outside the kill zone). */
export const NUKE_DAMAGE_RADIUS = 2;

/** Width in tiles of a factory's bounding box (x … x+1). */
export const FACTORY_FOOTPRINT_WIDTH = 2;
/** Width in tiles of a warbase's bounding box (x … x+4). */
export const WARBASE_FOOTPRINT_WIDTH = 5;
/** Height in tiles shared by both factory and warbase bounding boxes (y … y+2). */
export const STRUCTURE_FOOTPRINT_HEIGHT = 3;

/**
 * Detonates the nuclear bomb equipped on the given robot.
 * Effects:
 * - 3x3 Kill Zone: The 3x3 area centered on the robot is completely destroyed.
 *   - All robots inside this area are instantly killed.
 *   - Fences and walls turn to sand.
 *   - If any block of a factory or warbase falls within this area, the entire structure is destroyed and turns to sand.
 * - 5x5 Damage Zone: Any robot located within the 5x5 area (but outside the 3x3 kill zone) receives 50% damage.
 */
export function applyNuclear(robot: RobotObject, warMap: WarMap): boolean {
    if (!robot.robotConfig.nuclear) return false;

    const rx = Math.round(robot.x);
    const ry = Math.round(robot.y);

    const objectsToRemove: Set<string> = new Set();
    const newSandTiles: {x: number, y: number}[] = [];

    for (const obj of warMap.robots) {
        if (obj === robot) continue; // we will kill the detonating robot anyway

        const dx = Math.abs(Math.round(obj.x) - rx);
        const dy = Math.abs(Math.round(obj.y) - ry);
        const chebyshev = Math.max(dx, dy);

        if (chebyshev <= NUKE_KILL_RADIUS) {
            obj.health = 0;
        } else if (chebyshev <= NUKE_DAMAGE_RADIUS) {
            obj.health = Math.max(0, Math.floor(obj.health / 2));
        }
    }

    for (const obj of warMap.tiles) {
        const dx = Math.abs(Math.round(obj.x) - rx);
        const dy = Math.abs(Math.round(obj.y) - ry);
        const chebyshev = Math.max(dx, dy);

        if (obj.type === ObjectType.FACTORY || obj.type === ObjectType.WARBASE) {
            // Check if ANY block of the structure is within the 3x3 Kill Zone.
            // Factories and warbases are represented by the top-left coordinate, but they span multiple blocks.
            // A factory is roughly 2x3 blocks, a warbase is roughly 5x3 blocks.
            // Rather than hardcoding the exact shapes here, we can approximate or use a bounding box approach.
            // Factory is 2x3: x to x+1, y to y+2
            // Warbase is 5x3: x to x+4, y to y+2
            let intersects = false;
            const width  = obj.type === ObjectType.FACTORY ? FACTORY_FOOTPRINT_WIDTH : WARBASE_FOOTPRINT_WIDTH;
            const height = STRUCTURE_FOOTPRINT_HEIGHT;

            for (let bx = Math.round(obj.x); bx < Math.round(obj.x) + width; bx++) {
                for (let by = Math.round(obj.y); by < Math.round(obj.y) + height; by++) {
                    // Quick overlap check for the 3x3 area
                    if (Math.abs(bx - rx) <= NUKE_KILL_RADIUS && Math.abs(by - ry) <= NUKE_KILL_RADIUS) {
                        intersects = true;
                        break;
                    }
                }
                if (intersects) break;
            }

            if (intersects) {
                objectsToRemove.add(obj.id);
                // Turn structure's footprint to sand
                for (let bx = Math.round(obj.x); bx < Math.round(obj.x) + width; bx++) {
                    for (let by = Math.round(obj.y); by < Math.round(obj.y) + height; by++) {
                        newSandTiles.push({x: bx, y: by});
                    }
                }
            }
        } else if (
            obj.type === ObjectType.FENCE ||
            obj.type === ObjectType.WALL1 ||
            obj.type === ObjectType.WALL2 ||
            obj.type === ObjectType.WALL3 ||
            obj.type === ObjectType.WALL4 ||
            obj.type === ObjectType.WALL5 ||
            obj.type === ObjectType.WALL6 ||
            obj.type === ObjectType.ROCKS ||
            obj.type === ObjectType.HEAVYROCKS
        ) {
            if (chebyshev <= NUKE_KILL_RADIUS) {
                objectsToRemove.add(obj.id);
                newSandTiles.push({x: Math.round(obj.x), y: Math.round(obj.y)});
            }
        }
    }

    // Kill the detonating robot
    robot.health = 0;
    robot.robotConfig.nuclear = false; // it is used

    // Remove destroyed structures
    warMap.tiles = warMap.tiles.filter(o => !objectsToRemove.has(o.id));
    warMap.robots = warMap.robots.filter(o => !objectsToRemove.has(o.id));

    // Turn tiles to sand
    for (const sand of newSandTiles) {
        const tile = warMap.tiles.find(o => o.type === ObjectType.TILE && o.x === sand.x && o.y === sand.y);
        if (tile && 'subtype' in tile) {
            tile.subtype = 'S'; // TileSubtype.SAND
        }
    }

    return true;
}
