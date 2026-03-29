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
import { createShipInput, tickShip } from './game/ship/index';
import { ShipRenderer } from './view/map/ship-renderer';
import { buildOccupancy } from './game/core/occupancy';

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

  // Place ship at the RED warbase capture-zone opening (gap on the right side, yo≈2).
  const redWarbase = warMap.objects.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
  const shipStartX = redWarbase ? redWarbase.x + 3.5 : mapData.width / 2;
  const shipStartY = redWarbase ? redWarbase.y + 2   : mapData.height / 2;
  const ship = { x: shipStartX, y: shipStartY, height: 1.0 };
  const shipInput = createShipInput();
  const shipRenderer = new ShipRenderer(models, mapBegin);

  const shipTarget = new BABYLON.Vector3(mapBegin.x + ship.x, 2, mapBegin.z + ship.y);

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 4, 8, shipTarget, scene);
  camera.attachControl(canvas, true);
  // Remove default keyboard inputs (arrow keys, etc.) from the camera
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

  attachCameraControls(scene, camera);
  attachGameControls(scene, warMap, () => renderer.render(warMap));
  attachShipControls(scene, shipInput);
  const ownerResources = createOwnerResources();
  startClock(warMap, () => {
    const robotsPositions = warMap.objects.filter(o => o.type === ObjectType.ROBOT).map(r => ({ x: r.x, y: r.y }));
    // We fetch the current complete structures from occupancy to be precise about collisions (walls, factories, warbases)
    const occ = buildOccupancy(warMap, ship);
    tickShip(ship, shipInput, mapData.width, mapData.height, occ.structures, robotsPositions);
    renderer.render(warMap);
    projectileRenderer.render(warMap);
    shipRenderer.render(ship);
    hud.update(warMap);
  }, ownerResources, ship);

  return scene;
};
