import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, Vector3, MeshBuilder, TransformNode, type AbstractMesh } from '@babylonjs/core';
import { placeRobot, robotConfigs, createMap, type MapData } from '../map';

const ALL_MODEL_NAMES = [
    'h-tracks', 'h-antigrav', 'h-bipod',
    'h-cannon', 'h-missiles', 'h-phasers', 'h-nuclear', 'h-electronics',
    'e-tracks', 'e-antigrav', 'e-bipod',
    'e-cannon', 'e-missiles', 'e-phasers', 'e-nuclear', 'e-electronics',
    'highwall1', 'highwall2', 'lowwall1', 'lowwall2', 'lowwall3',
    'warbase', 'flag',
];

// Minimal MapData with unknown tile (no tile instances) and specified objects
function mapWith(objects: MapData['objects']): MapData {
    return { width: 1, height: 1, tiles: [['X']], objects };
}

// Mimics GLB structure: TransformNode root (with scaling) + child box mesh.
// instantiateHierarchy() on a TransformNode creates a new TransformNode clone
// (added to scene.transformNodes) with an InstancedMesh child (bounding box works).
function createMockModels(scene: Scene): Map<string, AbstractMesh> {
    const models = new Map<string, AbstractMesh>();
    ALL_MODEL_NAMES.forEach(name => {
        const root = new TransformNode(name, scene);
        root.scaling = new Vector3(0.01, 0.01, 0.01);
        const child = MeshBuilder.CreateBox(name + '_mesh', { size: 2 }, scene);
        child.isVisible = false;
        child.parent = root;
        models.set(name, root as unknown as AbstractMesh);
    });
    return models;
}

describe('robotConfigs', () => {
    it('each config has chassis, weapon, and electronics', () => {
        robotConfigs.forEach(config => {
            expect(config.chassis).toBeTruthy();
            expect(config.weapon).toBeTruthy();
            expect(config.electronics).toBeTruthy();
        });
    });

    it('chassis and electronics belong to the same team prefix', () => {
        robotConfigs.forEach(config => {
            const chassisTeam = config.chassis.split('-')[0];
            const electronicsTeam = config.electronics.split('-')[0];
            expect(chassisTeam).toBe(electronicsTeam);
        });
    });

    it('nuclear configs use matching team prefix', () => {
        robotConfigs.filter(c => c.nuclear).forEach(config => {
            const team = config.chassis.startsWith('e') ? 'e' : 'h';
            expect(config.chassis.startsWith(team)).toBe(true);
            expect(config.electronics.startsWith(team)).toBe(true);
        });
    });

    it('has 6 configs', () => {
        expect(robotConfigs).toHaveLength(6);
    });
});

describe('placeRobot', () => {
    let engine: NullEngine;
    let scene: Scene;
    let models: Map<string, AbstractMesh>;
    const mapBegin = new Vector3(0, 0, 0);
    const STACK_GAP = 0; // disable gap so math is predictable

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        models = createMockModels(scene);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('does not throw with a valid config', () => {
        expect(() => placeRobot(models, mapBegin, 5, 5, robotConfigs[0], 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when chassis model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-tracks');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs[0], 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when weapon model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-cannon');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs[0], 0, STACK_GAP)).not.toThrow();
    });

    it('adds 3 transform nodes for a config without nuclear', () => {
        const config = robotConfigs.find(c => !c.nuclear)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(3); // chassis + weapon + electronics
    });

    it('adds 4 transform nodes for a config with nuclear', () => {
        const config = robotConfigs.find(c => c.nuclear)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(4); // chassis + weapon + nuclear + electronics
    });

    it('places chassis XZ at the requested tile coords', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 3, 7, robotConfigs[0], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(3, 1);
        expect(chassis.position.z).toBeCloseTo(7, 1);
    });

    it('applies mapBegin offset to XZ position', () => {
        const begin = new Vector3(10, 0, 5);
        const before = scene.transformNodes.length;
        placeRobot(models, begin, 3, 7, robotConfigs[0], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(13, 1);
        expect(chassis.position.z).toBeCloseTo(12, 1);
    });

    it('applies rotation to all placed parts', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs[0], Math.PI / 2, STACK_GAP);
        const newNodes = scene.transformNodes.slice(before);
        newNodes.forEach(node => {
            expect(node.rotation.y).toBeCloseTo(Math.PI / 2);
        });
    });

    it('stacks parts vertically: weapon above chassis, electronics above weapon', () => {
        const config = robotConfigs.find(c => !c.nuclear)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        const [chassis, weapon, electronics] = scene.transformNodes.slice(before);
        expect(weapon.position.y).toBeGreaterThan(chassis.position.y);
        expect(electronics.position.y).toBeGreaterThan(weapon.position.y);
    });

    it('chassis bottom is grounded at y=1', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs[0], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        chassis.computeWorldMatrix(true);
        const childMeshes = chassis.getChildMeshes();
        childMeshes.forEach(m => m.computeWorldMatrix(true));
        const minY = Math.min(...childMeshes.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
        expect(minY).toBeCloseTo(1, 1);
    });

    it('all six configs place robots without throwing', () => {
        robotConfigs.forEach((config, i) => {
            expect(() => placeRobot(models, mapBegin, i, 0, config, 0, STACK_GAP)).not.toThrow();
        });
    });
});

