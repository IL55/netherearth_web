import { RobotAI } from "./core/warmap";
import type { WarMap } from './core/warmap';
import { buildOccupancy } from './core/occupancy';
import { applyAction, ActionType, type RobotAction } from './actions';
import { Weapon } from '../data/robot';
import { SOUNDS, type SoundName } from './types/sound';
import { simpleAI, applyAIStateUpdate } from './ai/simple';
import { tickCapture } from './mechanics/capture';
import { advanceProjectiles, SUB_TICKS } from './mechanics/projectile';
import { DEATH_BLINK_TICKS, SUB_TICK_MS } from './config';
import { tickResources, createOwnerResources, type OwnerResources } from './resources';
import { tickBuild } from './mechanics/build';
import { recordKill } from './mechanics/kill-terrain';
import { type ShipState } from './ship/index';
import { bus } from './event-bus';
import { checkVictory } from './mechanics/victory';

export interface Clock {
    stop: () => void;
    reset: () => void;
    start: () => void;
}

// One game tick = SUB_TICKS sub-ticks.
// Sub-ticks advance projectiles and call onTick (renderer).
// Every SUB_TICKS sub-ticks the full game logic (AI, movement, capture) also runs.
// Default sub-tick interval is 100ms → game tick every 500ms.
export function startClock(
    warMap: WarMap,
    ownerResources: OwnerResources = createOwnerResources(),
    ship?: ShipState,
    subTickMs = SUB_TICK_MS,
    isPaused: () => boolean = () => false,
    getControlledRobotId: () => string | null = () => null,
    getManualAction: () => RobotAction | null = () => null,
): Clock {
    let subTick = 0;
    let id: ReturnType<typeof setInterval> | null = null;
    
    const start = () => {
        if (id) return;
        id = setInterval(() => {
            if (isPaused()) return;
            if (subTick === 0) {
                gameTick(warMap, ownerResources, ship, getControlledRobotId(), getManualAction);
                bus.emit({ type: 'tick:game', warMap });
            }
            advanceProjectiles(warMap);
            bus.emit({ type: 'tick:sub', warMap });
            subTick = (subTick + 1) % SUB_TICKS;
        }, subTickMs);
    };
    
    const stop = () => {
        if (id) {
            clearInterval(id);
            id = null;
        }
    };
    
    const reset = () => {
        subTick = 0;
        warMap.tick = 0;
    };
    
    start();
    
    return { stop, reset, start };
}


function gameTick(
    warMap: WarMap,
    ownerResources: OwnerResources,
    ship?: ShipState,
    controlledRobotId: string | null = null,
    getManualAction: () => RobotAction | null = () => null,
): void {
    warMap.tick = (warMap.tick ?? 0) + 1;

    // Step dying-robot countdown; remove those that have finished
    for (const obj of warMap.robots) {
        if (obj.dyingTicks !== undefined) {
            obj.dyingTicks--;
        }
    }
    warMap.robots = warMap.robots.filter(
        o => o.dyingTicks === undefined || o.dyingTicks > 0,
    );

    const occupancy = buildOccupancy(warMap, ship);

    const WEAPON_SOUND: Record<Weapon, SoundName> = {
        [Weapon.CANNON]:   SOUNDS.CANNON,
        [Weapon.MISSILES]: SOUNDS.MISSILES,
        [Weapon.PHASERS]:  SOUNDS.PHASERS,
    };

    // Run AI only for live (non-dying) robots
    for (const obj of [...warMap.robots]) {
        if (obj.dyingTicks !== undefined) continue;
        if (obj.id === controlledRobotId) {
            const action = getManualAction();
            if (action) {
                if (action.type === ActionType.FIRE && applyAction(obj, action, warMap, occupancy))
                    bus.emit({ type: 'sound:play', name: WEAPON_SOUND[action.weapon] });
                else if (action.type === ActionType.DETONATE && applyAction(obj, action, warMap, occupancy))
                    bus.emit({ type: 'sound:play', name: SOUNDS.NUCLEAR });
                else
                    applyAction(obj, action, warMap, occupancy);
            }
            continue;
        }

        const { action, stateUpdate } = obj.ai === RobotAI.SIMPLE
            ? simpleAI(obj, warMap, occupancy)
            : { action: { type: ActionType.IDLE } as const, stateUpdate: undefined };
        applyAIStateUpdate(obj, stateUpdate);
        if (action.type === ActionType.FIRE && applyAction(obj, action, warMap, occupancy))
            bus.emit({ type: 'sound:play', name: WEAPON_SOUND[action.weapon] });
        else if (action.type === ActionType.DETONATE && applyAction(obj, action, warMap, occupancy))
            bus.emit({ type: 'sound:play', name: SOUNDS.NUCLEAR });
        else
            applyAction(obj, action, warMap, occupancy);
    }

    // Start death animation for robots that just reached 0 health; record kill for terrain upgrade
    for (const obj of warMap.robots) {
        if (obj.health <= 0 && obj.dyingTicks === undefined) {
            obj.dyingTicks = DEATH_BLINK_TICKS;
            recordKill(warMap, obj);
            bus.emit({ type: 'sound:play', name: SOUNDS.EXPLOSION });
        }
    }

    tickCapture(warMap);
    tickResources(warMap, ownerResources, warMap.tick ?? 0);
    tickBuild(warMap, ownerResources);

    const winner = checkVictory(warMap);
    if (winner !== null) {
        bus.emit({ type: 'game:over', winner });
    }
}
