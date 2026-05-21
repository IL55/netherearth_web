import type { WarMap } from './core/warmap';
import type { Owner } from './types/owner';
import type { SoundName } from './types/sound';

export type GameEvent =
    | { type: 'tick:sub';  warMap: WarMap }
    | { type: 'tick:game'; warMap: WarMap }
    | { type: 'game:over'; winner: Owner }
    | { type: 'game:menu' } // Requested to show the startup menu
    | { type: 'game:start' } // Start a new game
    | { type: 'game:new-map'; mapName: string } // Start a new game with a different map
    | { type: 'sound:play'; name: SoundName };


type Handler<E> = (event: E) => void;

class EventBus {
    private handlers = new Map<string, Handler<GameEvent>[]>();

    on<T extends GameEvent['type']>(
        type: T,
        handler: Handler<Extract<GameEvent, { type: T }>>,
    ): void {
        const list = this.handlers.get(type) ?? [];
        this.handlers.set(type, [...list, handler as Handler<GameEvent>]);
    }

    off<T extends GameEvent['type']>(
        type: T,
        handler: Handler<Extract<GameEvent, { type: T }>>,
    ): void {
        const list = this.handlers.get(type) ?? [];
        this.handlers.set(type, list.filter(h => h !== (handler as Handler<GameEvent>)));
    }

    emit<T extends GameEvent>(event: T): void {
        for (const h of this.handlers.get(event.type) ?? []) h(event);
    }

    clear(): void { this.handlers.clear(); }
}

export const bus = new EventBus();
