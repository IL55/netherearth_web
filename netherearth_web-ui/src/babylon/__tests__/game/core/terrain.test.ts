import { Direction } from '../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { getTerrainRule, Chassis } from '../../../game/core/terrain';

describe('getTerrainRule — antigrav (best: full speed everywhere)', () => {
    it('grass: passable, speed 1',     () => expect(getTerrainRule('G',  Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('sand: passable, speed 1',      () => expect(getTerrainRule(Direction.S,  Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('sand2: passable, speed 1',     () => expect(getTerrainRule('S2', Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('mountains: passable, speed 1', () => expect(getTerrainRule('M',  Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('holes: passable, speed 1',     () => expect(getTerrainRule('H1', Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('all hole variants are passable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, Chassis.ANTIGRAV).passable).toBe(true);
        }
    });
});

describe('getTerrainRule — tracks (any terrain except holes, slower than antigrav on grass)', () => {
    it('grass: passable, speed 0.75',     () => expect(getTerrainRule('G',  Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.75 }));
    it('sand: passable, speed 0.5',       () => expect(getTerrainRule(Direction.S,  Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('sand2: passable, speed 0.5',      () => expect(getTerrainRule('S2', Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('mountains: passable, speed 0.5',  () => expect(getTerrainRule('M',  Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('holes: impassable',               () => expect(getTerrainRule('H1', Chassis.TRACKS).passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, Chassis.TRACKS).passable).toBe(false);
        }
    });
});

describe('getTerrainRule — bipod (grass and sand only, always slower)', () => {
    it('grass: passable, speed 0.5',  () => expect(getTerrainRule('G',  Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand: passable, speed 0.5',   () => expect(getTerrainRule(Direction.S,  Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand2: passable, speed 0.5',  () => expect(getTerrainRule('S2', Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('mountains: impassable',       () => expect(getTerrainRule('M',  Chassis.BIPOD).passable).toBe(false));
    it('holes: impassable',           () => expect(getTerrainRule('H1', Chassis.BIPOD).passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, Chassis.BIPOD).passable).toBe(false);
        }
    });
});

describe('getTerrainRule — speed ordering on grass (antigrav > tracks > bipod)', () => {
    it('antigrav faster than tracks on grass', () => {
        expect(getTerrainRule('G', Chassis.ANTIGRAV).speedFactor).toBeGreaterThan(getTerrainRule('G', Chassis.TRACKS).speedFactor);
    });
    it('tracks faster than bipod on grass', () => {
        expect(getTerrainRule('G', Chassis.TRACKS).speedFactor).toBeGreaterThan(getTerrainRule('G', Chassis.BIPOD).speedFactor);
    });
});

describe('getTerrainRule — unknown tile falls back to default (passable, speed 1)', () => {
    it('unknown tile is passable at full speed', () => {
        const rule = getTerrainRule('UNKNOWN', Chassis.TRACKS);
        expect(rule.passable).toBe(true);
        expect(rule.speedFactor).toBe(1);
    });
});
