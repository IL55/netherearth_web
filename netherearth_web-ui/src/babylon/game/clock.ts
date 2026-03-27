import { RobotAI } from "./warmap";

import { ObjectType } from '../game/warmap';
import type { WarMap } from './warmap';
import { buildOccupancy } from './occupancy';
import { applyAction, ActionType, type RobotAction } from './actions';
import { dummyAI } from './ai/dummy';
import { tickCapture } from './capture';
import { advanceProjectiles, SUB_TICKS } from './projectile';
import { tickResources, createOwnerResources, type OwnerResources } from './resources';
import { tickBuild } from './build';

export interface Clock {
    stop: () => void;
}

// One game tick = SUB_TICKS sub-ticks.
// Sub-ticks advance projectiles and call onTick (renderer).
// Every SUB_TICKS sub-ticks the full game logic (AI, movement, capture) also runs.
// Default sub-tick interval is 100ms → game tick every 500ms.
export function startClock(
    warMap: WarMap,
    onTick: () => void,
    ownerResources: OwnerResources = createOwnerResources(),
    subTickMs = 100,
): Clock {
    let subTick = 0;
    const id = setInterval(() => {
        if (subTick === 0) {
            gameTick(warMap, ownerResources);
        }
        advanceProjectiles(warMap);
        onTick();
        subTick = (subTick + 1) % SUB_TICKS;
    }, subTickMs);
    return { stop: () => clearInterval(id) };
}

// Number of ticks for the death-blink animation (show/hide alternates each tick).
const DEATH_BLINK_TICKS = 6; // 3 blinks: show@6, hide@5, show@4, hide@3, show@2, hide@1 → removed

function gameTick(warMap: WarMap, ownerResources: OwnerResources): void {
    warMap.tick = (warMap.tick ?? 0) + 1;

    // Step dying-robot countdown; remove those that have finished
    for (const obj of warMap.objects) {
        if (obj.type === ObjectType.ROBOT && obj.dyingTicks !== undefined) {
            obj.dyingTicks--;
        }
    }
    warMap.objects = warMap.objects.filter(
        o => o.type !== ObjectType.ROBOT || o.dyingTicks === undefined || o.dyingTicks > 0,
    );

    const occupancy = buildOccupancy(warMap);

    // Run AI only for live (non-dying) robots
    for (const obj of [...warMap.objects]) {
        if (obj.type !== ObjectType.ROBOT || obj.dyingTicks !== undefined) continue;

        const ai = obj.ai ?? 'dummy';
        const action: RobotAction = ai === RobotAI.DUMMY ? dummyAI(obj, warMap, occupancy) : { type: ActionType.IDLE };
        applyAction(obj, action, warMap, occupancy);
    }

    // Start death animation for robots that just reached 0 health
    for (const obj of warMap.objects) {
        if (obj.type === ObjectType.ROBOT && (obj.health ?? 1) <= 0 && obj.dyingTicks === undefined) {
            obj.dyingTicks = DEATH_BLINK_TICKS;
        }
    }

    tickCapture(warMap);
    tickResources(warMap, ownerResources, warMap.tick ?? 0);
    tickBuild(warMap, ownerResources);
}
