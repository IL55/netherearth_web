import { describe, it, expect } from 'vitest';
import { applyNuclear } from '../../../game/actions/apply-nuclear';
import { ObjectType, Owner } from '../../../game/core/warmap';
import type { WarMap, MapObject, RobotObject } from '../../../game/core/warmap';
import { Chassis } from '../../../data/robot';


function createMapWithObjects(objects: Array<any>): WarMap {
    return { width: 10, height: 10, tiles: objects.filter((o: any) => o.type !== ObjectType.ROBOT), robots: objects.filter((o: any) => o.type === ObjectType.ROBOT), projectiles: [], killCounts: {}, tick: 0 } as any;
}

describe('applyNuclear', () => {
    it('returns false if robot has no nuclear bomb', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS },
        };
        const warMap = createMapWithObjects([robot]);
        const result = applyNuclear(robot, warMap);
        expect(result).toBe(false);
    });

    it('kills robots in 3x3 zone and damages robots in 5x5 zone', () => {
        const detonator: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
            health: 100,
        };

        const in3x3: RobotObject = {
            id: 'r2', type: ObjectType.ROBOT, x: 4, y: 6, owner: Owner.BLUE,
            robotConfig: { chassis: Chassis.TRACKS },
            health: 100,
        };

        const in5x5: RobotObject = {
            id: 'r3', type: ObjectType.ROBOT, x: 3, y: 7, owner: Owner.BLUE,
            robotConfig: { chassis: Chassis.TRACKS },
            health: 100,
        };

        const outside: RobotObject = {
            id: 'r4', type: ObjectType.ROBOT, x: 2, y: 8, owner: Owner.BLUE,
            robotConfig: { chassis: Chassis.TRACKS },
            health: 100,
        };

        const warMap = createMapWithObjects([detonator, in3x3, in5x5, outside]);
        const result = applyNuclear(detonator, warMap);

        expect(result).toBe(true);
        expect(detonator.health).toBe(0); // Detonator dies
        expect(in3x3.health).toBe(0);     // In 3x3 kill zone
        expect(in5x5.health).toBe(50);    // In 5x5 damage zone (receives 50% damage)
        expect(outside.health).toBe(100); // Outside
    });

    it('destroys walls and replaces them with sand', () => {
        const detonator: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };

        const wall: MapObject = {
            id: 'w1', type: ObjectType.WALL1, x: 4, y: 5
        };

        const tile: MapObject = {
            id: 't_4_5', type: ObjectType.TILE, x: 4, y: 5, subtype: 'G'
        };

        const warMap = createMapWithObjects([detonator, wall, tile]);
        applyNuclear(detonator, warMap);

        // Wall should be removed
        expect(warMap.tiles.find(o => o.id === 'w1')).toBeUndefined();
        // Tile at x:4, y:5 should become 'S' (sand)
        const updatedTile = warMap.tiles.find(o => o.type === ObjectType.TILE && o.x === 4 && o.y === 5) as MapObject;
        expect(updatedTile.subtype).toBe('S');
    });

    it('destroys a factory if any part of it is in the 3x3 kill zone', () => {
        const detonator: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };

        // Factory top-left is at (3, 4). The factory spans width 2 (x:3-4) and height 3 (y:4-6)
        // Its block at (4, 5) intersects with the 3x3 zone centered on (5, 5).
        const factory: MapObject = {
            id: 'f1', type: ObjectType.FACTORY, x: 3, y: 4
        };

        const tile1: MapObject = { id: 't_3_4', type: ObjectType.TILE, x: 3, y: 4, subtype: 'G' };
        const tile2: MapObject = { id: 't_4_6', type: ObjectType.TILE, x: 4, y: 6, subtype: 'G' };

        const warMap = createMapWithObjects([detonator, factory, tile1, tile2]);
        applyNuclear(detonator, warMap);

        // Factory should be removed entirely
        expect(warMap.tiles.find(o => o.id === 'f1')).toBeUndefined();

        // Its footprint should be converted to sand
        const t1 = warMap.tiles.find(o => o.id === 't_3_4') as MapObject;
        const t2 = warMap.tiles.find(o => o.id === 't_4_6') as MapObject;
        expect(t1.subtype).toBe('S');
        expect(t2.subtype).toBe('S');
    });
});
