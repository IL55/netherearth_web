import { ObjectType } from './game/core/warmap';
import { Direction, RobotAI } from "./game/core/warmap";

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './view/shared/models';
import { loadMap } from './data/map';
import { debugLoadMap } from './view/map/map';
import { Renderer } from './view/map/renderer';
import { ProjectileRenderer } from './view/map/projectile-renderer';
import { GameHud } from './view/hud/hud';
import { createWarMap, Owner, RobotGoal } from './game/core/warmap';
import { robotConfigs, calcHealth } from './data/robot';
import { attachCameraControls } from './controls/camera';
import { attachGameControls } from './controls/game';
import { attachShipControls } from './controls/ship';
import { startClock } from './game/clock';
import { createOwnerResources } from './game/resources';
import { createShipInput, tickShip, WARBASE_BLOCK_OFFSETS } from './game/ship';
import type { ShipObstacle } from './game/ship';
import { ShipRenderer } from './view/map/ship-renderer';

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
      ai: RobotAI.DUMMY,
    });
  }

  const renderer = new Renderer(models, scene, mapBegin);
  const projectileRenderer = new ProjectileRenderer(models, mapBegin);
  const hud = new GameHud(canvas);
  renderer.render(warMap);

  // Build ship collision obstacles from all warbases (per-block, matching occupancy.ts).
  const shipObstacles: ShipObstacle[] = warMap.objects
    .filter(o => o.type === ObjectType.WARBASE)
    .flatMap(o => WARBASE_BLOCK_OFFSETS.map(b => ({
      x0: o.x + b.x0, y0: o.y + b.y0,
      x1: o.x + b.x1, y1: o.y + b.y1,
    })));

  // Place ship at the RED warbase capture-zone opening (gap on the right side, yo≈2).
  const redWarbase = warMap.objects.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
  const shipStartX = redWarbase ? redWarbase.x + 3.5 : mapData.width / 2;
  const shipStartY = redWarbase ? redWarbase.y + 2   : mapData.height / 2;
  const ship = { x: shipStartX, y: shipStartY, height: 3 };
  const shipInput = createShipInput();
  const shipRenderer = new ShipRenderer(models, mapBegin);

  const mapCenter = new BABYLON.Vector3(mapBegin.x + mapData.width / 4, 2, mapBegin.z + mapData.height / 4);

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 4, 8, mapCenter, scene);
  camera.attachControl(canvas, true);

  attachCameraControls(scene, camera);
  attachGameControls(scene, warMap, () => renderer.render(warMap));
  attachShipControls(scene, shipInput);
  const ownerResources = createOwnerResources();
  startClock(warMap, () => {
    tickShip(ship, shipInput, shipObstacles);
    renderer.render(warMap);
    projectileRenderer.render(warMap);
    shipRenderer.render(ship);
    hud.update(warMap);
  }, ownerResources);

  return scene;
};
