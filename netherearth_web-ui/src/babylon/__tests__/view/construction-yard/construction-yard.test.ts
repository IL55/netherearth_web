import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { createModelWrapper, createRobotPreviewWrapper } from '../../../view/construction-yard/model-utils';
import { CY_PARTS, CY_LAYOUT, PREVIEW_ROBOT_PARTS, STACK_GAP } from '../../../view/construction-yard/constants';
import { makeEnv } from '../../test-utils';

const LAYER_MASK = 0x10000000;

describe('createModelWrapper', () => {
    let engine: NullEngine;
    let scene: Scene;
    let models: Map<string, AbstractMesh>;
    let parent: TransformNode;

    beforeEach(() => {
        ({ engine, scene, models } = makeEnv());
        parent = new TransformNode('testParent', scene);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('returns null when model is not in the map', () => {
        const result = createModelWrapper(scene, models, 'nonexistent', parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result).toBeNull();
    });

    it('returns a TransformNode when model exists', () => {
        const result = createModelWrapper(scene, models, 'h-bipod', parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result).not.toBeNull();
        expect(result).toBeInstanceOf(TransformNode);
    });

    it('positions the wrapper at the given position', () => {
        const pos = new Vector3(3, -2, 0);
        const result = createModelWrapper(scene, models, 'h-bipod', parent, pos, 1.5, LAYER_MASK);
        expect(result!.position.x).toBeCloseTo(3);
        expect(result!.position.y).toBeCloseTo(-2);
        expect(result!.position.z).toBeCloseTo(0);
    });

    it('scales uniformly so the model fits targetScale', () => {
        const result = createModelWrapper(scene, models, 'h-bipod', parent, Vector3.Zero(), 2, LAYER_MASK);
        expect(result!.scaling.x).toBeCloseTo(result!.scaling.y);
        expect(result!.scaling.y).toBeCloseTo(result!.scaling.z);
    });

    it('sets the wrapper parent to the provided parent node', () => {
        const result = createModelWrapper(scene, models, 'h-tracks', parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result!.parent).toBe(parent);
    });

    it('works for every non-common CY_PARTS entry', () => {
        CY_PARTS.filter(p => p.id !== 'common').forEach(part => {
            expect(() =>
                createModelWrapper(scene, models, part.id, parent, Vector3.Zero(), CY_LAYOUT.targetScale, LAYER_MASK)
            ).not.toThrow();
        });
    });
});

describe('createRobotPreviewWrapper', () => {
    let engine: NullEngine;
    let scene: Scene;
    let models: Map<string, AbstractMesh>;
    let parent: TransformNode;

    beforeEach(() => {
        ({ engine, scene, models } = makeEnv());
        parent = new TransformNode('testParent', scene);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('returns null when no part ids match the models map', () => {
        const result = createRobotPreviewWrapper(scene, models, ['nope-1', 'nope-2'], parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result).toBeNull();
    });

    it('returns a TransformNode for a single valid part', () => {
        const result = createRobotPreviewWrapper(scene, models, ['h-bipod'], parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result).not.toBeNull();
        expect(result).toBeInstanceOf(TransformNode);
    });

    it('returns a TransformNode for all PREVIEW_ROBOT_PARTS', () => {
        const result = createRobotPreviewWrapper(scene, models, PREVIEW_ROBOT_PARTS, parent, Vector3.Zero(), CY_LAYOUT.panelRobotScale, LAYER_MASK);
        expect(result).not.toBeNull();
    });

    it('positions the wrapper at the given position', () => {
        const pos = new Vector3(15, 1, 0);
        const result = createRobotPreviewWrapper(scene, models, ['h-bipod'], parent, pos, 1, LAYER_MASK);
        expect(result!.position.x).toBeCloseTo(15);
        expect(result!.position.y).toBeCloseTo(1);
        expect(result!.position.z).toBeCloseTo(0);
    });

    it('scales uniformly', () => {
        const result = createRobotPreviewWrapper(scene, models, ['h-bipod'], parent, Vector3.Zero(), 3, LAYER_MASK);
        expect(result!.scaling.x).toBeCloseTo(result!.scaling.y);
        expect(result!.scaling.y).toBeCloseTo(result!.scaling.z);
    });

    it('skips missing parts and still builds from valid ones', () => {
        const result = createRobotPreviewWrapper(scene, models, ['nonexistent', 'h-bipod'], parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result).not.toBeNull();
    });

    it('sets the wrapper parent to the provided parent node', () => {
        const result = createRobotPreviewWrapper(scene, models, ['h-bipod'], parent, Vector3.Zero(), 1, LAYER_MASK);
        expect(result!.parent).toBe(parent);
    });
});

describe('CY_PARTS', () => {
    it('contains 9 entries', () => {
        expect(CY_PARTS).toHaveLength(9);
    });

    it('last entry is "common" with null cost', () => {
        const last = CY_PARTS[CY_PARTS.length - 1];
        expect(last.id).toBe('common');
        expect(last.cost).toBeNull();
    });

    it('all non-common parts have positive costs', () => {
        CY_PARTS.filter(p => p.id !== 'common').forEach(p => {
            expect(p.cost).not.toBeNull();
            expect(p.cost!).toBeGreaterThan(0);
        });
    });

    it('each part has a non-empty label', () => {
        CY_PARTS.forEach(p => {
            expect(p.label.length).toBeGreaterThan(0);
        });
    });

    it('part ids are unique', () => {
        const ids = CY_PARTS.map(p => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('PREVIEW_ROBOT_PARTS are all valid CY_PARTS ids', () => {
        const validIds = new Set(CY_PARTS.map(p => p.id));
        PREVIEW_ROBOT_PARTS.forEach(id => {
            expect(validIds.has(id)).toBe(true);
        });
    });
});

describe('CY_LAYOUT', () => {
    it('orthoHeight is positive', () => {
        expect(CY_LAYOUT.orthoHeight).toBeGreaterThan(0);
    });

    it('stepY is positive', () => {
        expect(CY_LAYOUT.stepY).toBeGreaterThan(0);
    });

    it('targetScale is positive', () => {
        expect(CY_LAYOUT.targetScale).toBeGreaterThan(0);
    });

    it('bgWidth and bgHeight cover the whole viewport', () => {
        expect(CY_LAYOUT.bgWidth).toBeGreaterThanOrEqual(CY_LAYOUT.orthoHeight * 2);
        expect(CY_LAYOUT.bgHeight).toBeGreaterThanOrEqual(CY_LAYOUT.orthoHeight * 2);
    });
});

describe('STACK_GAP', () => {
    it('is a small positive number', () => {
        expect(STACK_GAP).toBeGreaterThan(0);
        expect(STACK_GAP).toBeLessThan(1);
    });
});
