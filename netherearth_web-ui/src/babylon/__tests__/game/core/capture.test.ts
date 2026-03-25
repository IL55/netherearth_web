import { describe, it, expect } from 'vitest';
import { isInCaptureZone, tickCapture, CAPTURE_ZONES } from '../../../game/capture';
import { DAY_TICKS } from '../../../game/resources';
import { Owner } from '../../../game/owner';
import type { WarMap, WarObject, RobotObject } from '../../../game/warmap';

function makeMap(objects: WarObject[]): WarMap {
    return { width: 20, height: 20, objects };
}

// Factory at (5,7): zone center = (6, 8), radius=0.5
// Warbase at (2,5): zone center = (5.5, 7), radius=0.5
function makeFactory(x = 5, y = 7, owner: Owner = Owner.NEUTRAL): WarObject {
    return { id: 'f1', type: 'factory', x, y, subtype: 'cannons', owner };
}
function makeWarbase(x = 2, y = 5, owner: Owner = Owner.NEUTRAL): WarObject {
    return { id: 'wb', type: 'warbase', x, y, owner };
}
function makeRobot(id: string, x: number, y: number, owner: Owner): RobotObject {
    return { id, type: 'robot', x, y, owner };
}

describe('CAPTURE_ZONES', () => {
    it('factory zone exists with ticks=DAY_TICKS', () => {
        expect(CAPTURE_ZONES['factory']?.ticks).toBe(DAY_TICKS);
    });
    it('warbase zone exists with ticks=3*DAY_TICKS', () => {
        expect(CAPTURE_ZONES['warbase']?.ticks).toBe(3 * DAY_TICKS);
    });
});

describe('isInCaptureZone', () => {
    it('returns false for a type with no zone (e.g. wall)', () => {
        const wall: WarObject = { id: 'w', type: 'wall3', x: 0, y: 0 };
        const robot = makeRobot('r', 0, 0, Owner.RED);
        expect(isInCaptureZone(robot, wall)).toBe(false);
    });

    it('returns true when robot is exactly at factory zone center', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6, 8, Owner.RED); // zone center for factory at (5,7)
        expect(isInCaptureZone(robot, factory)).toBe(true);
    });

    it('returns true when robot is within Chebyshev radius 0.5', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6.4, 8.4, Owner.RED); // max(0.4, 0.4)=0.4 ≤ 0.5
        expect(isInCaptureZone(robot, factory)).toBe(true);
    });

    it('returns false when robot is just outside radius', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6.6, 8, Owner.RED); // |6.6-6|=0.6 > 0.5
        expect(isInCaptureZone(robot, factory)).toBe(false);
    });

    it('returns true for warbase zone center', () => {
        const wb = makeWarbase();
        const robot = makeRobot('r', 5.5, 7, Owner.RED); // zone center for warbase at (2,5)
        expect(isInCaptureZone(robot, wb)).toBe(true);
    });
});

describe('tickCapture — factory (1 day)', () => {
    it('increments captureCounter when enemy robot is in zone', () => {
        const factory = makeFactory(5, 7);
        const robot = makeRobot('r', 6, 8, Owner.RED);
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter).toBe(1);
    });

    it('does not increment when no robot is in zone', () => {
        const factory = makeFactory(5, 7);
        const robot = makeRobot('r', 0, 0, Owner.RED); // far away
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter ?? 0).toBe(0);
    });

    it('does not increment for a friendly robot (same owner as factory)', () => {
        const factory = makeFactory(5, 7, Owner.RED);
        const robot = makeRobot('r', 6, 8, Owner.RED); // same owner
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter ?? 0).toBe(0);
    });

    it('captures factory after DAY_TICKS consecutive ticks', () => {
        const factory = makeFactory(5, 7);
        const robot = makeRobot('r', 6, 8, Owner.RED);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < DAY_TICKS; i++) tickCapture(map);
        expect(factory.owner).toBe(Owner.RED);
        expect(factory.captureCounter).toBe(0);
    });

    it('resets counter if robot leaves zone before capture', () => {
        const factory = makeFactory(5, 7);
        const robot = makeRobot('r', 6, 8, Owner.RED);
        const map = makeMap([factory, robot]);
        tickCapture(map); // counter = 1
        tickCapture(map); // counter = 2
        robot.x = 0; robot.y = 0; // leave zone
        tickCapture(map); // counter resets to 0
        expect(factory.captureCounter).toBe(0);
        expect(factory.owner).toBe(Owner.NEUTRAL);
    });

    it('does not capture after only DAY_TICKS-1 ticks', () => {
        const factory = makeFactory(5, 7);
        const robot = makeRobot('r', 6, 8, Owner.RED);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < DAY_TICKS - 1; i++) tickCapture(map);
        expect(factory.owner).toBe(Owner.NEUTRAL);
        expect(factory.captureCounter).toBe(DAY_TICKS - 1);
    });

    it('allows re-capture: owner changes from BLUE to RED after full hold', () => {
        const factory = makeFactory(5, 7, Owner.BLUE);
        const robot = makeRobot('r', 6, 8, Owner.RED);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < DAY_TICKS; i++) tickCapture(map);
        expect(factory.owner).toBe(Owner.RED);
    });
});

describe('tickCapture — warbase (3 days)', () => {
    it('does not capture warbase after 3*DAY_TICKS-1 ticks', () => {
        const wb = makeWarbase(2, 5);
        const robot = makeRobot('r', 5.5, 7, Owner.RED);
        const map = makeMap([wb, robot]);
        for (let i = 0; i < 3 * DAY_TICKS - 1; i++) tickCapture(map);
        expect(wb.owner).toBe(Owner.NEUTRAL);
        expect(wb.captureCounter).toBe(3 * DAY_TICKS - 1);
    });

    it('captures warbase after 3*DAY_TICKS consecutive ticks', () => {
        const wb = makeWarbase(2, 5);
        const robot = makeRobot('r', 5.5, 7, Owner.RED);
        const map = makeMap([wb, robot]);
        for (let i = 0; i < 3 * DAY_TICKS; i++) tickCapture(map);
        expect(wb.owner).toBe(Owner.RED);
        expect(wb.captureCounter).toBe(0);
    });
});