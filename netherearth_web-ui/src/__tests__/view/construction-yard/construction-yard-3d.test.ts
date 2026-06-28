import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Owner } from '../../../game/core/warmap';
import { bus } from '../../../game/event-bus';
import { SOUNDS } from '../../../game/types/sound';
import { EMPTY_SELECTION } from '../../../view/construction-yard/construction-yard-logic';
import { CY_PARTS } from '../../../view/construction-yard/constants';
import { createOwnerResources } from '../../../game/resources';
import { ConstructionYard3D } from '../../../view/construction-yard/construction-yard-3d';

// ── updateLabels preview ──────────────────────────────────────────────────────

vi.mock('../../../view/construction-yard/ui-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../view/construction-yard/ui-utils')>();
    return { ...actual, updateTextOnTexture: vi.fn() };
});

import { updateTextOnTexture } from '../../../view/construction-yard/ui-utils';

/** Calls updateLabels on a minimal context and returns a map of partId → displayed text. */
function getLabels(
    resources: Partial<ReturnType<typeof createOwnerResources>[typeof Owner.RED]>,
    selection: Partial<InstanceType<typeof ConstructionYard3D>['selection']> = {},
): Record<string, string> {
    vi.mocked(updateTextOnTexture).mockClear();

    const ownerResources = createOwnerResources();
    Object.assign(ownerResources[Owner.RED], resources);

    (ConstructionYard3D.prototype as any).updateLabels.call({
        ownerResources,
        selection: { ...EMPTY_SELECTION, ...selection },
        countTextures: new Map(CY_PARTS.map(p => [p.id, p.id as unknown as import('@babylonjs/core').DynamicTexture])),
    });

    const result: Record<string, string> = {};
    for (const [texture, text] of vi.mocked(updateTextOnTexture).mock.calls) {
        result[texture as unknown as string] = text as unknown as string;
    }
    return result;
}

/** Calls updateAffordability and returns a map of partId → dim alpha. */
function getAffordabilityAlphas(
    resources: Partial<ReturnType<typeof createOwnerResources>[typeof Owner.RED]>,
    selection: Partial<InstanceType<typeof ConstructionYard3D>['selection']> = {},
): Record<string, number> {
    const ownerResources = createOwnerResources();
    Object.assign(ownerResources[Owner.RED], resources);

    const selectableParts = CY_PARTS.filter(p => p.group !== 'info');
    const dimMats = new Map(
        selectableParts.map(p => [p.id, { alpha: 0 }]),
    );

    (ConstructionYard3D.prototype as any).updateAffordability.call({
        ownerResources,
        selection: { ...EMPTY_SELECTION, ...selection },
        rowDimMats: dimMats,
    });

    const result: Record<string, number> = {};
    dimMats.forEach((mat, id) => { result[id] = mat.alpha; });
    return result;
}

// Call handleCreate directly on a minimal context object — bypasses the
// constructor entirely so we don't need a real Babylon scene.
function callHandleCreate(overrides: Partial<InstanceType<typeof ConstructionYard3D>>) {
    (ConstructionYard3D.prototype as any).handleCreate.call({
        close: vi.fn(),
        ...overrides,
    });
}

describe('ConstructionYard3D.updateLabels — resource preview', () => {
    it('shows actual stock when nothing is selected', () => {
        const labels = getLabels({ chassis: 3, cannons: 2 });
        expect(labels['h-tracks']).toBe('3');   // tracks costs 1 chassis
        expect(labels['h-cannon']).toBe('2');
    });

    it('decreases the specific resource count when a part is selected', () => {
        const labels = getLabels({ chassis: 3 }, { chassis: 'h-tracks' }); // tracks costs 1
        expect(labels['h-tracks']).toBe('2');
        expect(labels['h-bipod']).toBe('2');    // same pool — bipod also reads chassis
        expect(labels['h-antigrav']).toBe('2');
    });

    it('decreases common when specific resource runs out', () => {
        // chassis=0 so the cost falls back to common
        const labels = getLabels({ chassis: 0, common: 5 }, { chassis: 'h-tracks' }); // tracks costs 1 chassis → fallback to 1 common
        expect(labels['h-tracks']).toBe('0');
        expect(labels['common']).toBe('4');
    });

    it('shows zero, not negative, when stock exactly covers cost', () => {
        const labels = getLabels({ chassis: 1 }, { chassis: 'h-tracks' });
        expect(labels['h-tracks']).toBe('0');
    });
});

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

describe('ConstructionYard3D.updateAffordability — dim overlay', () => {
    it('all rows are undimmed when resources are plentiful', () => {
        const alphas = getAffordabilityAlphas({ common: 10, chassis: 10, cannons: 10, missiles: 10, phasers: 10 });
        Object.values(alphas).forEach(a => expect(a).toBe(0));
    });

    it('dims rows whose specific resource is 0 and common is also 0', () => {
        // phasers costs 3 phasers resource — unaffordable when both phasers and common are 0
        const alphas = getAffordabilityAlphas({ phasers: 0, common: 0 });
        expect(alphas['h-phasers']).toBeGreaterThan(0);
    });

    it('does not dim an expensive row when common covers the deficit', () => {
        // phasers costs 3; phasers=0 but common=5 → still affordable
        const alphas = getAffordabilityAlphas({ phasers: 0, common: 5 });
        expect(alphas['h-phasers']).toBe(0);
    });

    it('dims an unaffordable row but not an affordable one at the same time', () => {
        // With chassis=1, cannons=1, phasers=0, common=0 and h-tracks already selected:
        // adding h-cannon (cost 1 cannon): chassis=1 ✓, cannon=1 ✓ → affordable
        // adding h-phasers (cost 3 phasers): chassis=1 ✓, phasers=0 deficit 3, common=0 → unaffordable
        const alphas = getAffordabilityAlphas(
            { chassis: 1, cannons: 1, phasers: 0, common: 0 },
            { chassis: 'h-tracks' },
        );
        expect(alphas['h-cannon']).toBe(0);
        expect(alphas['h-phasers']).toBeGreaterThan(0);
    });
});
