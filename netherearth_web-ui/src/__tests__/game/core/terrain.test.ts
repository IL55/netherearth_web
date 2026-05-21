import { describe, it, expect } from 'vitest';
import { getTerrainRule, Chassis, TileSubtype } from '../../../game/core/terrain';

describe('getTerrainRule — antigrav (best: full speed everywhere)', () => {
    it('grass: passable, speed 1',     () => expect(getTerrainRule(TileSubtype.GRASS,    Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('sand: passable, speed 1',      () => expect(getTerrainRule(TileSubtype.SAND,     Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('sand2: passable, speed 1',     () => expect(getTerrainRule(TileSubtype.SAND2,    Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('mountains: passable, speed 1', () => expect(getTerrainRule(TileSubtype.MOUNTAIN, Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('holes: passable, speed 1',     () => expect(getTerrainRule(TileSubtype.HOLE1,    Chassis.ANTIGRAV)).toEqual({ passable: true, speedFactor: 1 }));
    it('all hole variants are passable', () => {
        for (const h of [TileSubtype.HOLE1, TileSubtype.HOLE2, TileSubtype.HOLE3, TileSubtype.HOLE4, TileSubtype.HOLE5, TileSubtype.HOLE6]) {
            expect(getTerrainRule(h, Chassis.ANTIGRAV).passable).toBe(true);
        }
    });
});

describe('getTerrainRule — tracks (any terrain except holes, slower than antigrav on grass)', () => {
    it('grass: passable, speed 0.75',     () => expect(getTerrainRule(TileSubtype.GRASS,    Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.75 }));
    it('sand: passable, speed 0.5',       () => expect(getTerrainRule(TileSubtype.SAND,     Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('sand2: passable, speed 0.5',      () => expect(getTerrainRule(TileSubtype.SAND2,    Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('mountains: passable, speed 0.5',  () => expect(getTerrainRule(TileSubtype.MOUNTAIN, Chassis.TRACKS)).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('holes: impassable',               () => expect(getTerrainRule(TileSubtype.HOLE1,    Chassis.TRACKS).passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of [TileSubtype.HOLE1, TileSubtype.HOLE2, TileSubtype.HOLE3, TileSubtype.HOLE4, TileSubtype.HOLE5, TileSubtype.HOLE6]) {
            expect(getTerrainRule(h, Chassis.TRACKS).passable).toBe(false);
        }
    });
});

describe('getTerrainRule — bipod (grass and sand only, always slower)', () => {
    it('grass: passable, speed 0.5',  () => expect(getTerrainRule(TileSubtype.GRASS,    Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand: passable, speed 0.5',   () => expect(getTerrainRule(TileSubtype.SAND,     Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand2: passable, speed 0.5',  () => expect(getTerrainRule(TileSubtype.SAND2,    Chassis.BIPOD)).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('mountains: impassable',       () => expect(getTerrainRule(TileSubtype.MOUNTAIN, Chassis.BIPOD).passable).toBe(false));
    it('holes: impassable',           () => expect(getTerrainRule(TileSubtype.HOLE1,    Chassis.BIPOD).passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of [TileSubtype.HOLE1, TileSubtype.HOLE2, TileSubtype.HOLE3, TileSubtype.HOLE4, TileSubtype.HOLE5, TileSubtype.HOLE6]) {
            expect(getTerrainRule(h, Chassis.BIPOD).passable).toBe(false);
        }
    });
});

describe('getTerrainRule — speed ordering on grass (antigrav > tracks > bipod)', () => {
    it('antigrav faster than tracks on grass', () => {
        expect(getTerrainRule(TileSubtype.GRASS, Chassis.ANTIGRAV).speedFactor).toBeGreaterThan(getTerrainRule(TileSubtype.GRASS, Chassis.TRACKS).speedFactor);
    });
    it('tracks faster than bipod on grass', () => {
        expect(getTerrainRule(TileSubtype.GRASS, Chassis.TRACKS).speedFactor).toBeGreaterThan(getTerrainRule(TileSubtype.GRASS, Chassis.BIPOD).speedFactor);
    });
});

describe('getTerrainRule — unknown tile falls back to default (passable, speed 1)', () => {
    it('unknown tile is passable at full speed', () => {
        const rule = getTerrainRule('UNKNOWN', Chassis.TRACKS);
        expect(rule.passable).toBe(true);
        expect(rule.speedFactor).toBe(1);
    });
});
