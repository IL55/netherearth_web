import { NullEngine, Scene, Vector3, MeshBuilder, TransformNode, type AbstractMesh } from '@babylonjs/core';

export const ALL_MODEL_NAMES = [
    'h-tracks', 'h-antigrav', 'h-bipod',
    'h-cannon', 'h-missiles', 'h-phasers', 'h-nuclear', 'h-electronics',
    'e-tracks', 'e-antigrav', 'e-bipod',
    'e-cannon', 'e-missiles', 'e-phasers', 'e-nuclear', 'e-electronics',
    'highwall1', 'highwall2', 'lowwall1', 'lowwall2', 'lowwall3',
    'warbase', 'flag',
];

// Mimics GLB structure: TransformNode root (with scaling) + child box mesh.
// instantiateHierarchy() on a TransformNode creates a new TransformNode clone
// (added to scene.transformNodes) with an InstancedMesh child (bounding box works).
export function createMockModels(scene: Scene): Map<string, AbstractMesh> {
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

export function makeEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const models = createMockModels(scene);
    const mapBegin = new Vector3(0, 0, 0);
    return { engine, scene, models, mapBegin };
}
