import { createWarMap, Owner, ObjectType } from './core/warmap';
import type { WarMap } from './core/warmap';
import type { MapData } from '../data/map';
import type { OwnerResources } from './resources';
import type { ShipState } from './ship/index';
import type { Clock } from './clock';
import { _resetBuildState } from './mechanics/build';

export function resetGame(
    warMap: WarMap,
    mapData: MapData,
    ownerResources: OwnerResources,
    ship: ShipState,
    clock: Clock,
    initialResources: number,
    initialResourcesRed: number = initialResources,
): void {
    // Regenerate the base map structure to get original tiles and ownerships
    const freshMap = createWarMap(mapData);
    
    // Ensure all factories are neutral
    freshMap.tiles
        .filter(o => o.type === ObjectType.FACTORY)
        .forEach(o => { o.owner = Owner.NEUTRAL; });

    // Apply the fresh map state to the existing warMap object to preserve the reference
    warMap.width = freshMap.width;
    warMap.height = freshMap.height;
    warMap.tiles = freshMap.tiles;
    warMap.robots = freshMap.robots;
    warMap.projectiles = freshMap.projectiles;
    warMap.tick = freshMap.tick;
    warMap.killCounts = freshMap.killCounts;

    // Reset resources
    const startValues: Record<Owner.RED | Owner.BLUE, number> = {
        [Owner.RED]:  initialResourcesRed,
        [Owner.BLUE]: initialResources,
    };
    for (const owner of [Owner.RED, Owner.BLUE] as const) {
        const r = ownerResources[owner];
        const v = startValues[owner];
        r.common = r.chassis = r.cannons = r.missiles = r.phasers = r.electronics = r.nuclear = v;
    }

    // Reset ship position
    const redWarbase = warMap.tiles.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
    if (redWarbase) {
        // Place ship on the north of the warbase
        ship.x = Math.max(0, Math.min(mapData.width - 1, redWarbase.x + 1.5));
        ship.y = Math.max(0, Math.min(mapData.height - 1, redWarbase.y - 3));
    } else {
        ship.x = mapData.width / 2;
        ship.y = mapData.height / 2;
    }
    ship.height = 1.5;

    // Reset build counters so robot IDs restart from 0 on a new game
    _resetBuildState();

    // Reset clock
    clock.reset();
    clock.start();
}
