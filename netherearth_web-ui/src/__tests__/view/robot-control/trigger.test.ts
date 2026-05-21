import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectType, Direction, RobotGoal, Owner, RobotAI } from '../../../game/core/warmap';
import type { WarMap, RobotObject } from '../../../game/core/warmap';
import { bus } from '../../../game/event-bus';
import { SOUNDS } from '../../../game/types/sound';
import { Chassis, Weapon, calcHealth, calcRobotHeight } from '../../../data/robot';

vi.mock('../../../view/robot-control/robot-control-3d', () => ({
    RobotControl3D: class {
        open = vi.fn();
        close = vi.fn();
        updateDisplay = vi.fn();
        dispose = vi.fn();
    },
}));

import { RobotControlTrigger } from '../../../view/robot-control/trigger';

const cfg = { chassis: Chassis.TRACKS, weapons: [Weapon.CANNON] };

function makeRobot(id: string, x: number, y: number): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y,
        owner: Owner.RED, facing: Direction.E,
        goal: RobotGoal.ATTACK_ROBOTS,
        robotConfig: cfg,
        health: calcHealth(cfg),
        ai: RobotAI.SIMPLE,
    };
}

function makeWarMap(...robots: RobotObject[]): WarMap {
    return { width: 20, height: 20, tiles: [], robots, projectiles: [], killCounts: {}, tick: 0 };
}

describe('RobotControlTrigger — sound:play SELECT', () => {
    let soundEvents: string[];
    let handler: (e: { name: string }) => void;

    beforeEach(() => {
        soundEvents = [];
        handler = ({ name }) => soundEvents.push(name);
        bus.on('sound:play', handler);
    });

    afterEach(() => {
        bus.off('sound:play', handler);
    });

    it('emits sound:play SELECT when ship lands on a robot', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const robotH = calcRobotHeight(cfg);
        const ship = { x: 5, y: 5, height: robotH };

        const trigger = new RobotControlTrigger(null as any, () => 20, () => {});
        trigger.check(warMap, ship, false);

        expect(soundEvents).toContain(SOUNDS.SELECT);
        trigger.dispose();
    });

    it('emits SELECT only once for the same robot (not on every check)', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const robotH = calcRobotHeight(cfg);
        const ship = { x: 5, y: 5, height: robotH };

        const trigger = new RobotControlTrigger(null as any, () => 20, () => {});
        trigger.check(warMap, ship, false);
        trigger.check(warMap, ship, false);
        trigger.check(warMap, ship, false);

        expect(soundEvents.filter(n => n === SOUNDS.SELECT)).toHaveLength(1);
        trigger.dispose();
    });

    it('does not emit SELECT when ship is not over any robot', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const ship = { x: 15, y: 15, height: 1.5 }; // far away

        const trigger = new RobotControlTrigger(null as any, () => 20, () => {});
        trigger.check(warMap, ship, false);

        expect(soundEvents).not.toContain(SOUNDS.SELECT);
        trigger.dispose();
    });

    it('does not emit SELECT when construction yard is open', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        const robotH = calcRobotHeight(cfg);
        const ship = { x: 5, y: 5, height: robotH };

        const trigger = new RobotControlTrigger(null as any, () => 20, () => {});
        trigger.check(warMap, ship, true); // isConstructionYardOpen = true

        expect(soundEvents).not.toContain(SOUNDS.SELECT);
        trigger.dispose();
    });
});
