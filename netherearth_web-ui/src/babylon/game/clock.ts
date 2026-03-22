import type { WarMap } from './warmap';
import { buildOccupancy } from './occupancy';
import { applyAction } from './actions';
import { dummyAI } from './ai/dummy';

export interface Clock {
    stop: () => void;
}

// Starts the game simulation loop.
// intervalMs: time between ticks (default 500ms)
export function startClock(
    warMap: WarMap,
    onTick: () => void,
    intervalMs = 500,
): Clock {
    const id = setInterval(() => {
        tick(warMap);
        onTick();
    }, intervalMs);
    return { stop: () => clearInterval(id) };
}

function tick(warMap: WarMap): void {
    warMap.tick = (warMap.tick ?? 0) + 1;

    const occupancy = buildOccupancy(warMap);

    for (const obj of warMap.objects) {
        if (obj.type !== 'robot') continue;

        const ai = obj.ai ?? 'dummy';
        const action = ai === 'dummy' ? dummyAI(obj, warMap, occupancy) : { type: 'idle' as const };
        applyAction(obj, action, warMap, occupancy);
    }
}
