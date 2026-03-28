import { ObjectType } from '../../../game/core/warmap';
import { describe, it, expect } from 'vitest';
import { DAY_TICKS, createOwnerResources, tickResources } from '../../../game/resources';
import { Owner } from '../../../game/types/owner';
import type { WarMap } from '../../../game/core/warmap';

function makeMap(objects: WarMap['objects']): WarMap {
    return { width: 10, height: 10, objects, tick: 0 };
}

function warbase(owner: Owner, id = 'wb'): WarMap['objects'][0] {
    return { id, type: ObjectType.WARBASE, x: 0, y: 0, owner };
}

function factory(subtype: string, owner: Owner, id = 'f'): WarMap['objects'][0] {
    return { id, type: ObjectType.FACTORY, x: 0, y: 0, subtype, owner };
}

describe('DAY_TICKS', () => {
    it('equals 40', () => expect(DAY_TICKS).toBe(40));
});

describe('tickResources — no income at tick 0', () => {
    it('tick=0 does not credit anything', () => {
        const map = makeMap([warbase(Owner.RED), factory('cannons', Owner.RED)]);
        const res = createOwnerResources();
        tickResources(map, res, 0);
        expect(res[Owner.RED].common).toBe(0);
        expect(res[Owner.RED].cannons).toBe(0);
    });
});

describe('tickResources — income between day boundaries', () => {
    it('ticks that are not multiples of DAY_TICKS do not credit anything', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        for (let t = 1; t < DAY_TICKS; t++) tickResources(map, res, t);
        expect(res[Owner.RED].common).toBe(0);
    });
});

describe('tickResources — warbase income', () => {
    it('one RED warbase yields +4 common per day', () => {
        const map = makeMap([warbase(Owner.RED)]);
        const res = createOwnerResources();
        tickResources(map, res, DAY_TICKS);
        expect(res[Owner.RED].common).toBe(4);
        expect(res[Owner.BLUE].common).toBe(0);
    });

    it('one BLUE warbase yields +4 common to BLUE only', () => {
        const map = makeMap([warbase(Owner.BLUE)]);
        const res = createOwnerResources();
        tickResources(map, res, DAY_TICKS);
        expect(res[Owner.BLUE].common).toBe(4);
        expect(res[Owner.RED].common).toBe(0);
    });

    it('two warbases owned by RED yield +8 common', () => {
        const map = makeMap([warbase(Owner.RED, 'wb1'), warbase(Owner.RED, 'wb2')]);
        const res = createOwnerResources();
        tickResources(map, res, DAY_TICKS);
        expect(res[Owner.RED].common).toBe(8);
    });

    it('NEUTRAL warbase does not credit any owner', () => {
        const map = makeMap([warbase(Owner.NEUTRAL)]);
        const res = createOwnerResources();
        tickResources(map, res, DAY_TICKS);
        expect(res[Owner.RED].common).toBe(0);
        expect(res[Owner.BLUE].common).toBe(0);
    });
});

describe('tickResources — factory income', () => {
    it('each factory type grants +2 of its specific resource', () => {
        const types = ['electronics', 'chassis', 'missiles', 'cannons', 'phasers', 'nuclear'] as const;
        for (const subtype of types) {
            const map = makeMap([factory(subtype, Owner.RED)]);
            const res = createOwnerResources();
            tickResources(map, res, DAY_TICKS);
            expect(res[Owner.RED][subtype]).toBe(2);
            // common untouched
            expect(res[Owner.RED].common).toBe(0);
        }
    });

    it('factory with unknown subtype does not crash and credits nothing', () => {
        const map = makeMap([factory('unknown_subtype', Owner.RED)]);
        const res = createOwnerResources();
        expect(() => tickResources(map, res, DAY_TICKS)).not.toThrow();
        expect(res[Owner.RED].common).toBe(0);
    });
});

describe('tickResources — multiple days accumulate correctly', () => {
    it('resources accumulate over multiple days', () => {
        const map = makeMap([
            warbase(Owner.RED, 'wb'),
            factory('cannons', Owner.RED, 'f1'),
        ]);
        const res = createOwnerResources();
        for (let t = 1; t <= DAY_TICKS * 3; t++) tickResources(map, res, t);
        expect(res[Owner.RED].common).toBe(4 * 3);   // 3 days × 4
        expect(res[Owner.RED].cannons).toBe(2 * 3);  // 3 days × 2
    });
});

describe('tickResources — mixed ownership', () => {
    it('each owner earns independently from their own structures', () => {
        const map = makeMap([
            warbase(Owner.RED,  'wb_r'),
            factory('cannons',  Owner.RED,  'f_r'),
            warbase(Owner.BLUE, 'wb_b'),
            factory('missiles', Owner.BLUE, 'f_b'),
        ]);
        const res = createOwnerResources();
        tickResources(map, res, DAY_TICKS);
        expect(res[Owner.RED].common).toBe(4);
        expect(res[Owner.RED].cannons).toBe(2);
        expect(res[Owner.RED].missiles).toBe(0);
        expect(res[Owner.BLUE].common).toBe(4);
        expect(res[Owner.BLUE].missiles).toBe(2);
        expect(res[Owner.BLUE].cannons).toBe(0);
    });
});
