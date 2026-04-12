import * as BABYLON from '@babylonjs/core';

export function createModelWrapper(
    scene: BABYLON.Scene,
    models: Map<string, BABYLON.AbstractMesh>,
    partId: string,
    parent: BABYLON.TransformNode,
    position: BABYLON.Vector3,
    targetScale: number,
    layerMask: number
): BABYLON.TransformNode | null {
    const sourceModel = models.get(partId);
    if (!sourceModel) return null;

    const clone = sourceModel.instantiateHierarchy(parent, { doNotInstantiate: true }, (m, c) => {
        if ((c as BABYLON.AbstractMesh).layerMask !== undefined) {
            (c as BABYLON.AbstractMesh).layerMask = layerMask;
        }
    });

    if (!clone) return null;

    // Keep native scaling (0.01) and set to origin to measure true bounds cleanly.
    clone.position = BABYLON.Vector3.Zero();
    clone.rotation = BABYLON.Vector3.Zero();
    clone.computeWorldMatrix(true);

    const childMeshes = clone.getChildMeshes(false);
    if (childMeshes.length === 0) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    childMeshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const bb = mesh.getBoundingInfo().boundingBox;
        minX = Math.min(minX, bb.minimumWorld.x);
        maxX = Math.max(maxX, bb.maximumWorld.x);
        minY = Math.min(minY, bb.minimumWorld.y);
        maxY = Math.max(maxY, bb.maximumWorld.y);
        minZ = Math.min(minZ, bb.minimumWorld.z);
        maxZ = Math.max(maxZ, bb.maximumWorld.z);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxDim = Math.max(sizeX, sizeY, sizeZ, 0.001);

    const wrapper = new BABYLON.TransformNode("wrapper_" + partId, scene);
    wrapper.parent = parent;
    wrapper.position = position;

    clone.parent = wrapper;
    // Visually center the clone at the wrapper's local origin.
    clone.position = new BABYLON.Vector3(-cx, -cy, -cz);

    // Guarantee the wrapper strictly sizes the model to `targetScale` (1.5 units) visually.
    const multiplier = targetScale / maxDim;
    wrapper.scaling = new BABYLON.Vector3(multiplier, multiplier, multiplier);

    // Force visibility and rendering layers on all nodes so they are fully illuminated and rendered.
    const allNodes = [wrapper, clone, ...clone.getDescendants()];
    allNodes.forEach(node => {
        const mesh = node as BABYLON.AbstractMesh;
        if (mesh.isVisible !== undefined) mesh.isVisible = true;
        if (mesh.layerMask !== undefined) mesh.layerMask = layerMask;
        if (mesh.renderingGroupId !== undefined) mesh.renderingGroupId = 2;
        if (node.setEnabled !== undefined) node.setEnabled(true);
    });

    return wrapper;
}
