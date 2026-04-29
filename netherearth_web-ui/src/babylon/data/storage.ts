// ─── StartupMenu storage contract ─────────────────────────────────────────────

export interface StartupMenuStorage {
    loadSelectedMap(): string;
    saveSelectedMap(name: string): void;
    listSaves(): SaveSlot[];
}

// ─── Save slots ───────────────────────────────────────────────────────────────

const STORAGE_KEY_SAVE_PREFIX = 'netherearth_save_';

export interface SaveSlot {
    timestamp: number;
    mapName: string;
    label: string;
}

/** Builds the localStorage key for a save slot. */
export function saveKey(timestamp: number, mapName: string): string {
    return `${STORAGE_KEY_SAVE_PREFIX}${timestamp}:${mapName}`;
}

export function listSaves(): SaveSlot[] {
    const slots: SaveSlot[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(STORAGE_KEY_SAVE_PREFIX)) continue;
        const rest = key.slice(STORAGE_KEY_SAVE_PREFIX.length);
        const colon = rest.indexOf(':');
        if (colon === -1) continue;
        const ts = parseInt(rest.slice(0, colon), 10);
        const mapName = rest.slice(colon + 1);
        if (!isNaN(ts) && mapName)
            slots.push({ timestamp: ts, mapName, label: `${mapName} — ${new Date(ts).toLocaleString()}` });
    }
    return slots.sort((a, b) => b.timestamp - a.timestamp); // newest first
}

export function loadSave(timestamp: number, mapName: string): string | null {
    try {
        return localStorage.getItem(saveKey(timestamp, mapName));
    } catch (e) {
        console.error('Failed to load save', e);
        return null;
    }
}

// ─── Key bindings ──────────────────────────────────────────────────────────────

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
