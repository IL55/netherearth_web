import { describe, it, expect } from 'vitest';
import { shouldDetonateNuclear } from '../../../game/ai/nuclear';
import { ObjectType, Owner } from '../../../game/core/warmap';
import type { WarMap, MapObject, RobotObject } from '../../../game/core/warmap';
import { Chassis } from '../../../data/robot';

function createMapWithObjects(objects: Array<any>): WarMap {
    return {
        width: 10,
        height: 10,
        objects,
        tick: 0,
    };
}

describe('shouldDetonateNuclear', () => {
    it('returns false if robot has no nuclear bomb', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS },
        };
        const warMap = createMapWithObjects([robot]);
        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(false);
    });

    it('returns true if stuck and an enemy robot is in 3x3 zone', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };
        const enemy: RobotObject = {
            id: 'e1', type: ObjectType.ROBOT, x: 4, y: 6, owner: Owner.BLUE,
        };
        const warMap = createMapWithObjects([robot, enemy]);

        // Using isStuck = true to bypass random check
        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(true);
    });

    it('returns false if stuck but no valuable target is in 3x3 zone', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };
        const enemy: RobotObject = {
            id: 'e1', type: ObjectType.ROBOT, x: 3, y: 5, owner: Owner.BLUE,
        }; // Chebyshev distance = 2 (outside 3x3)
        
        const friendly: RobotObject = {
            id: 'f1', type: ObjectType.ROBOT, x: 4, y: 5, owner: Owner.RED,
        }; // Inside 3x3 but friendly

        const warMap = createMapWithObjects([robot, enemy, friendly]);

        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(false);
    });

    it('returns true if stuck and an enemy factory intersects 3x3 zone', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };
        // Factory top-left at (3,4), width 2, height 3 -> spans x:3-4, y:4-6
        // Intersects with robot 3x3 zone [x:4-6, y:4-6] at (4,4), (4,5), (4,6)
        const enemyFactory: MapObject = {
            id: 'f1', type: ObjectType.FACTORY, x: 3, y: 4, owner: Owner.BLUE,
        };
        const warMap = createMapWithObjects([robot, enemyFactory]);

        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(true);
    });

    it('returns true if stuck and a neutral factory intersects 3x3 zone', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };
        const neutralFactory: MapObject = {
            id: 'f1', type: ObjectType.FACTORY, x: 3, y: 4, owner: Owner.NEUTRAL,
        };
        const warMap = createMapWithObjects([robot, neutralFactory]);

        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(true);
    });

    it('returns false if only friendly structures intersect 3x3 zone', () => {
        const robot: RobotObject = {
            id: 'r1', type: ObjectType.ROBOT, x: 5, y: 5, owner: Owner.RED,
            robotConfig: { chassis: Chassis.TRACKS, nuclear: true },
        };
        const friendlyFactory: MapObject = {
            id: 'f1', type: ObjectType.FACTORY, x: 3, y: 4, owner: Owner.RED,
        };
        const warMap = createMapWithObjects([robot, friendlyFactory]);

        expect(shouldDetonateNuclear(robot, warMap, true)).toBe(false);
    });
});
