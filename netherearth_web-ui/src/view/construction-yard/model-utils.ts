import * as BABYLON from '@babylonjs/core';
import { STACK_GAP } from './constants';

// ── Shared helpers ────────────────────────────────────────────────────────────

function measureWorldBounds(meshes: BABYLON.AbstractMesh[]) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const bb = mesh.getBoundingInfo().boundingBox;
        minX = Math.min(minX, bb.minimumWorld.x); maxX = Math.max(maxX, bb.maximumWorld.x);
        minY = Math.min(minY, bb.minimumWorld.y); maxY = Math.max(maxY, bb.maximumWorld.y);
        minZ = Math.min(minZ, bb.minimumWorld.z); maxZ = Math.max(maxZ, bb.maximumWorld.z);
    });
    return { minX, maxX, minY, maxY, minZ, maxZ };
}

function applyRenderingProps(root: BABYLON.TransformNode, layerMask: number): void {
    [root, ...root.getDescendants()].forEach(node => {
        const mesh = node as BABYLON.AbstractMesh;
        if (mesh.isVisible !== undefined) mesh.isVisible = true;
        if (mesh.layerMask !== undefined) mesh.layerMask = layerMask;
        if (mesh.renderingGroupId !== undefined) mesh.renderingGroupId = 2;
        if (node.setEnabled !== undefined) node.setEnabled(true);
    });
}

function clonePart(
    sourceModel: BABYLON.AbstractMesh,
    parent: BABYLON.TransformNode,
    layerMask: number
): BABYLON.TransformNode | null {
    return sourceModel.instantiateHierarchy(parent, { doNotInstantiate: true }, (_m, c) => {
        if ((c as BABYLON.AbstractMesh).layerMask !== undefined) {
            (c as BABYLON.AbstractMesh).layerMask = layerMask;
        }
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

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

    const clone = clonePart(sourceModel, parent, layerMask);
    if (!clone) return null;

    clone.position = BABYLON.Vector3.Zero();
    clone.rotation = BABYLON.Vector3.Zero();
    clone.computeWorldMatrix(true);

    const childMeshes = clone.getChildMeshes(false);
    if (childMeshes.length === 0) return null;

    const { minX, maxX, minY, maxY, minZ, maxZ } = measureWorldBounds(childMeshes);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);

    const wrapper = new BABYLON.TransformNode("wrapper_" + partId, scene);
    wrapper.parent = parent;
    wrapper.position = position;
    wrapper.scaling = new BABYLON.Vector3(targetScale / maxDim, targetScale / maxDim, targetScale / maxDim);

    clone.parent = wrapper;
    clone.position = new BABYLON.Vector3(-cx, -cy, -cz);

    applyRenderingProps(wrapper, layerMask);
    return wrapper;
}

// Stacks multiple parts bottom-to-top (same order as placeRobot) and wraps the
// whole assembly in a single TransformNode ready for rotation and scaling.
export function createRobotPreviewWrapper(
    scene: BABYLON.Scene,
    models: Map<string, BABYLON.AbstractMesh>,
    partIds: string[],
    parent: BABYLON.TransformNode,
    position: BABYLON.Vector3,
    targetScale: number,
    layerMask: number,
    stackGap = STACK_GAP
): BABYLON.TransformNode | null {
    const assembly = new BABYLON.TransformNode("cyRobotAssembly", scene);
    assembly.parent = parent;
    assembly.position = BABYLON.Vector3.Zero();

    let groundY = 0;
    let hasAnyPart = false;
    // Track bounds analytically: each part is XZ-centered to 0, so cx=cz=0.
    let halfX_max = 0, halfZ_max = 0, topY = 0;

    for (const partId of partIds) {
        const sourceModel = models.get(partId);
        if (!sourceModel) continue;

        const clone = clonePart(sourceModel, assembly, layerMask);
        if (!clone) continue;

        clone.position.set(0, groundY, 0);
        clone.rotation = BABYLON.Vector3.Zero();
        clone.computeWorldMatrix(true);

        const childMeshes = clone.getChildMeshes(false);
        if (childMeshes.length === 0) continue;

        const { minX, maxX, minY, maxY, minZ, maxZ } = measureWorldBounds(childMeshes);

        // Center on XZ, sit bottom on groundY
        clone.position.x -= (minX + maxX) / 2;
        clone.position.y += groundY - minY;
        clone.position.z -= (minZ + maxZ) / 2;
        clone.computeWorldMatrix(true);

        const partHeight = maxY - minY;
        halfX_max = Math.max(halfX_max, (maxX - minX) / 2);
        halfZ_max = Math.max(halfZ_max, (maxZ - minZ) / 2);
        topY = groundY + partHeight;

        groundY += partHeight - stackGap;
        hasAnyPart = true;
    }

    if (!hasAnyPart) {
        assembly.dispose();
        return null;
    }

    // cx = 0, cz = 0 (all parts XZ-centered); cy = mid-point of [0, topY]
    const cy = topY / 2;
    const maxDim = Math.max(halfX_max * 2, topY, halfZ_max * 2, 0.001);

    const wrapper = new BABYLON.TransformNode("cyRobotPreview", scene);
    wrapper.parent = parent;
    wrapper.position = position;
    wrapper.scaling = new BABYLON.Vector3(targetScale / maxDim, targetScale / maxDim, targetScale / maxDim);

    assembly.parent = wrapper;
    assembly.position = new BABYLON.Vector3(0, -cy, 0);

    applyRenderingProps(wrapper, layerMask);
    return wrapper;
}
