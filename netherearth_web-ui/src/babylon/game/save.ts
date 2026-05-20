import type { WarMap, RobotObject, MapObject } from './core/warmap';
import type { OwnerResources } from './resources';
import type { ShipState } from './ship/types';
import { Owner } from './types/owner';
import { saveKey, loadSave } from '../data/storage';

type RobotSave = Omit<RobotObject, 'nav' | 'dyingTicks'>;

export interface GameSave {
    mapName: string;
    tick: number;
    ship: { x: number; y: number; height: number };
    tiles: MapObject[];
    robots: RobotSave[];
    resources: OwnerResources;
    killCounts: Record<string, number>;
}

export function saveGame(
    mapName: string,
    warMap: WarMap,
    ownerResources: OwnerResources,
    ship: ShipState,
): void {
    const timestamp = Date.now();
    const save: GameSave = {
        mapName,
        tick: warMap.tick,
        ship: { x: ship.x, y: ship.y, height: ship.height },
        tiles: warMap.tiles.map(t => ({ ...t })),
        robots: warMap.robots
            .filter(r => r.dyingTicks === undefined)
            .map(({ nav: _nav, dyingTicks: _dt, ...rest }) => rest),
        resources: JSON.parse(JSON.stringify(ownerResources)),
        killCounts: { ...warMap.killCounts },
    };
    try {
        localStorage.setItem(saveKey(timestamp, mapName), JSON.stringify(save));
    } catch (e) {
        console.error('Failed to save game', e);
    }
}

export function parseGameSave(timestamp: number, mapName: string): GameSave | null {
    const raw = loadSave(timestamp, mapName);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as GameSave;
    } catch (e) {
        console.error('Failed to parse save', e);
        return null;
    }
}

export function applySave(
    save: GameSave,
    warMap: WarMap,
    ownerResources: OwnerResources,
    ship: ShipState,
): void {
    warMap.tick = save.tick;

    warMap.tiles = save.tiles.map(t => ({ ...t }));

    warMap.robots = save.robots.map(r => ({ ...r, id: `loaded_${r.id.replace(/^(loaded_)+/, '')}` } as RobotObject));
    warMap.projectiles = [];
    warMap.killCounts = { ...save.killCounts };

    for (const owner of [Owner.RED, Owner.BLUE] as const) {
        Object.assign(ownerResources[owner], save.resources[owner]);
    }

    ship.x = save.ship.x;
    ship.y = save.ship.y;
    ship.height = save.ship.height;
    ship.vx = 0;
    ship.vy = 0;
}
