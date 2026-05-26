import * as BABYLON from '@babylonjs/core';
import { ObjectType, createWarMap, Owner } from './game/core/warmap';
import type { WarMap } from './game/core/warmap';
import { loadMap } from './data/map';
import type { MapData } from './data/map';
import { Renderer } from './view/map/renderer';
import { ProjectileRenderer } from './view/map/projectile-renderer';
import { GameHud } from './view/hud/hud';
import { calcRobotHeight } from './data/robot';
import { setupCamera, updateCameraTarget } from './controls/camera';
import { attachGameControls } from './controls/game';
import { attachShipControls } from './controls/ship';
import { attachTouchZones } from './controls/touch-zones';
import { startClock } from './game/clock';
import type { Clock } from './game/clock';
import { createOwnerResources } from './game/resources';
import type { OwnerResources } from './game/resources';
import { createShipInput, tickShip } from './game/ship/index';
import type { ShipState, ShipInput } from './game/ship/types';
import { SHIP_RESTING_HEIGHT } from './game/ship/constants';
import { ShipRenderer } from './view/map/ship-renderer';
import { buildOccupancy } from './game/core/occupancy';
import { ConstructionYardTrigger } from './view/construction-yard';
import { RobotControlTrigger } from './view/robot-control/trigger';
import { GameOverScreen } from './view/game-over';
import { StartupMenu } from './view/startup-menu';
import { bus } from './game/event-bus';
import { resetGame } from './game/reset';
import { saveGame, parseGameSave, applySave } from './game/save';
import { spawnManualRobot, _resetManualBuildCount } from './view/construction-yard/construction-yard-logic';
import type { Sounds } from './view/shared/sounds';
import { SOUNDS } from './game/types/sound';
import { loadSelectedMap, saveSelectedMap, listSaves } from './data/storage';
import type { StartupMenuStorage } from './data/storage';

const BASE_URL = import.meta.env.BASE_URL;

import { INITIAL_RESOURCES } from './game/config';
const INITIAL_MAP = 'small1.map';

export class GameSession {
    private warMap!: WarMap;
    private mapData!: MapData;
    private currentMapName!: string;
    private ship!: ShipState;
    private shipInput!: ShipInput;
    private shipTarget!: BABYLON.Vector3;
    private mapBegin!: BABYLON.Vector3;
    private ownerResources!: OwnerResources;
    private clock!: Clock;

    private renderer!: Renderer;
    private projectileRenderer!: ProjectileRenderer;
    private shipRenderer!: ShipRenderer;
    private hud!: GameHud;

    private constructionYardTrigger!: ConstructionYardTrigger;
    private robotControlTrigger!: RobotControlTrigger;
    private startupMenu!: StartupMenu;
    private gameOverScreen!: GameOverScreen;
    private camera!: BABYLON.ArcRotateCamera;

    private removeGameControls!: () => void;
    private removeShipControls!: () => void;
    private removeTouchZones!: () => void;
    private sounds!: Sounds;

    private constructor() {}

