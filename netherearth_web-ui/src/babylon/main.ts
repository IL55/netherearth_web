import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './models';
import { loadMap, debugLoadMap, createMap, debugPlaceGrass } from './map';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> => {
  const scene = new BABYLON.Scene(engine);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  const models = loadModels(assetsManager);
  await assetsManager.loadAsync();

  const mapData = await loadMap('/maps/small1.map');
  const mapBegin = new BABYLON.Vector3(0, 0, 0);
  debugLoadMap(mapData, scene, mapBegin);
  createMap(mapData, models, scene, mapBegin);
  // debugPlaceGrass(models, scene, mapBegin);

  const mapCenter = new BABYLON.Vector3(mapBegin.x + mapData.width / 4, 2, mapBegin.z + mapData.height / 4);

  // ArcRotateCamera, rotated and looking at map center
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI /3, Math.PI / 4, 8, mapCenter, scene);
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
