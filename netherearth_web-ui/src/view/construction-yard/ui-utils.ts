import * as BABYLON from '@babylonjs/core';

export function createTextPlane(
    scene: BABYLON.Scene,
    text: string, 
    width: number, 
    height: number, 
    layerMask: number, 
    font: string, 
    bgColor: string = "transparent"
): { mesh: BABYLON.Mesh, texture: BABYLON.DynamicTexture } {
    const plane = BABYLON.MeshBuilder.CreatePlane("textPlane", { width, height }, scene);
    const dt = new BABYLON.DynamicTexture("dt", { width: width * 100, height: height * 100 }, scene, false);
    dt.hasAlpha = true;
    
    if (bgColor !== "transparent") {
        const ctx = dt.getContext();
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width * 100, height * 100);
        dt.update();
    }

    // Use x=20 to left-align the text with a small padding, rather than center-aligning
    dt.drawText(text, 20, null, font, "white", "transparent", true);
    const mat = new BABYLON.StandardMaterial("textMat", scene);
    mat.diffuseTexture = dt;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.layerMask = layerMask;
    plane.renderingGroupId = 2; // Ensure UI renders on top of background
    return { mesh: plane, texture: dt };
}

export function updateTextOnTexture(
    texture: BABYLON.DynamicTexture,
    text: string,
    font: string,
    bgColor: string = "transparent"
): void {
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, texture.getSize().width, texture.getSize().height);
    
    if (bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, texture.getSize().width, texture.getSize().height);
    }
    
    texture.drawText(text, 20, null, font, "white", "transparent", true);
}

export function createBackground(
    scene: BABYLON.Scene, 
    parent: BABYLON.TransformNode, 
    width: number, 
    height: number, 
    layerMask: number
): BABYLON.Mesh {
    const bgMat = new BABYLON.StandardMaterial("cyBgMat", scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    bgMat.alpha = 0.8;
    bgMat.disableLighting = true;
    
    const bgPlane = BABYLON.MeshBuilder.CreatePlane("cyBg", { width, height }, scene);
    bgPlane.parent = parent;
    bgPlane.material = bgMat;
    bgPlane.position.z = 2; // Behind everything
    bgPlane.layerMask = layerMask;
    bgPlane.renderingGroupId = 1; // Render after game scene, but before UI elements
    
    return bgPlane;
}
