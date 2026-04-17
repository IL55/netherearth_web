import * as BABYLON from '@babylonjs/core';

export const attachCameraControls = (scene: BABYLON.Scene, camera: BABYLON.ArcRotateCamera) => {
    const observer = scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                switch (kbInfo.event.key) {
                    case "a":
                        camera.target.z -= 1;
                        break;
                    case "d":
                        camera.target.z += 1;
                        break;
                }
                break;
        }
    });
    return () => {
        if (observer) scene.onKeyboardObservable.remove(observer);
    };
};
