import * as BABYLON from '@babylonjs/core';
import { MODEL_OVERLAY } from './model-textures';

export const addOverlayPlanes = (
    overlays: string[],
    scene: BABYLON.Scene,
    px: number, pz: number,
    namePrefix: string,
) => {
    overlays.forEach((key, oi) => {
        const cfg = MODEL_OVERLAY[key];
        if (!cfg) return;

        const mat = new BABYLON.StandardMaterial(`${namePrefix}_ov${oi}`, scene);
        const tex = new BABYLON.Texture(cfg.texture, scene);
        if (cfg.texRot) tex.wAng = cfg.texRot;
        mat.diffuseTexture = tex;
        const b = cfg.brightness ?? 1;
        mat.diffuseColor = new BABYLON.Color3(b, b, b);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.backFaceCulling = false;
        mat.zOffset = -2;

        const plane = BABYLON.MeshBuilder.CreatePlane(`${namePrefix}_ov${oi}_plane`, { width: cfg.w, height: cfg.h }, scene);
        plane.material = mat;
        plane.rotation.set(cfg.rx, cfg.ry, cfg.rz);
        plane.position = new BABYLON.Vector3(px + cfg.dx, 1 + cfg.dy, pz + cfg.dz);
    });
};

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
