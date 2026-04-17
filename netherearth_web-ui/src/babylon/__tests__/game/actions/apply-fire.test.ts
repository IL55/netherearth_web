import { describe, it, expect } from 'vitest';
import { applyFire } from '../../../game/actions/apply-fire';
import { ObjectType, Owner, Direction } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { Weapon } from '../../../data/robot';

function makeRobot(id: string, x: number, y: number, owner: Owner, facing: Direction = Direction.E): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y, owner, facing, health: 100,
    };
}

describe('applyFire', () => {
    it('damages a specific target if targetId is provided (AI homing)', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.E);
        const target = makeRobot('r2', 12, 10, Owner.BLUE);
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter, target], projectiles: [] };
        const occupancy = { robots: [], structures: [] };

        applyFire(shooter, 'r2', warMap, occupancy, Weapon.CANNON);

        // Cannon base damage is 4. Target distance to collision box is 1.5. Range is 5.
        // Falloff dist=1.5, max=5 -> 0.4 + 0.6 * (3.5/4) = 0.925. Damage = round(4 * 0.925) = 4.
        expect(target.health).toBe(96); // 100 - 4
        expect(warMap.projectiles?.length).toBe(1);
    });

    it('finds and damages the first enemy on a straight line when targetId is undefined (Manual fire)', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.S); // Facing South
        // Enemy 1 is to the South (x=10, y=12)
        const targetSouth = makeRobot('r2', 10, 12, Owner.BLUE);
        // Enemy 2 is to the East (x=12, y=10)
        const targetEast = makeRobot('r3', 12, 10, Owner.BLUE);
        
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter, targetSouth, targetEast], projectiles: [] };
        const occupancy = { robots: [], structures: [] };

        // Fire without targetId
        applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON);

        // Should only hit the one South because facing is South
        expect(targetSouth.health).toBe(96); // Took damage
        expect(targetEast.health).toBe(100); // Unharmed

        expect(warMap.projectiles?.length).toBe(1);
        expect(warMap.projectiles?.[0].toX).toBe(10);
        expect(warMap.projectiles?.[0].toY).toBe(11.5); // Edge of collision box
    });

    it('spawns a dummy projectile to max range if manual fire misses (no enemies on line)', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.E); // Facing East
        // Enemy is to the North (x=10, y=8) -> Should not be hit
        const targetNorth = makeRobot('r2', 10, 8, Owner.BLUE);
        
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter, targetNorth], projectiles: [] };
        const occupancy = { robots: [], structures: [] };

        applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON); // Cannon maxRange is 5

        expect(targetNorth.health).toBe(100); // Unharmed
        
        expect(warMap.projectiles?.length).toBe(1);
        // Projectile should fly straight East to max range (10 + 5)
        expect(warMap.projectiles?.[0].toX).toBe(15);
        expect(warMap.projectiles?.[0].toY).toBe(10);
    });

    it('hits the closest enemy if multiple are on the straight line', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.W); // Facing West
        
        // Closer enemy at x=8
        const targetClose = makeRobot('r2', 8, 10, Owner.BLUE);
        // Further enemy at x=6
        const targetFar = makeRobot('r3', 6, 10, Owner.BLUE);
        
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter, targetClose, targetFar], projectiles: [] };
        const occupancy = { robots: [], structures: [] };

        applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON);

        expect(targetClose.health).toBeLessThan(100); // Hit
        expect(targetFar.health).toBe(100);           // Blocked by closest
    });

    it('is blocked by a structure (e.g. wall) preventing damage to enemy behind it', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.E); // Facing East
        
        // Enemy is at x=14, well within cannon maxRange of 5
        const target = makeRobot('r2', 14, 10, Owner.BLUE);
        
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter, target], projectiles: [] };
        
        // Add a wall structure perfectly blocking the line of sight at x=12
        const occupancy = { 
            robots: [], 
            structures: [
                { x0: 11.5, y0: 9.5, x1: 12.5, y1: 10.5, height: 1.0 } // Occupies x=12, y=10
            ] 
        };

        applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON);

        // The target robot behind the wall should be completely unharmed
        expect(target.health).toBe(100);
        
        // The visual projectile should stop exactly at the wall's leading edge (x=11.5)
        expect(warMap.projectiles?.length).toBe(1);
        expect(warMap.projectiles?.[0].toX).toBe(11.5);
        expect(warMap.projectiles?.[0].toY).toBe(10);
    });

    it('fails to fire if a projectile is already in flight', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.E);
        // Simulate a projectile already in the air owned by this shooter
        const warMap: WarMap = { 
            width: 30, height: 30, objects: [shooter], 
            projectiles: [{ id: 'p1', ownerId: 'r1', weaponType: 'cannon', fromX: 10, fromY: 10, toX: 15, toY: 10, progress: 0.5, step: 0.1 }] 
        };
        const occupancy = { robots: [], structures: [] };

        const result = applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON);

        // Fire attempt should be rejected
        expect(result).toBe(false);
        // No new projectile should be added
        expect(warMap.projectiles?.length).toBe(1);
    });

    it('fails to fire if the weapon cooldown is still active', () => {
        const shooter = makeRobot('r1', 10, 10, Owner.RED, Direction.E);
        shooter.weaponReadyAt = 100; // Weapon is ready at tick 100
        
        const warMap: WarMap = { width: 30, height: 30, objects: [shooter], projectiles: [], tick: 95 }; // Current tick is 95
        const occupancy = { robots: [], structures: [] };

        const result = applyFire(shooter, undefined, warMap, occupancy, Weapon.CANNON);

        // Fire attempt should be rejected because 95 < 100
        expect(result).toBe(false);
        expect(warMap.projectiles?.length).toBe(0);
    });
});
