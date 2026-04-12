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

    const clone = sourceModel.instantiateHierarchy(parent, undefined, (m, c) => {
        if ((c as BABYLON.AbstractMesh).layerMask !== undefined) {
            (c as BABYLON.AbstractMesh).layerMask = layerMask;
        }
    });

    if (!clone) return null;

    // Ensure the clone is at the origin with unit scale to compute correct bounding box
    clone.position = BABYLON.Vector3.Zero();
    clone.scaling = new BABYLON.Vector3(1, 1, 1);
    clone.rotation = BABYLON.Vector3.Zero();

    let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    
    // Only compute bounding box for visible meshes with geometry
    const childMeshes = clone.getChildMeshes();
    childMeshes.forEach(m => {
        m.isVisible = true;
        if (m.getTotalVertices() > 0) {
            m.computeWorldMatrix(true);
            const boundingInfo = m.getBoundingInfo();
            min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
        }
    });

    const center = min.add(max).scale(0.5);
    const size = max.subtract(min);
    
    // Protect against zero division if a model has no geometry
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    // Create a wrapper to act as the true center of rotation
    const wrapper = new BABYLON.TransformNode("wrapper_" + partId, scene);
    wrapper.parent = parent;
    wrapper.position = position;

    // Set clone's parent to the wrapper, then offset it by negative center 
    // to perfectly align the visual center with the wrapper's origin
    clone.parent = wrapper;
    clone.position = center.scale(-1);

    // Scale the wrapper to fit the target scale
    const finalScale = targetScale / maxDim;
    wrapper.scaling = new BABYLON.Vector3(finalScale, finalScale, finalScale);

    return wrapper;
}