// ─── Shared setup for createMap tests ─────────────────────────────────────────

function makeCreateMapEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const models = createMockModels(scene);
    const mapBegin = new Vector3(0, 0, 0);
    return { engine, scene, models, mapBegin };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

describe('createMap - factory', () => {
    const FACTORY_WALL_COUNT = 5; // highwall1 x3 + lowwall2 x2
    const SUBTYPES = ['electronics', 'missiles', 'phasers', 'nuclear', 'chassis', 'cannons'] as const;

    it('does not throw for any factory subtype', () => {
        SUBTYPES.forEach(subtype => {
            const { engine, scene, models, mapBegin } = makeCreateMapEnv();
            expect(() =>
                createMap(mapWith([{ type: 'factory', x: 5, y: 5, subtype }]), models, scene, mapBegin)
            ).not.toThrow();
            scene.dispose(); engine.dispose();
        });
    });

    it('creates 5 wall instances for a factory', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'factory', x: 0, y: 0, subtype: 'cannons' }]), models, scene, mapBegin);
        // 5 walls + 1 central piece = 6 total; first 5 are walls
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1);
        scene.dispose(); engine.dispose();
    });

    it('wall parts are placed at correct offsets from factory origin', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'factory', x: 2, y: 3, subtype: 'cannons' }]), models, scene, mapBegin);
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

    const centralPieceOffsets: Record<string, { x: number; y: number; z: number }> = {
        electronics: { x: 4.4, y: 2.1, z: -0.3 },
        missiles:    { x: 1.4, y: 2.1, z: -2.1 },
        phasers:     { x: 1.7, y: 2.0, z: -1.7 },
        nuclear:     { x: 2.6, y: 2.1, z:  0.5 },
        chassis:     { x: 6.3, y: 2.1, z: -2.4 },
        cannons:     { x: 2.4, y: 2.1, z: -3.9 },
    };

    it('no flag is placed when flagSide is absent', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'factory', x: 0, y: 0, subtype: 'cannons' }]), models, scene, mapBegin);
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1); // walls + central only
        scene.dispose(); engine.dispose();
    });

    it('places a flag when flagSide is "left"', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 3;
        createMap(mapWith([{ type: 'factory', x: ox, y: oy, subtype: 'cannons', flagSide: 'left' }]), models, scene, mapBegin);
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1 + 1); // + flag
        const flag = scene.transformNodes[before + FACTORY_WALL_COUNT + 1];
        expect(flag.position.x).toBeCloseTo(ox + 0, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 1, 5);
        scene.dispose(); engine.dispose();
    });

    it('places a flag when flagSide is "right"', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 3;
        createMap(mapWith([{ type: 'factory', x: ox, y: oy, subtype: 'cannons', flagSide: 'right' }]), models, scene, mapBegin);
        expect(scene.transformNodes.length - before).toBe(FACTORY_WALL_COUNT + 1 + 1); // + flag
        const flag = scene.transformNodes[before + FACTORY_WALL_COUNT + 1];
        expect(flag.position.x).toBeCloseTo(ox + 1, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 1, 5);
        scene.dispose(); engine.dispose();
    });

    SUBTYPES.forEach(subtype => {
        it(`central piece for subtype "${subtype}" is placed at hardcoded offset`, () => {
            const { engine, scene, models, mapBegin } = makeCreateMapEnv();
            const before = scene.transformNodes.length;
            const ox = 2, oy = 3;
            createMap(mapWith([{ type: 'factory', x: ox, y: oy, subtype }]), models, scene, mapBegin);
            const central = scene.transformNodes[before + FACTORY_WALL_COUNT];
            const off = centralPieceOffsets[subtype];
            expect(central.position.x).toBeCloseTo(ox + off.x, 5);
            expect(central.position.y).toBeCloseTo(off.y, 5);
            expect(central.position.z).toBeCloseTo(oy + off.z, 5);
            scene.dispose(); engine.dispose();
        });
    });
});

