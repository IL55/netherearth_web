import { describe, it, expect } from 'vitest';
import { addFactory } from '../../../view/map/factory';
import { makeEnv } from '../../test-utils';

const FACTORY_WALL_COUNT = 5; // highwall1 x3 + lowwall2 x2
const SUBTYPES = ['electronics', 'missiles', 'phasers', 'nuclear', 'chassis', 'cannons'] as const;

describe('addFactory', () => {
    it('does not throw for any factory subtype', () => {
        SUBTYPES.forEach(subtype => {
            const { engine, scene, models, mapBegin } = makeEnv();
            expect(() => addFactory(models, mapBegin, 5, 5, subtype)).not.toThrow();
            scene.dispose(); engine.dispose();
        });
    });

    it('creates 5 wall instances + 1 central piece', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addFactory(models, mapBegin, 0, 0, 'cannons');
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1);
        scene.dispose(); engine.dispose();
    });

    it('wall parts are placed at correct offsets from factory origin', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addFactory(models, mapBegin, 2, 3, 'cannons');
        const walls = scene.transformNodes.slice(before, before + FACTORY_WALL_COUNT);

        const expectedPositions = [
            { x: 2 + 0, z: 3 + 0 },
            { x: 2 + 0, z: 3 + 1 },
            { x: 2 + 0, z: 3 + 2 },
            { x: 2 + 1, z: 3 + 0 },
            { x: 2 + 1, z: 3 + 2 },
        ];
        walls.forEach((wall, i) => {
            expect(wall.position.x).toBeCloseTo(expectedPositions[i].x, 5);
            expect(wall.position.z).toBeCloseTo(expectedPositions[i].z, 5);
            expect(wall.position.y).toBeCloseTo(1, 5);
        });
        scene.dispose(); engine.dispose();
    });

    it('no flag is placed when owner is absent (neutral)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        addFactory(models, mapBegin, 0, 0, 'cannons');
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1);
        scene.dispose(); engine.dispose();
    });

    it('places flag on left when owner is 2 (blue)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 3;
        addFactory(models, mapBegin, ox, oy, 'cannons', 2);
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1 + 1); // + flag
        const flag = scene.transformNodes[before + FACTORY_WALL_COUNT + 1];
        expect(flag.position.x).toBeCloseTo(ox + 0, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 2.1, 5);
        scene.dispose(); engine.dispose();
    });

    it('places flag on right when owner is 1 (red)', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 3;
        addFactory(models, mapBegin, ox, oy, 'cannons', 1);
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1 + 1); // + flag
        const flag = scene.transformNodes[before + FACTORY_WALL_COUNT + 1];
        expect(flag.position.x).toBeCloseTo(ox + 0, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 0.1, 5);
        scene.dispose(); engine.dispose();
    });

    const centralPieceOffsets: Record<string, { x: number; y: number; z: number }> = {
        electronics: { x: 4.4, y: 2.1, z: -0.3 },
        missiles:    { x: 1.4, y: 2.1, z: -2.1 },
        phasers:     { x: 1.7, y: 2.0, z: -1.7 },
        nuclear:     { x: 2.6, y: 2.1, z:  0.5 },
        chassis:     { x: 6.3, y: 2.1, z: -2.4 },
        cannons:     { x: 2.4, y: 2.1, z: -3.9 },
    };

    SUBTYPES.forEach(subtype => {
        it(`central piece for subtype "${subtype}" is placed at hardcoded offset`, () => {
            const { engine, scene, models, mapBegin } = makeEnv();
            const before = scene.transformNodes.length;
            const ox = 2, oy = 3;
            addFactory(models, mapBegin, ox, oy, subtype);
            const central = scene.transformNodes[before + FACTORY_WALL_COUNT];
            const off = centralPieceOffsets[subtype];
            expect(central.position.x).toBeCloseTo(ox + off.x, 5);
            expect(central.position.y).toBeCloseTo(off.y, 5);
            expect(central.position.z).toBeCloseTo(oy + off.z, 5);
            scene.dispose(); engine.dispose();
        });
    });
});
