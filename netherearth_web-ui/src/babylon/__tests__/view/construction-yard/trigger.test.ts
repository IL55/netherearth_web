import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectType, Owner } from '../../../game/core/warmap';
import type { WarMap } from '../../../game/core/warmap';
import { bus } from '../../../game/event-bus';
import { SOUNDS } from '../../../game/types/sound';

vi.mock('../../../view/construction-yard/construction-yard-3d', () => ({
    ConstructionYard3D: class {
        open = vi.fn();
        dispose = vi.fn();
    },
}));

import { ConstructionYardTrigger } from '../../../view/construction-yard/trigger';

const WARBASE_X = 4;
const WARBASE_Y = 6;
// Trigger point: (warbase.x + 1.5, warbase.y + 2), height <= 1.05
const SHIP_INSIDE  = { x: WARBASE_X + 1.5, y: WARBASE_Y + 2, height: 1.0 };
const SHIP_OUTSIDE = { x: WARBASE_X + 5,   y: WARBASE_Y + 5, height: 1.5 };

function makeWarMap(): WarMap {
    return {
        width: 20, height: 20,
        tiles: [{ id: 'wb', type: ObjectType.WARBASE, x: WARBASE_X, y: WARBASE_Y, owner: Owner.RED }],
        robots: [], projectiles: [], killCounts: {}, tick: 0,
    };
}

describe('ConstructionYardTrigger — sound:play SELECT', () => {
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

    it('emits sound:play SELECT when ship enters the warbase', () => {
        const trigger = new ConstructionYardTrigger(null as any, null as any, null as any, () => {});
        trigger.check(makeWarMap(), SHIP_INSIDE);

        expect(soundEvents).toContain(SOUNDS.SELECT);
        trigger.dispose();
    });

    it('emits SELECT only once per entry (not on every check)', () => {
        const trigger = new ConstructionYardTrigger(null as any, null as any, null as any, () => {});
        trigger.check(makeWarMap(), SHIP_INSIDE);
        trigger.check(makeWarMap(), SHIP_INSIDE);
        trigger.check(makeWarMap(), SHIP_INSIDE);

        expect(soundEvents.filter(n => n === SOUNDS.SELECT)).toHaveLength(1);
        trigger.dispose();
    });

    it('does not emit SELECT when ship is outside the warbase', () => {
        const trigger = new ConstructionYardTrigger(null as any, null as any, null as any, () => {});
        trigger.check(makeWarMap(), SHIP_OUTSIDE);

        expect(soundEvents).not.toContain(SOUNDS.SELECT);
        trigger.dispose();
    });

    it('emits SELECT again after ship leaves and re-enters', () => {
        const trigger = new ConstructionYardTrigger(null as any, null as any, null as any, () => {});
        trigger.check(makeWarMap(), SHIP_INSIDE);
        trigger.check(makeWarMap(), SHIP_OUTSIDE); // leave — resets hasTriggeredYard
        trigger.check(makeWarMap(), SHIP_INSIDE);  // re-enter

        expect(soundEvents.filter(n => n === SOUNDS.SELECT)).toHaveLength(2);
        trigger.dispose();
    });
});
