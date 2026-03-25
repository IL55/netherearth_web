import { describe, it, expect } from 'vitest';
import { Owner } from '../../../game/owner';
import { addWarbase } from '../../../view/map/warbase';
import { makeEnv } from '../../test-utils';

const WARBASE_PART_COUNT = 15; // 14 wall pieces + 1 central H (warbase model), always visible

describe('addWarbase', () => {
    it('does not throw without owner', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        expect(() => addWarbase(models, scene, mapBegin, 0, 0)).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('does not throw with any owner', () => {
        [Owner.RED, Owner.BLUE].forEach(owner => {
            const { engine, scene, models, mapBegin } = makeEnv();
            expect(() => addWarbase(models, scene, mapBegin, 0, 0, owner)).not.toThrow();
            scene.dispose(); engine.dispose();
        });
    });

    it('creates 15 part instances regardless of owner', () => {
        [undefined, Owner.RED, Owner.BLUE].forEach(owner => {
            const { engine, scene, models, mapBegin } = makeEnv();
            const before = scene.transformNodes.length;
            addWarbase(models, scene, mapBegin, 0, 0, owner);
            const parts = scene.transformNodes.length - before;
            // owner with flag adds 1 extra transform node
            const expected = owner !== undefined ? WARBASE_PART_COUNT + 1 : WARBASE_PART_COUNT;
            expect(parts).toBe(expected);
            scene.dispose(); engine.dispose();
        });
    });

    it('no flag when owner is absent', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addWarbase(models, scene, mapBegin, 0, 0);
        expect(scene.transformNodes.length - before).toBe(WARBASE_PART_COUNT);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 1 (red) is placed on the right (zo=4.1)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        addWarbase(models, scene, mapBegin, ox, oy, Owner.RED);
        const flag = scene.transformNodes[before + WARBASE_PART_COUNT];
        expect(flag.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 4.1, 5);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 2 (blue) is placed on the left (zo=0.1)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        addWarbase(models, scene, mapBegin, ox, oy, Owner.BLUE);
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

    it('H (warbase model) is placed at xo=1.5, yo=2 from origin', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 5;
        addWarbase(models, scene, mapBegin, ox, oy);
        // warbase H model is the 8th part in WARBASE_PARTS (index 7)
        const warbasePart = scene.transformNodes[before + 7];
        expect(warbasePart.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(warbasePart.position.z).toBeCloseTo(oy + 2, 5);
        scene.dispose(); engine.dispose();
    });

    it('owner=2 adds exactly 1 extra mesh (decal plane) compared to owner=1', () => {
        const env1 = makeEnv();
        const before1 = env1.scene.meshes.length;
        addWarbase(env1.models, env1.scene, env1.mapBegin, 0, 0, Owner.RED);
        const meshCount1 = env1.scene.meshes.length - before1;
        env1.scene.dispose(); env1.engine.dispose();

        const env2 = makeEnv();
        const before2 = env2.scene.meshes.length;
        addWarbase(env2.models, env2.scene, env2.mapBegin, 0, 0, Owner.BLUE);
        const meshCount2 = env2.scene.meshes.length - before2;
        env2.scene.dispose(); env2.engine.dispose();

        expect(meshCount2 - meshCount1).toBe(1);
    });
});