// ─── Warbase ──────────────────────────────────────────────────────────────────

describe('createMap - warbase', () => {
    const WARBASE_PART_COUNT = 15;

    it('does not throw without owner', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        expect(() =>
            createMap(mapWith([{ type: 'warbase', x: 0, y: 0 }]), models, scene, mapBegin)
        ).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('does not throw with owner 1', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        expect(() =>
            createMap(mapWith([{ type: 'warbase', x: 0, y: 0, owner: 1 }]), models, scene, mapBegin)
        ).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('creates 15 part instances (no owner)', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'warbase', x: 0, y: 0 }]), models, scene, mapBegin);
        expect(scene.transformNodes.length - before).toBe(WARBASE_PART_COUNT);
        scene.dispose(); engine.dispose();
    });

    it('creates 16 instances (15 parts + flag) when owner is set', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'warbase', x: 0, y: 0, owner: 1 }]), models, scene, mapBegin);
        expect(scene.transformNodes.length - before).toBe(WARBASE_PART_COUNT + 1);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 1 is placed at z offset 0', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        createMap(mapWith([{ type: 'warbase', x: ox, y: oy, owner: 1 }]), models, scene, mapBegin);
        const flag = scene.transformNodes[before + WARBASE_PART_COUNT];
        expect(flag.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 0, 5);
        scene.dispose(); engine.dispose();
    });

    it('flag for owner 2 is placed at z offset 4.1', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        const ox = 3, oy = 4;
        createMap(mapWith([{ type: 'warbase', x: ox, y: oy, owner: 2 }]), models, scene, mapBegin);
        const flag = scene.transformNodes[before + WARBASE_PART_COUNT];
        expect(flag.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(flag.position.y).toBeCloseTo(2, 5);
        expect(flag.position.z).toBeCloseTo(oy + 4.1, 5);
        scene.dispose(); engine.dispose();
    });

    it('all 15 parts are placed at y=1', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        createMap(mapWith([{ type: 'warbase', x: 0, y: 0 }]), models, scene, mapBegin);
        const parts = scene.transformNodes.slice(before, before + WARBASE_PART_COUNT);
        parts.forEach(part => expect(part.position.y).toBeCloseTo(1, 5));
        scene.dispose(); engine.dispose();
    });

    it('warbase part is placed at xo=1.5, yo=2 from origin', () => {
        const { engine, scene, models, mapBegin } = makeCreateMapEnv();
        const before = scene.transformNodes.length;
        const ox = 2, oy = 5;
        createMap(mapWith([{ type: 'warbase', x: ox, y: oy }]), models, scene, mapBegin);
        // warbase model is the 8th part in warbaseParts (index 7)
        const warbasePart = scene.transformNodes[before + 7];
        expect(warbasePart.position.x).toBeCloseTo(ox + 1.5, 5);
        expect(warbasePart.position.z).toBeCloseTo(oy + 2, 5);
        scene.dispose(); engine.dispose();
    });
});
