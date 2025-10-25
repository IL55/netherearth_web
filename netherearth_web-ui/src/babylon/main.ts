import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './models';
import { loadMap, debugLoadMap } from './map';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> => {
  const scene = new BABYLON.Scene(engine);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  loadModels(assetsManager);
  await assetsManager.loadAsync();

  const mapData = await loadMap('/maps/small2.map');
  debugLoadMap(mapData, scene);

  const mapCenter = new BABYLON.Vector3(mapData.width / 2, 0, mapData.height / 2);

  // ArcRotateCamera, rotated and looking at map center
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI, Math.PI / 4, 40, mapCenter, scene);
  camera.attachControl(canvas, true);

  // Keyboard controls for camera movement
  scene.onKeyboardObservable.add((kbInfo) => {
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

  return scene;
};
