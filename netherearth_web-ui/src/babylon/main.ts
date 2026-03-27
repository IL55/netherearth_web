import { ObjectType } from './game/warmap';
import { Direction } from "./game/warmap";

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './view/shared/models';
import { loadMap } from './data/map';
import { debugLoadMap } from './view/map/map';
import { Renderer } from './view/map/renderer';
import { ProjectileRenderer } from './view/map/projectile-renderer';
import { createWarMap, Owner, RobotGoal } from './game/warmap';
import { robotConfigs, calcHealth } from './data/robot';
import { attachCameraControls } from './controls/camera';
import { attachGameControls } from './controls/game';
import { startClock } from './game/clock';
import { createOwnerResources } from './game/resources';

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
  warMap.objects.filter(o => o.type === ObjectType.FACTORY).forEach(o => { o.owner = Owner.BLUE; });

  const goals: RobotGoal[] = [RobotGoal.ATTACK_ROBOTS, RobotGoal.CAPTURE_FACTORY, RobotGoal.CAPTURE_WARBASE, RobotGoal.DEFEND];
  const configValues = Object.values(robotConfigs);
  for (let x = 0; x < mapData.width; x++) {
    warMap.objects.push({
      id: `robot_${x}`,
      type: ObjectType.ROBOT,
      x,
      y: 14,
      owner: x % 2 === 0 ? Owner.RED : Owner.BLUE,
      robotConfig: configValues[x % configValues.length],
      health: calcHealth(configValues[x % configValues.length]),
      facing: Direction.W,
      goal: goals[x % goals.length],
      ai: 'dummy',
    });
  }

  const renderer = new Renderer(models, scene, mapBegin);
  const projectileRenderer = new ProjectileRenderer(models, mapBegin);
  renderer.render(warMap);

  const mapCenter = new BABYLON.Vector3(mapBegin.x + mapData.width / 4, 2, mapBegin.z + mapData.height / 4);

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 4, 8, mapCenter, scene);
  camera.attachControl(canvas, true);

  attachCameraControls(scene, camera);
  attachGameControls(scene, warMap, () => renderer.render(warMap));
  const ownerResources = createOwnerResources();
  startClock(warMap, () => {
    renderer.render(warMap);
    projectileRenderer.render(warMap);
  }, ownerResources);

  return scene;
};
