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

const STORAGE_KEY_BINDINGS = 'netherearth_keybindings';
const STORAGE_KEY_MAP = 'netherearth_selected_map';

export function loadKeyBindings(): KeyBindings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_BINDINGS);
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
        localStorage.setItem(STORAGE_KEY_BINDINGS, JSON.stringify(bindings));
    } catch (e) {
        console.error('Failed to save keybindings', e);
    }
}

export function loadSelectedMap(defaultMap: string = 'small1.map'): string {
    try {
        const storedMap = localStorage.getItem(STORAGE_KEY_MAP);
        if (storedMap) {
            return storedMap;
        }
    } catch (e) {
        console.error('Failed to load selected map', e);
    }
    return defaultMap;
}

export function saveSelectedMap(mapName: string): void {
    try {
        localStorage.setItem(STORAGE_KEY_MAP, mapName);
    } catch (e) {
        console.error('Failed to save selected map', e);
    }
}
