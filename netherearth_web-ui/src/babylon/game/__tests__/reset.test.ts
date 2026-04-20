import { describe, it, expect, vi } from 'vitest';
import { resetGame } from '../reset';
import { createWarMap, Owner, ObjectType } from '../core/warmap';
import type { MapData } from '../../data/map';
import type { OwnerResources } from '../resources';
import type { ShipState } from '../ship/index';
import type { Clock } from '../clock';

describe('resetGame', () => {
    it('resets the game state correctly', () => {
        // Arrange
        const mapData: MapData = {
            width: 10,
            height: 10,
            tiles: [], // Not strictly needed for this mock
            objects: [
                { type: 'warbase', x: 2, y: 2, owner: Owner.RED },
                { type: 'warbase', x: 8, y: 8, owner: Owner.BLUE },
                { type: 'factory', x: 5, y: 5, owner: Owner.BLUE },
            ],
        };

        const warMap = createWarMap(mapData);
        // Mutate the map to simulate a played game
        warMap.robots = [{ id: 'bot1', type: ObjectType.ROBOT, x: 1, y: 1 } as any];
        warMap.projectiles = [{ x: 1, y: 1 } as any];
        warMap.tick = 500;
        warMap.killCounts = { [Owner.RED]: 10 };
        // Someone captured a factory
        const factory = warMap.tiles.find(t => t.type === ObjectType.FACTORY)!;
        factory.owner = Owner.RED;

        const ownerResources: OwnerResources = {
            [Owner.RED]: { common: 0, chassis: 0, cannons: 0, missiles: 0, phasers: 0, electronics: 0, nuclear: 0 },
            [Owner.BLUE]: { common: 99, chassis: 99, cannons: 99, missiles: 99, phasers: 99, electronics: 99, nuclear: 99 },
            [Owner.NEUTRAL]: { common: 0, chassis: 0, cannons: 0, missiles: 0, phasers: 0, electronics: 0, nuclear: 0 },
            [Owner.NONE]: { common: 0, chassis: 0, cannons: 0, missiles: 0, phasers: 0, electronics: 0, nuclear: 0 },
        };

        const ship: ShipState = { x: 9, y: 9, height: 5 };

        const clock: Clock = {
            stop: vi.fn(),
            start: vi.fn(),
            reset: vi.fn(),
        };

        // Act
        resetGame(warMap, mapData, ownerResources, ship, clock, 5);

        // Assert
        // Map should be cleared of dynamic entities
        expect(warMap.robots).toEqual([]);
        expect(warMap.projectiles).toEqual([]);
        expect(warMap.tick).toBe(0);
        expect(warMap.killCounts).toEqual({});

        // Factories should be neutral, warbases retain initial ownership
        const redBase = warMap.tiles.find(t => t.type === ObjectType.WARBASE && t.owner === Owner.RED);
        const blueBase = warMap.tiles.find(t => t.type === ObjectType.WARBASE && t.owner === Owner.BLUE);
        const resetFactory = warMap.tiles.find(t => t.type === ObjectType.FACTORY);

        expect(redBase).toBeDefined();
        expect(blueBase).toBeDefined();
        expect(resetFactory?.owner).toBe(Owner.NEUTRAL);

        // Resources reset to initial
        expect(ownerResources[Owner.RED].common).toBe(5);
        expect(ownerResources[Owner.BLUE].common).toBe(5);

        // Ship positioned north of red warbase
        expect(ship.x).toBe(2 + 1.5);
        expect(ship.y).toBe(2 - 3);
        expect(ship.height).toBe(1.5);

        // Clock methods called
        expect(clock.reset).toHaveBeenCalled();
        expect(clock.start).toHaveBeenCalled();
    });
});
