export interface KeyBindings {
    up: string;
    down: string;
    left: string;
    right: string;
    fire: string;
}

const DEFAULT_BINDINGS: KeyBindings = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    fire: 'Space'
};

const STORAGE_KEY = 'netherearth_keybindings';

export function loadKeyBindings(): KeyBindings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_BINDINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load keybindings', e);
    }
    return { ...DEFAULT_BINDINGS };
}

export function saveKeyBindings(bindings: KeyBindings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    } catch (e) {
        console.error('Failed to save keybindings', e);
    }
}

export function formatKey(code: string): string {
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Arrow')) return code.replace('Arrow', '').toUpperCase();
    if (code.startsWith('Key')) return code.replace('Key', '').toUpperCase();
    return code.toUpperCase();
}
