import { describe, it, expect } from 'vitest';
import { recordKill } from '../../../game/mechanics/kill-terrain';
import { ObjectType } from '../../../game/core/warmap';
import { Owner } from '../../../game/types/owner';
import type { WarMap, RobotObject, MapObject } from '../../../game/core/warmap';

function makeMap(tileSubtype = 'G'): WarMap {
    return {
        width: 10, height: 10,
        objects: [
            { id: 'tile_5_5', type: ObjectType.TILE, x: 5, y: 5, subtype: tileSubtype } as MapObject,
        ],
    };
}

function makeRobot(x = 5, y = 5): RobotObject {
    return { id: 'r1', type: ObjectType.ROBOT, x, y, owner: Owner.RED };
}

describe('recordKill — kill counting', () => {
    it('initialises killCounts if absent', () => {
        const map = makeMap();
        recordKill(map, makeRobot());
        expect(map.killCounts).toBeDefined();
    });

    it('increments the count for the position', () => {
        const map = makeMap();
        recordKill(map, makeRobot());
        recordKill(map, makeRobot());
        expect(map.killCounts!['5,5']).toBe(2);
    });

    it('tracks different positions independently', () => {
        const map = makeMap();
        map.objects.push({ id: 'tile_3_3', type: ObjectType.TILE, x: 3, y: 3, subtype: 'G' } as MapObject);
        recordKill(map, makeRobot(5, 5));
        recordKill(map, makeRobot(3, 3));
        expect(map.killCounts!['5,5']).toBe(1);
        expect(map.killCounts!['3,3']).toBe(1);
    });
});

describe('recordKill — grass → sand (1st kill)', () => {
    it('changes grass tile to sand on first kill', () => {
        const map = makeMap('G');
        recordKill(map, makeRobot());
        const tile = map.objects.find(o => o.type === ObjectType.TILE) as MapObject;
        expect(tile.subtype).toBe('S');
    });

    it('does not change non-grass tile on first kill', () => {
        const map = makeMap('M');
        recordKill(map, makeRobot());
        const tile = map.objects.find(o => o.type === ObjectType.TILE) as MapObject;
        expect(tile.subtype).toBe('M');
    });
});

describe('recordKill — sand → mountains (4th kill)', () => {
    it('changes sand tile to mountains on 4th kill', () => {
        const map = makeMap('G');
        // kill 1 → sand; kills 2-4 → mountains on 4th
        for (let i = 0; i < 4; i++) recordKill(map, makeRobot());
        const tile = map.objects.find(o => o.type === ObjectType.TILE) as MapObject;
        expect(tile.subtype).toBe('M');
    });

    it('upgrades S2 tile to mountains on 4th kill', () => {
        const map = makeMap('G');
        // Manually set to S2 after first kill
        recordKill(map, makeRobot()); // → S
        const tile = map.objects.find(o => o.type === ObjectType.TILE) as MapObject;
        tile.subtype = 'S2';
        // 3 more kills → mountains
        for (let i = 0; i < 3; i++) recordKill(map, makeRobot());
        expect(tile.subtype).toBe('M');
    });

    it('does not upgrade sand before 4th kill', () => {
        const map = makeMap('G');
        for (let i = 0; i < 3; i++) recordKill(map, makeRobot());
        const tile = map.objects.find(o => o.type === ObjectType.TILE) as MapObject;
        expect(tile.subtype).toBe('S');
    });
});

describe('recordKill — mountains → wall (7th kill)', () => {
    it('adds a wall object on 7th kill', () => {
        const map = makeMap('G');
        for (let i = 0; i < 7; i++) recordKill(map, makeRobot());
        const wall = map.objects.find(o => o.type === ObjectType.WALL1);
        expect(wall).toBeDefined();
        expect(wall!.x).toBe(5);
        expect(wall!.y).toBe(5);
    });

    it('does not add wall before 7th kill', () => {
        const map = makeMap('G');
        for (let i = 0; i < 6; i++) recordKill(map, makeRobot());
        const wall = map.objects.find(o => o.type === ObjectType.WALL1);
        expect(wall).toBeUndefined();
    });

    it('adds only one wall (not multiple)', () => {
        const map = makeMap('G');
        for (let i = 0; i < 9; i++) recordKill(map, makeRobot());
        const walls = map.objects.filter(o => o.type === ObjectType.WALL1);
        expect(walls).toHaveLength(1);
    });
});

describe('recordKill — no tile at position', () => {
    it('does not throw when there is no tile at robot position', () => {
        const map: WarMap = { width: 10, height: 10, objects: [] };
        expect(() => recordKill(map, makeRobot())).not.toThrow();
    });
});
