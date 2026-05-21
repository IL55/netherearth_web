import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bus } from '../../game/event-bus';

beforeEach(() => { bus.clear(); });

describe('EventBus.on / emit', () => {
    it('calls a registered handler when the matching event is emitted', () => {
        const handler = vi.fn();
        bus.on('game:menu', handler);
        bus.emit({ type: 'game:menu' });
        expect(handler).toHaveBeenCalledOnce();
    });

    it('does not call handler for a different event type', () => {
        const handler = vi.fn();
        bus.on('game:menu', handler);
        bus.emit({ type: 'game:start' });
        expect(handler).not.toHaveBeenCalled();
    });
});

describe('EventBus.off', () => {
    it('removes a handler so it is no longer called after off()', () => {
        const handler = vi.fn();
        bus.on('game:menu', handler);
        bus.emit({ type: 'game:menu' });
        expect(handler).toHaveBeenCalledTimes(1);

        bus.off('game:menu', handler);
        bus.emit({ type: 'game:menu' });
        expect(handler).toHaveBeenCalledTimes(1); // not called again
    });

    it('does not affect other handlers when one is removed', () => {
        const a = vi.fn();
        const b = vi.fn();
        bus.on('game:start', a);
        bus.on('game:start', b);

        bus.off('game:start', a);
        bus.emit({ type: 'game:start' });

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledOnce();
    });

    it('is a no-op when the handler was never registered', () => {
        const handler = vi.fn();
        expect(() => bus.off('game:menu', handler)).not.toThrow();
    });
});
