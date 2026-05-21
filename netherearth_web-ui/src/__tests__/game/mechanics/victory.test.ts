import { describe, it, expect } from 'vitest';
import { checkVictory } from '../../../game/mechanics/victory';
import { ObjectType, Direction } from '../../../game/core/warmap';
import { Owner } from '../../../game/types/owner';
import { Chassis } from '../../../data/robot';
import type { WarMap, WarObject, RobotObject } from '../../../game/core/warmap';


function makeMap(...objects: any[]): WarMap {
    return { width: 10, height: 10, tiles: objects.filter((o: any) => o.type !== ObjectType.ROBOT), robots: objects.filter((o: any) => o.type === ObjectType.ROBOT), projectiles: [], killCounts: {}, tick: 0 } as any;
}

function warbase(id: string, owner: Owner | undefined): WarObject {
    return { id, type: ObjectType.WARBASE, x: 0, y: 0, owner };
}

function robot(id: string, owner: Owner, dyingTicks?: number): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x: 0, y: 0,
        owner, facing: Direction.E,
        robotConfig: { chassis: Chassis.TRACKS },
        ...(dyingTicks !== undefined ? { dyingTicks } : {}),
    };
}

// ─── No warbases ──────────────────────────────────────────────────────────────

describe('checkVictory — no warbases', () => {
    it('returns null when the map has no warbases', () => {
        expect(checkVictory(makeMap())).toBeNull();
    });
});

// ─── Condition 1: complete map control ───────────────────────────────────────

describe('checkVictory — complete map control', () => {
    it('returns RED when all warbases are owned by RED', () => {
        expect(checkVictory(makeMap(warbase('wb1', Owner.RED), warbase('wb2', Owner.RED)))).toBe(Owner.RED);
    });

    it('returns BLUE when all warbases are owned by BLUE', () => {
        expect(checkVictory(makeMap(warbase('wb1', Owner.BLUE), warbase('wb2', Owner.BLUE)))).toBe(Owner.BLUE);
    });

    it('returns RED for a single RED warbase', () => {
        expect(checkVictory(makeMap(warbase('wb1', Owner.RED)))).toBe(Owner.RED);
    });
});

// ─── Condition 2: one side eliminated ────────────────────────────────────────

describe('checkVictory — elimination (no bases + no robots)', () => {
    it('returns RED when BLUE has no warbases and no robots (neutral base remains)', () => {
        const map = makeMap(
            warbase('wb1', Owner.RED),
            warbase('wb2', Owner.NEUTRAL),  // neutral still exists
            robot('r1', Owner.RED),          // RED has a robot
            // BLUE: no bases, no robots
        );
        expect(checkVictory(map)).toBe(Owner.RED);
    });

    it('returns BLUE when RED has no warbases and no robots', () => {
        const map = makeMap(
            warbase('wb1', Owner.BLUE),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.BLUE),
            // RED: no bases, no robots
        );
        expect(checkVictory(map)).toBe(Owner.BLUE);
    });

    it('returns null when BLUE has no bases but still has live robots (can recapture)', () => {
        const map = makeMap(
            warbase('wb1', Owner.RED),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.BLUE),  // BLUE robot still alive
        );
        expect(checkVictory(map)).toBeNull();
    });

    it('does not count dying robots as live when checking elimination', () => {
        // BLUE robot is dying — should not count as a live unit
        const map = makeMap(
            warbase('wb1', Owner.RED),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.BLUE, 3),  // dyingTicks=3 → dying, not live
        );
        expect(checkVictory(map)).toBe(Owner.RED);
    });
});

// ─── Game still in progress ───────────────────────────────────────────────────

describe('checkVictory — game in progress', () => {
    it('returns null when warbases are split between RED and BLUE', () => {
        const map = makeMap(
            warbase('wb1', Owner.RED),
            warbase('wb2', Owner.BLUE),
            robot('r1', Owner.RED),
            robot('r2', Owner.BLUE),
        );
        expect(checkVictory(map)).toBeNull();
    });

    it('returns null when a neutral warbase remains and robots exist', () => {
        const map = makeMap(
            warbase('wb1', Owner.RED),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.RED),
            robot('r2', Owner.BLUE),
        );
        expect(checkVictory(map)).toBeNull();
    });

    it('returns null when all warbases are neutral and both teams have robots', () => {
        const map = makeMap(
            warbase('wb1', Owner.NEUTRAL),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.RED),
            robot('r2', Owner.BLUE),
        );
        expect(checkVictory(map)).toBeNull();
    });

    it('returns RED when all warbases are neutral but BLUE has no robots', () => {
        // BLUE eliminated → RED wins even though no bases are captured yet
        const map = makeMap(
            warbase('wb1', Owner.NEUTRAL),
            warbase('wb2', Owner.NEUTRAL),
            robot('r1', Owner.RED),
        );
        expect(checkVictory(map)).toBe(Owner.RED);
    });
});

// ─── Non-warbase objects are ignored ─────────────────────────────────────────

describe('checkVictory — non-warbase objects are ignored', () => {
    it('does not count factories as warbases', () => {
        const map = makeMap(
            warbase('wb1', Owner.RED),
            { id: 'f1', type: ObjectType.FACTORY, x: 1, y: 0, owner: Owner.BLUE },
        );
        // Only one warbase, owned by RED → RED wins
        expect(checkVictory(map)).toBe(Owner.RED);
    });
});
