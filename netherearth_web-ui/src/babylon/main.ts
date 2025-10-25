import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './models';
import { loadMap, debugLoadMap } from './map';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> => {
  const scene = new BABYLON.Scene(engine);

  // ArcRotateCamera
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(4, 10, -10), scene);
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  loadModels(assetsManager);
  await assetsManager.loadAsync();

  const mapData = await loadMap('/maps/small1.map');
  debugLoadMap(mapData, scene);

  return scene;
};
