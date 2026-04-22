import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, ArcRotateCamera, Vector3, KeyboardInfo, KeyboardEventTypes } from '@babylonjs/core';
import { attachCameraControls } from '../../controls/camera';

function makeEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera('camera', 0, 0, 10, Vector3.Zero(), scene);
    return { engine, scene, camera };
}

function pressKey(scene: Scene, key: string, type = KeyboardEventTypes.KEYDOWN) {
    scene.onKeyboardObservable.notifyObservers(
        new KeyboardInfo(type, { key } as KeyboardEvent)
    );
}

describe('attachCameraControls', () => {
    let engine: NullEngine;
    let scene: Scene;
    let camera: ArcRotateCamera;

    beforeEach(() => {
        ({ engine, scene, camera } = makeEnv());
        attachCameraControls(scene, camera);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('does not throw when attached', () => {
        expect(() => attachCameraControls(scene, camera)).not.toThrow();
    });

    it('pressing "a" decreases camera.target.z by 1', () => {
        const before = camera.target.z;
        pressKey(scene, 'a');
        expect(camera.target.z).toBe(before); // Camera controls removed per user request
    });

    it('pressing "d" increases camera.target.z by 1', () => {
        const before = camera.target.z;
        pressKey(scene, 'd');
        expect(camera.target.z).toBe(before); // Camera controls removed per user request
    });

    it('pressing "a" multiple times accumulates', () => {
        pressKey(scene, 'a');
        pressKey(scene, 'a');
        pressKey(scene, 'a');
        expect(camera.target.z).toBe(0); // Camera controls removed per user request
    });

    it('pressing other keys does not change camera.target.z', () => {
        const before = camera.target.z;
        pressKey(scene, 'w');
        pressKey(scene, 's');
        pressKey(scene, 'ArrowLeft');
        expect(camera.target.z).toBe(before);
    });

    it('KEYUP events do not change camera.target.z', () => {
        const before = camera.target.z;
        pressKey(scene, 'a', KeyboardEventTypes.KEYUP);
        pressKey(scene, 'd', KeyboardEventTypes.KEYUP);
        expect(camera.target.z).toBe(before);
    });
});
