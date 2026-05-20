import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadMap } from '../../data/map';
import { ObjectType } from '../../game/core/warmap';
import { Owner } from '../../game/types/owner';

const MINIMAL_MAP = [
    '4',         // width
    '2',         // height
    'g g g g',   // row 0
    'g g g g',   // row 1
].join('\n');

const MAP_WITH_OBJECTS = [
    '8',
    '3',
    'g g g g g g g g',
    'g g g g g g g g',
    'g g g g g g g g',
    'fence 2 0',
    'factory 0 1 factory-1 2',
    'warbase 4 1 1',
    'wall1 3 2',
].join('\n');

function mockFetch(body: string, status = 200, statusText = 'OK') {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        statusText,
        text: () => Promise.resolve(body),
    }));
}

afterEach(() => { vi.unstubAllGlobals(); });

// ─── HTTP error handling ───────────────────────────────────────────────────────

describe('loadMap — HTTP errors', () => {
    it('throws on 404', async () => {
        mockFetch('Not Found', 404, 'Not Found');
        await expect(loadMap('/maps/missing.map')).rejects.toThrow('404');
    });

    it('throws on 500', async () => {
        mockFetch('Internal Server Error', 500, 'Internal Server Error');
        await expect(loadMap('/maps/missing.map')).rejects.toThrow('500');
    });

    it('includes the URL in the error message', async () => {
        mockFetch('', 404, 'Not Found');
        await expect(loadMap('/maps/small1.map')).rejects.toThrow('/maps/small1.map');
    });
});

// ─── Dimensions ───────────────────────────────────────────────────────────────

describe('loadMap — dimensions', () => {
    it('parses width and height', async () => {
        mockFetch(MINIMAL_MAP);
        const map = await loadMap('/maps/test.map');
        expect(map.width).toBe(4);
        expect(map.height).toBe(2);
    });

    it('returns a tile grid matching the declared dimensions', async () => {
        mockFetch(MINIMAL_MAP);
        const map = await loadMap('/maps/test.map');
        expect(map.tiles).toHaveLength(2);
        expect(map.tiles[0]).toHaveLength(4);
    });
});

// ─── Tile grid ────────────────────────────────────────────────────────────────

describe('loadMap — tiles', () => {
    it('parses tile types from rows', async () => {
        mockFetch(MINIMAL_MAP);
        const map = await loadMap('/maps/test.map');
        expect(map.tiles[0][0]).toBe('g');
        expect(map.tiles[1][3]).toBe('g');
    });
});

// ─── Objects ──────────────────────────────────────────────────────────────────

describe('loadMap — objects', () => {
    it('parses a fence object', async () => {
        mockFetch(MAP_WITH_OBJECTS);
        const map = await loadMap('/maps/test.map');
        const fence = map.objects.find(o => o.type === ObjectType.FENCE);
        expect(fence).toBeDefined();
        expect(fence!.x).toBe(2);
        expect(fence!.y).toBe(0);
    });

    it('parses a factory with subtype and owner', async () => {
        mockFetch(MAP_WITH_OBJECTS);
        const map = await loadMap('/maps/test.map');
        const factory = map.objects.find(o => o.type === ObjectType.FACTORY);
        expect(factory).toBeDefined();
        expect(factory!.x).toBe(0);
        expect(factory!.y).toBe(1);
        expect(factory!.subtype).toBe('factory-1');
        expect(factory!.owner).toBe(Owner.BLUE);
    });

    it('parses a factory with no owner as NEUTRAL', async () => {
        const noOwnerMap = [
            '4', '1', 'g g g g',
            'factory 2 0 factory-1',
        ].join('\n');
        mockFetch(noOwnerMap);
        const map = await loadMap('/maps/test.map');
        const factory = map.objects.find(o => o.type === ObjectType.FACTORY);
        expect(factory!.owner).toBe(Owner.NEUTRAL);
    });

    it('parses a warbase with owner', async () => {
        mockFetch(MAP_WITH_OBJECTS);
        const map = await loadMap('/maps/test.map');
        const warbase = map.objects.find(o => o.type === ObjectType.WARBASE);
        expect(warbase).toBeDefined();
        expect(warbase!.x).toBe(4);
        expect(warbase!.y).toBe(1);
        expect(warbase!.owner).toBe(Owner.RED);
    });

    it('parses a wall object', async () => {
        mockFetch(MAP_WITH_OBJECTS);
        const map = await loadMap('/maps/test.map');
        const wall = map.objects.find(o => o.type === 'wall1');
        expect(wall).toBeDefined();
        expect(wall!.x).toBe(3);
        expect(wall!.y).toBe(2);
    });

    it('returns empty objects array when there are no objects', async () => {
        mockFetch(MINIMAL_MAP);
        const map = await loadMap('/maps/test.map');
        expect(map.objects).toHaveLength(0);
    });
});