    static async create(
        scene: BABYLON.Scene,
        canvas: HTMLCanvasElement,
        models: Map<string, BABYLON.AbstractMesh>,
        sounds: Sounds,
    ): Promise<GameSession> {
        const s = new GameSession();

        s.currentMapName = INITIAL_MAP;
        s.mapData = await loadMap(`${BASE_URL}maps/${INITIAL_MAP}`);
        s.mapBegin = new BABYLON.Vector3(0, 0, 0);

        s.warMap = createWarMap(s.mapData);
        s.warMap.tiles
            .filter(o => o.type === ObjectType.FACTORY)
            .forEach(o => { o.owner = Owner.NEUTRAL; });

        s.renderer = new Renderer(models, scene, s.mapBegin);
        s.projectileRenderer = new ProjectileRenderer(models, s.mapBegin);
        s.hud = new GameHud(canvas);
        s.renderer.render(s.warMap);

        const redWarbase = s.warMap.tiles.find(
            o => o.type === ObjectType.WARBASE && o.owner === Owner.RED,
        );
        const rawX = redWarbase ? redWarbase.x + SHIP_RESTING_HEIGHT : s.mapData.width / 2;
        const rawY = redWarbase ? redWarbase.y - 3   : s.mapData.height / 2;
        s.ship = {
            x: Math.max(0, Math.min(s.mapData.width  - 1, rawX)),
            y: Math.max(0, Math.min(s.mapData.height - 1, rawY)),
            height: SHIP_RESTING_HEIGHT,
            vx: 0, vy: 0,
        };

        s.shipInput    = createShipInput();
        s.shipRenderer = new ShipRenderer(models, s.mapBegin);
        s.shipTarget   = new BABYLON.Vector3(s.mapBegin.x + s.ship.x, 2, s.mapBegin.z + s.ship.y);
        s.camera       = setupCamera(scene, canvas, s.shipTarget);

        s.removeGameControls = attachGameControls(scene, s.warMap, () => s.renderer.render(s.warMap));
        s.removeShipControls = attachShipControls(scene, s.shipInput);
        s.removeTouchZones   = attachTouchZones(s.shipInput);

        s.ownerResources = createOwnerResources();
        for (const owner of [Owner.RED, Owner.BLUE] as const) {
            const r = s.ownerResources[owner];
            r.common = r.chassis = r.cannons = r.missiles = r.phasers = r.electronics = r.nuclear = INITIAL_RESOURCES;
        }

        s.constructionYardTrigger = new ConstructionYardTrigger(
            scene, models, s.ownerResources,
            (config) => spawnManualRobot(s.warMap, config, Owner.RED),
            () => { s.ship.height = SHIP_RESTING_HEIGHT; },
        );

        s.robotControlTrigger = new RobotControlTrigger(scene, () => s.mapData.width, () => {});
        s.gameOverScreen = new GameOverScreen();

        const storage: StartupMenuStorage = { loadSelectedMap, saveSelectedMap, listSaves };
        s.startupMenu = new StartupMenu(
            storage,
            () => saveGame(s.currentMapName, s.warMap, s.ownerResources, s.ship),
            async (timestamp: number, mapName: string) => {
                const save = parseGameSave(timestamp, mapName);
                if (!save) return;
                if (s.currentMapName !== mapName) {
                    s.mapData = await loadMap(`${BASE_URL}maps/${mapName}`);
                    s.currentMapName = mapName;
                    s.warMap.width = s.mapData.width;
                    s.warMap.height = s.mapData.height;
                }
                s.clock.stop();
                s.clock.reset();
                applySave(save, s.warMap, s.ownerResources, s.ship);
                s.clock.start();
                s.renderer.render(s.warMap);
                s.hud.update(s.warMap, s.ship);
            },
            undefined,
            () => sounds.playSequence([SOUNDS.INTRO]),
            () => sounds.stopSequence(),
        );

        s.clock = startClock(
            s.warMap, s.ownerResources, s.ship, 100,
            () => s.constructionYardTrigger.isOpen() || s.startupMenu.isVisible(),
            () => s.robotControlTrigger.getTriggeredRobotId(),
            () => s.robotControlTrigger.takePendingAction(),
        );

        s.sounds = sounds;
        s.registerBusHandlers();

        s.startupMenu.show();

        return s;
    }

    private registerBusHandlers(): void {
        bus.on('game:menu', () => {
            this.startupMenu.show();
        });

        bus.on('game:start', () => {
            this.sounds.stopSequence();
            resetGame(this.warMap, this.mapData, this.ownerResources, this.ship, this.clock, INITIAL_RESOURCES);
            _resetManualBuildCount();
            this.renderer.render(this.warMap);
            this.hud.update(this.warMap, this.ship);
        });

        bus.on('game:new-map', async ({ mapName }) => {
            if (this.currentMapName !== mapName) {
                this.mapData = await loadMap(`${BASE_URL}maps/${mapName}`);
                this.currentMapName = mapName;
            }
            bus.emit({ type: 'game:start' });
        });

        bus.on('tick:sub', ({ warMap }) => {
            const robotsPositions = warMap.robots.map(
                r => ({ x: r.x, y: r.y, height: calcRobotHeight(r.robotConfig) }),
            );
            const occ = buildOccupancy(warMap, this.ship);
            if (!this.robotControlTrigger.isOpen() && !this.startupMenu.isVisible()) {
                tickShip(this.ship, this.shipInput, this.mapData.width, this.mapData.height, occ.structures, robotsPositions);
            }

            this.constructionYardTrigger.check(warMap, this.ship);
            this.robotControlTrigger.check(warMap, this.ship, this.constructionYardTrigger.isOpen());

            this.renderer.render(warMap);
            this.projectileRenderer.render(warMap);
            this.shipRenderer.render(this.ship, warMap);
            this.hud.update(warMap, this.ship);

            updateCameraTarget(this.shipTarget, this.ship, this.mapBegin, 3.5);
        });

        bus.on('game:over', ({ winner }) => {
            this.clock.stop();
            this.gameOverScreen.show(winner);
        });
    }

    dispose(): void {
        this.clock.stop();
        this.startupMenu.dispose();
        this.gameOverScreen.dispose();
        this.hud.dispose();
        this.robotControlTrigger.dispose();
        this.constructionYardTrigger.dispose();
        this.removeGameControls();
        this.removeShipControls();
        this.removeTouchZones();
        this.camera.detachControl();
        bus.clear();
    }
}
