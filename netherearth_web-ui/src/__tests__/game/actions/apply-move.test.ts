import { describe, it, expect } from 'vitest';
import { applyMove } from '../../../game/actions/apply-move';
import { ObjectType, Direction } from '../../../game/core/warmap';
import type { WarMap, MapObject, RobotObject } from '../../../game/core/warmap';
import { Chassis } from '../../../data/robot';
import { buildOccupancy } from '../../../game/core/occupancy';

function createMapWithTiles(tiles: Array<{ x: number; y: number; subtype: string }>): WarMap {
    const mapTiles: MapObject[] = tiles.map(t => ({
        id: `t_${t.x}_${t.y}`,
        type: ObjectType.TILE,
        x: t.x,
        y: t.y,
        subtype: t.subtype,
    }));
    return {
        width: 10,
        height: 10,
        tiles: mapTiles,
        robots: [],
        projectiles: [], killCounts: {},
        tick: 0,
    };
}

describe('applyMove', () => {
    it('blocks a bipod robot from stepping into a mountain when its body overlaps it', () => {
        // Create a map where tile (4,0) is grass and (5,0) is mountains (impassable for bipod).
        // A robot centered at x=4.0 will try to move East to x=4.25.
        // Even though 4.25 is in tile 4, its body [-0.5, 0.5] spans up to 4.75, which overlaps tile 5.
        const warMap = createMapWithTiles([
            { x: 3, y: 0, subtype: 'G' }, // Grass
            { x: 4, y: 0, subtype: 'G' }, // Grass
            { x: 5, y: 0, subtype: 'M' }, // Mountains
        ]);

        const robot: RobotObject = {
            id: 'r1',
            type: ObjectType.ROBOT,
            x: 4.0,
            y: 0.0,
            owner: 0,
            facing: Direction.E,
            robotConfig: {
                chassis: Chassis.BIPOD,
            },
        };

        warMap.robots.push(robot);
        const occupancy = buildOccupancy(warMap);

        // Attempt to move East. The new position will be x=4.25.
        // It should be blocked because a bipod cannot walk on mountains,
        // and at x=4.25, the bounding box overlaps x=4.75 which belongs to tile 5 (mountains).
        robot.nav = { slowCounter: 1 }; // Bipod has speed factor 0.5 on grass, make it move immediately
        const success = applyMove(robot, Direction.E, warMap, occupancy, 100);

        expect(success).toBe(false);
        expect(robot.x).toBe(4.0); // Should not move
    });

    it('allows move if entirely on passable terrain', () => {
        const warMap = createMapWithTiles([
            { x: 3, y: 0, subtype: 'G' }, // Grass
            { x: 4, y: 0, subtype: 'G' }, // Grass
            { x: 5, y: 0, subtype: 'G' }, // Grass
        ]);

        const robot: RobotObject = {
            id: 'r1',
            type: ObjectType.ROBOT,
            x: 4.0,
            y: 0.0,
            owner: 0,
            facing: Direction.E,
            robotConfig: {
                chassis: Chassis.BIPOD,
            },
        };

        warMap.robots.push(robot);
        const occupancy = buildOccupancy(warMap);

        robot.nav = { slowCounter: 1 }; // Bipod has speed factor 0.5 on grass, make it move immediately
        const success = applyMove(robot, Direction.E, warMap, occupancy, 100);

        expect(success).toBe(true);
        expect(robot.x).toBe(4.25); // Should move
    });
});
