import { describe, it, expect } from 'vitest';
import { getTerrainRule, chassisTypeOf } from '../../../game/terrain';

describe('getTerrainRule — antigrav (best: full speed everywhere)', () => {
    it('grass: passable, speed 1',     () => expect(getTerrainRule('G',  'antigrav')).toEqual({ passable: true, speedFactor: 1 }));
    it('sand: passable, speed 1',      () => expect(getTerrainRule('S',  'antigrav')).toEqual({ passable: true, speedFactor: 1 }));
    it('sand2: passable, speed 1',     () => expect(getTerrainRule('S2', 'antigrav')).toEqual({ passable: true, speedFactor: 1 }));
    it('mountains: passable, speed 1', () => expect(getTerrainRule('M',  'antigrav')).toEqual({ passable: true, speedFactor: 1 }));
    it('holes: passable, speed 1',     () => expect(getTerrainRule('H1', 'antigrav')).toEqual({ passable: true, speedFactor: 1 }));
    it('all hole variants are passable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, 'antigrav').passable).toBe(true);
        }
    });
});

describe('getTerrainRule — tracks (any terrain except holes, slower than antigrav on grass)', () => {
    it('grass: passable, speed 0.75',     () => expect(getTerrainRule('G',  'tracks')).toEqual({ passable: true,  speedFactor: 0.75 }));
    it('sand: passable, speed 0.5',       () => expect(getTerrainRule('S',  'tracks')).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('sand2: passable, speed 0.5',      () => expect(getTerrainRule('S2', 'tracks')).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('mountains: passable, speed 0.5',  () => expect(getTerrainRule('M',  'tracks')).toEqual({ passable: true,  speedFactor: 0.5  }));
    it('holes: impassable',               () => expect(getTerrainRule('H1', 'tracks').passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, 'tracks').passable).toBe(false);
        }
    });
});

describe('getTerrainRule — bipod (grass and sand only, always slower)', () => {
    it('grass: passable, speed 0.5',  () => expect(getTerrainRule('G',  'bipod')).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand: passable, speed 0.5',   () => expect(getTerrainRule('S',  'bipod')).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('sand2: passable, speed 0.5',  () => expect(getTerrainRule('S2', 'bipod')).toEqual({ passable: true,  speedFactor: 0.5 }));
    it('mountains: impassable',       () => expect(getTerrainRule('M',  'bipod').passable).toBe(false));
    it('holes: impassable',           () => expect(getTerrainRule('H1', 'bipod').passable).toBe(false));
    it('all hole variants are impassable', () => {
        for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
            expect(getTerrainRule(h, 'bipod').passable).toBe(false);
        }
    });
});

describe('getTerrainRule — speed ordering on grass (antigrav > tracks > bipod)', () => {
    it('antigrav faster than tracks on grass', () => {
        expect(getTerrainRule('G', 'antigrav').speedFactor).toBeGreaterThan(getTerrainRule('G', 'tracks').speedFactor);
    });
    it('tracks faster than bipod on grass', () => {
        expect(getTerrainRule('G', 'tracks').speedFactor).toBeGreaterThan(getTerrainRule('G', 'bipod').speedFactor);
    });
});

describe('getTerrainRule — unknown tile falls back to default (passable, speed 1)', () => {
    it('unknown tile is passable at full speed', () => {
        const rule = getTerrainRule('UNKNOWN', 'tracks');
        expect(rule.passable).toBe(true);
        expect(rule.speedFactor).toBe(1);
    });
});

describe('chassisTypeOf', () => {
    it('detects antigrav from h-antigrav', () => expect(chassisTypeOf('h-antigrav')).toBe('antigrav'));
    it('detects antigrav from e-antigrav', () => expect(chassisTypeOf('e-antigrav')).toBe('antigrav'));
    it('detects bipod from h-bipod',       () => expect(chassisTypeOf('h-bipod')).toBe('bipod'));
    it('detects bipod from e-bipod',       () => expect(chassisTypeOf('e-bipod')).toBe('bipod'));
    it('detects tracks from h-tracks',     () => expect(chassisTypeOf('h-tracks')).toBe('tracks'));
    it('defaults to tracks for unknown',   () => expect(chassisTypeOf('unknown')).toBe('tracks'));
});
