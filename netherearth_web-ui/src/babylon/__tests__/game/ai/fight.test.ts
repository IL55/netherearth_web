import { describe, it, expect } from 'vitest';
import { Owner } from '../../../game/types/owner';
import { Direction } from '../../../game/types/direction';
import { ObjectType } from '../../../game/types/object-type';
import { WeaponType } from '../../../game/types/weapon-type';
import { RobotGoal } from '../../../game/types/robot-goal';
import { ActionType, RotateDir } from '../../../game/actions';
import { fightAction } from '../../../game/ai/fight';
import { buildOccupancy } from '../../../game/core/occupancy';
import { Chassis, Electronics, Weapon } from '../../../data/robot';
import { RobotAI, type WarMap, type RobotObject, type WarObject } from '../../../game/core/warmap';

function makeRobot(
    id: string,
    x: number,
    y: number,
    facing: Direction,
    owner: Owner,
    weapon?: Weapon
): RobotObject {
    return {
        id,
        type: ObjectType.ROBOT,
        x,
        y,
        facing,
        owner,
        goal: RobotGoal.ATTACK_ROBOTS,
        ai: RobotAI.SIMPLE,
        robotConfig: {
            chassis: Chassis.TRACKS,
            electronics: Electronics.STANDARD,
            weapons: weapon ? [weapon] : [],
        },
        health: 100,
        dyingTicks: undefined,
    };
}


function makeMap(objects: any[] = []): WarMap {
    return { width: 20, height: 20, tiles: objects.filter((o: any) => o.type !== ObjectType.ROBOT), robots: objects.filter((o: any) => o.type === ObjectType.ROBOT), projectiles: [], killCounts: {}, tick: 0 } as any;
}

describe('fightAction', () => {
    it('returns undefined if robot has no weapon', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED);
        const enemy = makeRobot('e1', 5, 4, Direction.S, Owner.BLUE, Weapon.CANNON);
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        expect(action).toBeUndefined();
    });

    it('returns undefined if no enemies are in sight or adjacent', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED, Weapon.CANNON);
        const map = makeMap([robot]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        expect(action).toBeUndefined();
    });

    it('rotates towards adjacent enemy if not facing it', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED, Weapon.CANNON);
        // Enemy is at (6, 5) which is East (adjacent)
        const enemy = makeRobot('e1', 6, 5, Direction.S, Owner.BLUE);
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        // The robot should rotate East (RIGHT from North)
        expect(action).toEqual({ type: ActionType.ROTATE, direction: RotateDir.RIGHT });
    });

    it('fires at adjacent enemy if already facing it', () => {
        const robot = makeRobot('r1', 5, 5, Direction.E, Owner.RED, Weapon.CANNON);
        // Enemy is at (6, 5) which is East (adjacent), and we are facing East
        const enemy = makeRobot('e1', 6, 5, Direction.S, Owner.BLUE);
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        expect(action).toMatchObject({ type: ActionType.FIRE, targetId: enemy.id });
    });

    it('rotates left towards adjacent enemy if it is to the West', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED, Weapon.CANNON);
        // Enemy is at (4, 5) which is West (adjacent)
        const enemy = makeRobot('e1', 4, 5, Direction.S, Owner.BLUE);
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        // The robot should rotate West (LEFT from North)
        expect(action).toEqual({ type: ActionType.ROTATE, direction: RotateDir.LEFT });
    });

    it('rotates toward attacker if health dropped since last tick and no enemy is in sight', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED, Weapon.CANNON);
        robot.health = 80;
        robot.nav = { lastHealth: 100 }; // Emulate taking 20 damage since last tick

        // Enemy is at (2, 5) which is West (not adjacent, but within sight range)
        const enemy = makeRobot('e1', 2, 5, Direction.E, Owner.BLUE, Weapon.CANNON);
        
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        // Robot is facing North, sees nothing ahead or adjacent, but took damage. 
        // It should scan all directions, spot the enemy to the West, and rotate towards it.
        expect(action).toEqual({ type: ActionType.ROTATE, direction: RotateDir.LEFT }); // Left of N is W
        
        // Ensure lastHealth was updated
        expect(robot.nav.lastHealth).toBe(80);
    });

    it('does not rotate if health did not drop', () => {
        const robot = makeRobot('r1', 5, 5, Direction.N, Owner.RED, Weapon.CANNON);
        robot.health = 100;
        robot.nav = { lastHealth: 100 }; // Emulate no damage

        // Enemy is at (2, 5) which is West
        const enemy = makeRobot('e1', 2, 5, Direction.E, Owner.BLUE, Weapon.CANNON);
        
        const map = makeMap([robot, enemy]);
        const occupancy = buildOccupancy(map);

        const action = fightAction(robot, map, occupancy);
        // Since it didn't take damage, it shouldn't look around, so it shouldn't spot the enemy.
        expect(action).toBeUndefined();
    });
});
