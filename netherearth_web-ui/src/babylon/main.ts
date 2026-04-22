import { ObjectType, createWarMap, Owner } from './game/core/warmap';

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './view/shared/models';
import { loadMap } from './data/map';
import { Renderer } from './view/map/renderer';
import { ProjectileRenderer } from './view/map/projectile-renderer';
import { GameHud } from './view/hud/hud';
import { calcRobotHeight } from './data/robot';
import { attachCameraControls } from './controls/camera';
import { attachGameControls } from './controls/game';
import { attachShipControls } from './controls/ship';
import { startClock } from './game/clock';
import { createOwnerResources } from './game/resources';
import { createShipInput, tickShip } from './game/ship/index';
import { ShipRenderer } from './view/map/ship-renderer';
import { buildOccupancy } from './game/core/occupancy';

import { ConstructionYardTrigger } from './view/construction-yard';
import { RobotControlTrigger } from './view/robot-control/trigger';
import { GameOverScreen } from './view/game-over';
import { StartupMenu } from './view/startup-menu';
import { bus } from './game/event-bus';
import { resetGame } from './game/reset';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<{ scene: BABYLON.Scene, dispose: () => void }> => {
  const scene = new BABYLON.Scene(engine);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  const models = loadModels(assetsManager);
  await assetsManager.loadAsync();

  let currentMapName = 'small1.map';
  let mapData = await loadMap(`/maps/${currentMapName}`);
  const mapBegin = new BABYLON.Vector3(0, 0, 0);

  // debugLoadMap(mapData, scene, mapBegin);

  const warMap = createWarMap(mapData);

  warMap.tiles.filter(o => o.type === ObjectType.FACTORY).forEach(o => { o.owner = Owner.NEUTRAL; });

  const renderer = new Renderer(models, scene, mapBegin);
  const projectileRenderer = new ProjectileRenderer(models, mapBegin);
  const hud = new GameHud(canvas);
  renderer.render(warMap);

  const redWarbase = warMap.tiles.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
  const rawX = redWarbase ? redWarbase.x + 1.5 : mapData.width / 2;
  const rawY = redWarbase ? redWarbase.y - 3   : mapData.height / 2;
  const shipStartX = Math.max(0, Math.min(mapData.width - 1, rawX));
  const shipStartY = Math.max(0, Math.min(mapData.height - 1, rawY));
  const ship = { x: shipStartX, y: shipStartY, height: 1.5 };
  const shipInput = createShipInput();
  const shipRenderer = new ShipRenderer(models, mapBegin);

  const shipTarget = new BABYLON.Vector3(mapBegin.x + ship.x, 2, mapBegin.z + ship.y);

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 4, 8, shipTarget, scene);
  camera.attachControl(canvas, true);
  // Remove default keyboard inputs (arrow keys, etc.) from the camera
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

  const removeCameraControls = attachCameraControls(scene, camera);
  const removeGameControls = attachGameControls(scene, warMap, () => renderer.render(warMap));
  const removeShipControls = attachShipControls(scene, shipInput);
  const ownerResources = createOwnerResources();

  // Give both teams a starter set of each resource for testing the construction yard
  const INITIAL_RESOURCES = 5;
  for (const owner of [Owner.RED, Owner.BLUE] as const) {
    const r = ownerResources[owner];
    r.common = r.chassis = r.cannons = r.missiles = r.phasers = r.electronics = r.nuclear = INITIAL_RESOURCES;
  }

  const constructionYardTrigger = new ConstructionYardTrigger(scene, models, ownerResources, () => {
    ship.height = 1.5;
  });

  const robotControlTrigger = new RobotControlTrigger(scene, () => mapData.width, () => {});

  const gameOverScreen = new GameOverScreen();

  const startupMenu = new StartupMenu(
      () => { /* TODO: save */ },
      () => { /* TODO: load */ },
  );
  startupMenu.show();

  bus.on('game:menu', () => {
      startupMenu.show();
  });

  bus.on('game:start', () => {
      resetGame(warMap, mapData, ownerResources, ship, clock, INITIAL_RESOURCES);

      // Render updated map
      renderer.render(warMap);
      hud.update(warMap);
  });

  bus.on('game:new-map', async ({ mapName }) => {
      if (currentMapName !== mapName) {
          mapData = await loadMap(`/maps/${mapName}`);
          currentMapName = mapName;
      }
      bus.emit({ type: 'game:start' });
  });

  bus.on('tick:sub', ({ warMap }) => {
      const robotsPositions = warMap.robots.map(r => ({ x: r.x, y: r.y, height: calcRobotHeight(r.robotConfig) }));
      const occ = buildOccupancy(warMap, ship);
      if (!robotControlTrigger.isOpen() && !startupMenu.isVisible()) {
          tickShip(ship, shipInput, mapData.width, mapData.height, occ.structures, robotsPositions);
      }

      constructionYardTrigger.check(warMap, ship);
      robotControlTrigger.check(warMap, ship, constructionYardTrigger.isOpen());

      renderer.render(warMap);
      projectileRenderer.render(warMap);
      shipRenderer.render(ship, warMap);
      hud.update(warMap);
  });

  bus.on('game:over', ({ winner }) => {
      clock.stop();
      gameOverScreen.show(winner);
  });

  const clock = startClock(
      warMap,
      ownerResources,
      ship,
      100,
      () => constructionYardTrigger.isOpen() || startupMenu.isVisible(),
      () => robotControlTrigger.getTriggeredRobotId(),
      () => robotControlTrigger.takePendingAction(),
  );

  return {
    scene,
    dispose: () => {
      clock.stop();
      startupMenu.dispose();
      gameOverScreen.dispose();
      hud.dispose();
      robotControlTrigger.dispose();
      constructionYardTrigger.dispose();
      removeCameraControls();
      removeGameControls();
      removeShipControls();
      camera.detachControl();
      bus.clear();
    }
  };
};
