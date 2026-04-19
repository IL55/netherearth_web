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
import { robotConfigs, calcHealth, calcRobotHeight, Chassis, Weapon, Electronics } from './data/robot';
import { spawnRobot } from './game/core/utils';
import { attachCameraControls } from './controls/camera';
import { attachGameControls } from './controls/game';
import { attachShipControls } from './controls/ship';
import { startClock } from './game/clock';
import { ActionType } from './game/actions';
import { createOwnerResources } from './game/resources';
import { createShipInput, tickShip } from './game/ship/index';
import { ShipRenderer } from './view/map/ship-renderer';
import { buildOccupancy } from './game/core/occupancy';

import { ConstructionYardTrigger } from './view/construction-yard';
import { RobotControlTrigger } from './view/robot-control';
import { GameOverScreen } from './view/game-over';
import { bus } from './game/event-bus';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<{ scene: BABYLON.Scene, dispose: () => void }> => {
  const scene = new BABYLON.Scene(engine);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  const models = loadModels(assetsManager);
  await assetsManager.loadAsync();

  const mapData = await loadMap('/maps/small1.map');
  const mapBegin = new BABYLON.Vector3(0, 0, 0);

  // debugLoadMap(mapData, scene, mapBegin);

  const warMap = createWarMap(mapData);

  // ─── Compass text tiles ────────────────────────────────────────────────────
  const createCompassText = (text: string, tx: number, ty: number) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(`compass_${text}`, { width: 3, height: 1 }, scene);
    plane.position = new BABYLON.Vector3(mapBegin.x + tx, 1.5, mapBegin.z + ty);
    plane.rotation.x = Math.PI / 2; // Flat on the ground
    // No Y rotation so text is readable from the default camera angle
    
    const texture = new BABYLON.DynamicTexture(`dt_${text}`, { width: 300, height: 100 }, scene, true);
    texture.hasAlpha = true;
    texture.drawText(text, null, null, 'bold 48px monospace', 'white', 'rgba(0, 0, 0, 0.5)', true);
    
    const material = new BABYLON.StandardMaterial(`mat_${text}`, scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0, 0, 0); // avoid glare
    material.emissiveColor = new BABYLON.Color3(1, 1, 1); // glow slightly so it's always readable
    plane.material = material;
  };

  // North/South near fences (y=0 and y=63)
  createCompassText("NORTH", mapData.width / 2, 1.5);
  createCompassText("SOUTH", mapData.width / 2, mapData.height - 2.5);
  // East/West in the middle vertically
  createCompassText("WEST", 1.5, mapData.height / 2);
  createCompassText("EAST", mapData.width - 2.5, mapData.height / 2);

  warMap.tiles.filter(o => o.type === ObjectType.FACTORY).forEach(o => { o.owner = Owner.BLUE; });

  const goals: RobotGoal[] = [RobotGoal.ATTACK_ROBOTS, RobotGoal.CAPTURE_FACTORY, RobotGoal.CAPTURE_WARBASE, RobotGoal.DEFEND];
  const configValues = Object.values(robotConfigs);
  const fullEquipConfig = {
    chassis: Chassis.TRACKS,
    weapons: [Weapon.CANNON, Weapon.MISSILES, Weapon.PHASERS],
    nuclear: true,
    electronics: Electronics.STANDARD,
  };
    for (let x = 0; x < mapData.width; x++) {
        const isShipRobot = x === 0;
        const robotConfig = isShipRobot ? fullEquipConfig : configValues[x % configValues.length];
        warMap.robots.push(spawnRobot({
            id: `init_robot_${x}`,
            x,
            y: 14,
            owner: Owner.RED,
            robotConfig,
            facing: Direction.E,
            goal: RobotGoal.DEFEND,
        }));
    }

  const renderer = new Renderer(models, scene, mapBegin);
  const projectileRenderer = new ProjectileRenderer(models, mapBegin);
  const hud = new GameHud(canvas);
  renderer.render(warMap);

  // Place ship directly on the first RED robot so the control panel opens immediately.
  const firstRedRobot = warMap.robots.find(o => o.owner === Owner.RED);
  const redWarbase = warMap.tiles.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
  const shipStartX = firstRedRobot ? firstRedRobot.x : (redWarbase ? redWarbase.x + 1.5 : mapData.width / 2);
  const shipStartY = firstRedRobot ? firstRedRobot.y : (redWarbase ? redWarbase.y + 2   : mapData.height / 2);
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

  const robotControlTrigger = new RobotControlTrigger(scene, mapData.width, () => {});

  const gameOverScreen = new GameOverScreen(() => {});

  bus.on('tick:sub', ({ warMap }) => {
      const robotsPositions = warMap.robots.map(r => ({ x: r.x, y: r.y, height: calcRobotHeight(r.robotConfig) }));
      const occ = buildOccupancy(warMap, ship);
      if (!robotControlTrigger.isOpen()) {
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
      () => constructionYardTrigger.isOpen(),
      () => robotControlTrigger.getTriggeredRobotId(),
      () => robotControlTrigger.takePendingAction(),
  );

  return {
    scene,
    dispose: () => {
      clock.stop();
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
