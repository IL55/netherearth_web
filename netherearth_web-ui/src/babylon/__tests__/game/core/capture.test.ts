import { describe, it, expect } from 'vitest';
import { isInCaptureZone, tickCapture, CAPTURE_ZONES } from '../../../game/capture';
import type { WarMap, WarObject } from '../../../game/warmap';

function makeMap(objects: WarObject[]): WarMap {
    return { width: 20, height: 20, objects };
}

// Factory at (5,7): zone center = (6, 8), radius=0.5, ticks=4
// Warbase at (2,5): zone center = (5.5, 7), radius=0.5, ticks=12
function makeFactory(x = 5, y = 7, owner?: number): WarObject {
    return { id: 'f1', type: 'factory', x, y, subtype: 'cannons', ...(owner !== undefined ? { owner } : {}) };
}
function makeWarbase(x = 2, y = 5, owner?: number): WarObject {
    return { id: 'wb', type: 'warbase', x, y, ...(owner !== undefined ? { owner } : {}) };
}
function makeRobot(id: string, x: number, y: number, owner: number): WarObject {
    return { id, type: 'robot', x, y, owner };
}

describe('CAPTURE_ZONES', () => {
    it('factory zone exists with ticks=4', () => {
        expect(CAPTURE_ZONES['factory']?.ticks).toBe(4);
    });
    it('warbase zone exists with ticks=12', () => {
        expect(CAPTURE_ZONES['warbase']?.ticks).toBe(12);
    });
});

describe('isInCaptureZone', () => {
    it('returns false for a type with no zone (e.g. wall)', () => {
        const wall: WarObject = { id: 'w', type: 'wall3', x: 0, y: 0 };
        const robot = makeRobot('r', 0, 0, 1);
        expect(isInCaptureZone(robot, wall)).toBe(false);
    });

    it('returns true when robot is exactly at factory zone center', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6, 8, 1); // zone center for factory at (5,7)
        expect(isInCaptureZone(robot, factory)).toBe(true);
    });

    it('returns true when robot is within Chebyshev radius 0.5', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6.4, 8.4, 1); // max(0.4, 0.4)=0.4 ≤ 0.5
        expect(isInCaptureZone(robot, factory)).toBe(true);
    });

    it('returns false when robot is just outside radius', () => {
        const factory = makeFactory();
        const robot = makeRobot('r', 6.6, 8, 1); // |6.6-6|=0.6 > 0.5
        expect(isInCaptureZone(robot, factory)).toBe(false);
    });

    it('returns true for warbase zone center', () => {
        const wb = makeWarbase();
        const robot = makeRobot('r', 5.5, 7, 1); // zone center for warbase at (2,5)
        expect(isInCaptureZone(robot, wb)).toBe(true);
    });
});

describe('tickCapture — factory (4 ticks)', () => {
    it('increments captureCounter when enemy robot is in zone', () => {
        const factory = makeFactory(5, 7, undefined);
        const robot = makeRobot('r', 6, 8, 1);
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter).toBe(1);
    });

    it('does not increment when no robot is in zone', () => {
        const factory = makeFactory(5, 7, undefined);
        const robot = makeRobot('r', 0, 0, 1); // far away
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter ?? 0).toBe(0);
    });

    it('does not increment for a friendly robot (same owner as factory)', () => {
        const factory = makeFactory(5, 7, 1);
        const robot = makeRobot('r', 6, 8, 1); // same owner
        const map = makeMap([factory, robot]);
        tickCapture(map);
        expect(factory.captureCounter ?? 0).toBe(0);
    });

    it('captures factory after 4 consecutive ticks', () => {
        const factory = makeFactory(5, 7, undefined);
        const robot = makeRobot('r', 6, 8, 1);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < 4; i++) tickCapture(map);
        expect(factory.owner).toBe(1);
        expect(factory.captureCounter).toBe(0);
    });

    it('resets counter if robot leaves zone before capture', () => {
        const factory = makeFactory(5, 7, undefined);
        const robot = makeRobot('r', 6, 8, 1);
        const map = makeMap([factory, robot]);
        tickCapture(map); // counter = 1
        tickCapture(map); // counter = 2
        robot.x = 0; robot.y = 0; // leave zone
        tickCapture(map); // counter resets to 0
        expect(factory.captureCounter).toBe(0);
        expect(factory.owner).toBeUndefined();
    });

    it('does not capture after only 3 ticks', () => {
        const factory = makeFactory(5, 7, undefined);
        const robot = makeRobot('r', 6, 8, 1);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < 3; i++) tickCapture(map);
        expect(factory.owner).toBeUndefined();
        expect(factory.captureCounter).toBe(3);
    });

    it('allows re-capture: owner changes from 2 to 1 after full hold', () => {
        const factory = makeFactory(5, 7, 2);
        const robot = makeRobot('r', 6, 8, 1);
        const map = makeMap([factory, robot]);
        for (let i = 0; i < 4; i++) tickCapture(map);
        expect(factory.owner).toBe(1);
    });
});

describe('tickCapture — warbase (12 ticks)', () => {
    it('does not capture warbase after 11 ticks', () => {
        const wb = makeWarbase(2, 5, undefined);
        const robot = makeRobot('r', 5.5, 7, 1);
        const map = makeMap([wb, robot]);
        for (let i = 0; i < 11; i++) tickCapture(map);
        expect(wb.owner).toBeUndefined();
        expect(wb.captureCounter).toBe(11);
    });

    it('captures warbase after 12 consecutive ticks', () => {
        const wb = makeWarbase(2, 5, undefined);
        const robot = makeRobot('r', 5.5, 7, 1);
        const map = makeMap([wb, robot]);
        for (let i = 0; i < 12; i++) tickCapture(map);
        expect(wb.owner).toBe(1);
        expect(wb.captureCounter).toBe(0);
    });
});
