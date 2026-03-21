import { describe, it, expect } from 'vitest';
import { addWarbase } from '../../../view/map/warbase';
import { makeEnv } from '../../test-utils';

const WARBASE_PART_COUNT = 15;

describe('addWarbase', () => {
    it('does not throw without owner', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        expect(() => addWarbase(models, scene, mapBegin, 0, 0)).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('does not throw with owner 1', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        expect(() => addWarbase(models, scene, mapBegin, 0, 0, 1)).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('creates 15 part instances (no owner)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addWarbase(models, scene, mapBegin, 0, 0);
        expect(scene.transformNodes.length - before).toBe(WARBASE_PART_COUNT);
        scene.dispose(); engine.dispose();
    });

    it('creates 16 instances (15 parts + flag) when owner is set', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addWarbase(models, scene, mapBegin, 0, 0, 1);
        expect(scene.transformNodes.length - before).toBe(WARBASE_PART_COUNT + 1);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 1 (red) is placed on the right (zo=4.5)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        addWarbase(models, scene, mapBegin, ox, oy, 1);
        const flag = scene.transformNodes[before + WARBASE_PART_COUNT];
        expect(flag.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 4.1, 5);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 2 (blue) is placed on the left (zo=-0.5)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        addWarbase(models, scene, mapBegin, ox, oy, 2);
        const flag = scene.transformNodes[before + WARBASE_PART_COUNT];
        expect(flag.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 0.1, 5);
        scene.dispose(); engine.dispose();
    });

    it('all 15 parts are placed at y=1', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addWarbase(models, scene, mapBegin, 0, 0);
        const parts = scene.transformNodes.slice(before, before + WARBASE_PART_COUNT);
        parts.forEach(part => expect(part.position.y).toBeCloseTo(1, 5));
        scene.dispose(); engine.dispose();
    });

    it('warbase model is placed at xo=1.5, yo=2 from origin', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 5;
        addWarbase(models, scene, mapBegin, ox, oy);
        // warbase model is the 8th part in WARBASE_PARTS (index 7)
        const warbasePart = scene.transformNodes[before + 7];
        expect(warbasePart.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(warbasePart.position.z).toBeCloseTo(oy + 2, 5);
        scene.dispose(); engine.dispose();
    });
});
