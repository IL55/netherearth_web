import * as BABYLON from '@babylonjs/core';

/** Closest the camera can zoom in — prevents clipping into the game board. */
export const CAMERA_RADIUS_MIN       = 4;
/** Furthest the camera can zoom out — keeps the map visible on screen. */
export const CAMERA_RADIUS_MAX       = 40;
/** Maximum vertical tilt (radians). Stays just above the horizon so the camera never flips under the board. */
export const CAMERA_BETA_MAX         = Math.PI / 2 - 0.05;
/** Horizontal rotation speed — higher value means slower rotation (Babylon default: 1000). */
export const CAMERA_ANGULAR_SENS_X   = 2500;
/** Vertical rotation speed — higher value means slower rotation (Babylon default: 1000). */
export const CAMERA_ANGULAR_SENS_Y   = 2500;
/** Scroll-wheel zoom speed — higher value means slower zoom (Babylon default: 3). */
export const CAMERA_WHEEL_PRECISION  = 10;
/** How much the camera glides after you release the mouse — closer to 1 means longer glide (Babylon default: 0.9). */
export const CAMERA_INERTIA          = 0.95;

export const setupCamera = (scene: BABYLON.Scene, canvas: HTMLCanvasElement, shipTarget: BABYLON.Vector3) => {
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 8, Math.PI / 4, 14, shipTarget, scene);
    camera.attachControl(canvas, true);
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    camera.lowerRadiusLimit    = CAMERA_RADIUS_MIN;
    camera.upperRadiusLimit    = CAMERA_RADIUS_MAX;
    camera.upperBetaLimit      = CAMERA_BETA_MAX;
    camera.angularSensibilityX = CAMERA_ANGULAR_SENS_X;
    camera.angularSensibilityY = CAMERA_ANGULAR_SENS_Y;
    camera.wheelPrecision      = CAMERA_WHEEL_PRECISION;
    camera.inertia             = CAMERA_INERTIA;

    return camera;
};

export const updateCameraTarget = (
    shipTarget: BABYLON.Vector3,
    ship: { x: number; y: number },
    mapBegin: BABYLON.Vector3,
    threshold: number = 3.5,
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
