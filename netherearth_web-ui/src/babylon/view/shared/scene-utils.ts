import * as BABYLON from '@babylonjs/core';

export const setVisibleAll = (node: BABYLON.Node, visible: boolean) => {
    if (node instanceof BABYLON.AbstractMesh) {
        node.isVisible = visible;
    }
    node.getChildren().forEach(child => setVisibleAll(child, visible));
};

export const setFlagColor = (node: BABYLON.Node, color: BABYLON.Color3) => {
    const meshes: BABYLON.AbstractMesh[] = [];
    if (node instanceof BABYLON.AbstractMesh) meshes.push(node);
    meshes.push(...node.getChildMeshes(false));

    meshes.forEach(mesh => {
        const src = mesh.material;
        if (src instanceof BABYLON.PBRMaterial) {
            const mat = src.clone(`${src.name}_colored`) as BABYLON.PBRMaterial;
            mat.albedoColor = color;
            mat.albedoTexture = null; // clear texture so flat color shows through
            mesh.material = mat;
        } else if (src instanceof BABYLON.StandardMaterial) {
            const mat = src.clone(`${src.name}_colored`) as BABYLON.StandardMaterial;
            mat.diffuseColor = color;
            mat.diffuseTexture = null;
            mesh.material = mat;
        } else {
            const mat = new BABYLON.PBRMaterial(`flagMat_${color.toHexString()}`, mesh.getScene());
            mat.albedoColor = color;
            mesh.material = mat;
        }
    });
};
