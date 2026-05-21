import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Owner } from '../../../game/core/warmap';
import { bus } from '../../../game/event-bus';
import { SOUNDS } from '../../../game/types/sound';
import { EMPTY_SELECTION } from '../../../view/construction-yard/construction-yard-logic';
import { createOwnerResources } from '../../../game/resources';
import { ConstructionYard3D } from '../../../view/construction-yard/construction-yard-3d';

// Call handleCreate directly on a minimal context object — bypasses the
// constructor entirely so we don't need a real Babylon scene.
function callHandleCreate(overrides: Partial<InstanceType<typeof ConstructionYard3D>>) {
    (ConstructionYard3D.prototype as any).handleCreate.call({
        close: vi.fn(),
        ...overrides,
    });
}

describe('ConstructionYard3D.handleCreate — sound:play CONSTRUCTION', () => {
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

    it('emits sound:play CONSTRUCTION when a valid, affordable robot is created', () => {
        const ownerResources = createOwnerResources();
        ownerResources[Owner.RED].common = 10;
        ownerResources[Owner.RED].chassis = 10;
        ownerResources[Owner.RED].cannons = 10;

        callHandleCreate({
            ownerResources,
            onCreate: vi.fn(),
            selection: { ...EMPTY_SELECTION, chassis: 'h-tracks', weapons: ['h-cannon'] },
        } as any);

        expect(soundEvents).toContain(SOUNDS.CONSTRUCTION);
    });

    it('does not emit when selection is invalid (no chassis)', () => {
        const ownerResources = createOwnerResources();
        ownerResources[Owner.RED].common = 10;

        callHandleCreate({
            ownerResources,
            onCreate: vi.fn(),
            selection: { ...EMPTY_SELECTION },
        } as any);

        expect(soundEvents).not.toContain(SOUNDS.CONSTRUCTION);
    });

    it('does not emit when resources are insufficient', () => {
        const ownerResources = createOwnerResources(); // all zero

        callHandleCreate({
            ownerResources,
            onCreate: vi.fn(),
            selection: { ...EMPTY_SELECTION, chassis: 'h-tracks', weapons: ['h-cannon'] },
        } as any);

        expect(soundEvents).not.toContain(SOUNDS.CONSTRUCTION);
    });
});
