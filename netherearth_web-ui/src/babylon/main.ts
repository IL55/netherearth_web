import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './view/shared/models';
import { loadMap } from './data/map';
import { debugLoadMap } from './view/map/map';
import { Renderer } from './view/map/renderer';
import { createWarMap } from './game/warmap';
import type { RobotGoal } from './game/warmap';
import { robotConfigs } from './data/robot';
import { attachCameraControls } from './controls/camera';
import { attachGameControls } from './controls/game';
import { startClock } from './game/clock';

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

  const warMap = createWarMap(mapData);
  warMap.objects.filter(o => o.type === 'factory').forEach(o => { o.owner = 2; });

  const goals: RobotGoal[] = ['attack_robots', 'capture_factory', 'capture_warbase', 'defend'];
  const configValues = Object.values(robotConfigs);
  for (let x = 0; x < mapData.width; x++) {
    warMap.objects.push({
      id: `robot_${x}`,
      type: 'robot',
      x,
      y: 14,
      owner: x % 2 === 0 ? 1 : 2,
      robotConfig: configValues[x % configValues.length],
      rotation: -Math.PI / 2,
      goal: goals[x % goals.length],
      ai: 'dummy',
    });
  }

  const renderer = new Renderer(models, scene, mapBegin);
  renderer.render(warMap);

  const mapCenter = new BABYLON.Vector3(mapBegin.x + mapData.width / 4, 2, mapBegin.z + mapData.height / 4);

  // ArcRotateCamera, rotated and looking at map center
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI /3, Math.PI / 4, 8, mapCenter, scene);
  camera.attachControl(canvas, true);

  attachCameraControls(scene, camera);
  attachGameControls(scene, warMap, () => renderer.render(warMap));
  startClock(warMap, () => renderer.render(warMap));

  return scene;
};
