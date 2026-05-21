import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import { setupCamera, updateCameraTarget, CAMERA_RADIUS_MIN, CAMERA_RADIUS_MAX, CAMERA_BETA_MAX, CAMERA_ANGULAR_SENS_X, CAMERA_ANGULAR_SENS_Y, CAMERA_WHEEL_PRECISION, CAMERA_INERTIA } from '../../controls/camera';

describe('setupCamera', () => {
    let engine: NullEngine;
    let scene: Scene;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('returns an ArcRotateCamera', () => {
        const canvas = document.createElement('canvas');
        const target = new Vector3(0, 0, 0);
        const camera = setupCamera(scene, canvas, target);
        expect(camera).toBeInstanceOf(ArcRotateCamera);
    });

    it('sets lowerRadiusLimit to CAMERA_RADIUS_MIN', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.lowerRadiusLimit).toBe(CAMERA_RADIUS_MIN);
    });

    it('sets upperRadiusLimit to CAMERA_RADIUS_MAX', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.upperRadiusLimit).toBe(CAMERA_RADIUS_MAX);
    });

    it('sets upperBetaLimit to CAMERA_BETA_MAX so camera cannot go under the board', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.upperBetaLimit).toBeCloseTo(CAMERA_BETA_MAX, 5);
    });

    it('CAMERA_BETA_MAX is less than π/2 so horizon is never crossed', () => {
        expect(CAMERA_BETA_MAX).toBeLessThan(Math.PI / 2);
    });

    it('sets angularSensibilityX to slow down horizontal rotation', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.angularSensibilityX).toBe(CAMERA_ANGULAR_SENS_X);
        expect(camera.angularSensibilityX).toBeGreaterThan(1000); // slower than Babylon default
    });

    it('sets angularSensibilityY to slow down vertical rotation', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.angularSensibilityY).toBe(CAMERA_ANGULAR_SENS_Y);
        expect(camera.angularSensibilityY).toBeGreaterThan(1000);
    });

    it('sets wheelPrecision to slow down zoom', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.wheelPrecision).toBe(CAMERA_WHEEL_PRECISION);
        expect(camera.wheelPrecision).toBeGreaterThan(3); // slower than Babylon default
    });

    it('sets inertia higher than Babylon default for smoother glide', () => {
        const canvas = document.createElement('canvas');
        const camera = setupCamera(scene, canvas, new Vector3(0, 0, 0));
        expect(camera.inertia).toBe(CAMERA_INERTIA);
        expect(camera.inertia).toBeGreaterThan(0.9); // more glide than Babylon default
    });
});

describe('updateCameraTarget', () => {
    it('updates camera target when ship moves beyond threshold', () => {
        const shipTarget = new Vector3(0, 2, 0);
        const ship = { x: 5, y: 5 };
        const mapBegin = new Vector3(0, 0, 0);

        updateCameraTarget(shipTarget, ship, mapBegin, 3.5);

        expect(shipTarget.x).toBeCloseTo(1.5);
        expect(shipTarget.z).toBeCloseTo(1.5);
    });

    it('does not update camera target when ship is within threshold', () => {
        const shipTarget = new Vector3(0, 2, 0);
        const ship = { x: 2, y: 2 };
        const mapBegin = new Vector3(0, 0, 0);

        updateCameraTarget(shipTarget, ship, mapBegin, 3.5);

        expect(shipTarget.x).toBeCloseTo(0);
        expect(shipTarget.z).toBeCloseTo(0);
    });
});
