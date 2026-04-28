import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveKey, listSaves, loadSave } from '../../data/storage';

function makeLocalStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem:    (k: string) => store[k] ?? null,
        setItem:    (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear:      () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key:        (i: number) => Object.keys(store)[i] ?? null,
    };
}

beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
});

// ─── saveKey ──────────────────────────────────────────────────────────────────

describe('saveKey', () => {
    it('produces a key with the save prefix, timestamp, and map name', () => {
        expect(saveKey(1000, 'small1.map')).toBe('netherearth_save_1000:small1.map');
    });

    it('handles map names with dots and digits', () => {
        expect(saveKey(9999, 'bigcitylights.map')).toBe('netherearth_save_9999:bigcitylights.map');
    });
});

// ─── listSaves ────────────────────────────────────────────────────────────────

describe('listSaves', () => {
    it('returns empty array when no saves exist', () => {
        expect(listSaves()).toEqual([]);
    });

    it('returns one slot for a single save', () => {
        localStorage.setItem(saveKey(1000, 'small1.map'), '{}');
        const slots = listSaves();
        expect(slots).toHaveLength(1);
        expect(slots[0].timestamp).toBe(1000);
        expect(slots[0].mapName).toBe('small1.map');
    });

    it('label includes map name as prefix', () => {
        localStorage.setItem(saveKey(1000, 'small1.map'), '{}');
        const slots = listSaves();
        expect(slots[0].label).toMatch(/^small1\.map/);
    });

    it('sorts newest first', () => {
        localStorage.setItem(saveKey(1000, 'small1.map'), '{}');
        localStorage.setItem(saveKey(3000, 'small1.map'), '{}');
        localStorage.setItem(saveKey(2000, 'small1.map'), '{}');
        const slots = listSaves();
        expect(slots.map(s => s.timestamp)).toEqual([3000, 2000, 1000]);
    });

    it('lists saves from different maps', () => {
        localStorage.setItem(saveKey(1000, 'small1.map'), '{}');
        localStorage.setItem(saveKey(2000, 'bigcitylights.map'), '{}');
        const slots = listSaves();
        expect(slots).toHaveLength(2);
        expect(slots[0].mapName).toBe('bigcitylights.map');
        expect(slots[1].mapName).toBe('small1.map');
    });

    it('ignores unrelated localStorage keys', () => {
        localStorage.setItem('netherearth_keybindings', '{}');
        localStorage.setItem('netherearth_selected_map', 'small1.map');
        localStorage.setItem('some_other_key', 'data');
        expect(listSaves()).toEqual([]);
    });

    it('ignores save keys with missing colon separator', () => {
        localStorage.setItem('netherearth_save_1000', '{}'); // old format, no colon
        expect(listSaves()).toEqual([]);
    });

    it('ignores save keys with non-numeric timestamp', () => {
        localStorage.setItem('netherearth_save_abc:small1.map', '{}');
        expect(listSaves()).toEqual([]);
    });
});

// ─── loadSave ─────────────────────────────────────────────────────────────────

describe('loadSave', () => {
    it('returns null when no save exists for that timestamp and map', () => {
        expect(loadSave(1000, 'small1.map')).toBeNull();
    });

    it('returns the stored string for a matching save', () => {
        const data = JSON.stringify({ mapName: 'small1.map', tick: 42 });
        localStorage.setItem(saveKey(1000, 'small1.map'), data);
        expect(loadSave(1000, 'small1.map')).toBe(data);
    });

    it('returns null when timestamp matches but map name differs', () => {
        localStorage.setItem(saveKey(1000, 'small1.map'), '{}');
        expect(loadSave(1000, 'other.map')).toBeNull();
    });
});
