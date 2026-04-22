import * as BABYLON from '@babylonjs/core';

export const setupCamera = (scene: BABYLON.Scene, canvas: HTMLCanvasElement, shipTarget: BABYLON.Vector3) => {
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 4, 8, shipTarget, scene);
    camera.attachControl(canvas, true);
    // Remove default keyboard inputs (arrow keys, etc.) from the camera
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    return camera;
};

export const updateCameraTarget = (
    shipTarget: BABYLON.Vector3,
    ship: { x: number; y: number },
    mapBegin: BABYLON.Vector3,
    threshold: number = 3.5
) => {
    const dx = (mapBegin.x + ship.x) - shipTarget.x;
    const dz = (mapBegin.z + ship.y) - shipTarget.z;
    
    if (Math.abs(dx) > threshold) {
        shipTarget.x += dx > 0 ? dx - threshold : dx + threshold;
    }
    if (Math.abs(dz) > threshold) {
        shipTarget.z += dz > 0 ? dz - threshold : dz + threshold;
    }
};
