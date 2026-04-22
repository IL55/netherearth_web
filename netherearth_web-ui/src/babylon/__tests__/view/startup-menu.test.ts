import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StartupMenu } from '../../view/startup-menu';
import { bus } from '../../game/event-bus';

describe('StartupMenu', () => {
    let onSave: ReturnType<typeof vi.fn>;
    let onLoad: ReturnType<typeof vi.fn>;
    let onNewGame: ReturnType<typeof vi.fn>;
    let menu: StartupMenu;

    beforeEach(() => {
        onSave = vi.fn();
        onLoad = vi.fn();
        onNewGame = vi.fn();
        
        // Ensure DOM is clean
        document.body.innerHTML = '';
        
        // Mock bus.emit to spy on it
        vi.spyOn(bus, 'emit');

        menu = new StartupMenu(onSave, onLoad, onNewGame);
    });

    afterEach(() => {
        menu.dispose();
        vi.restoreAllMocks();
    });

    it('initializes hidden', () => {
        expect(menu.isVisible()).toBe(false);
        const overlay = document.body.children[1] as HTMLElement;
        expect(overlay.style.display).toBe('none');
    });

    it('shows and hides properly', () => {
        menu.show();
        expect(menu.isVisible()).toBe(true);
        const overlay = document.body.children[1] as HTMLElement;
        expect(overlay.style.display).toBe('flex');

        menu.hide();
        expect(menu.isVisible()).toBe(false);
        expect(overlay.style.display).toBe('none');
    });

    it('emits game:new-map when NEW GAME is clicked', () => {
        menu.show();
        const overlay = document.body.children[1] as HTMLElement;
        
        // Find the NEW GAME button
        const buttons = Array.from(overlay.querySelectorAll('button'));
        const newGameBtn = buttons.find(b => b.textContent === 'NEW GAME');
        expect(newGameBtn).toBeDefined();

        newGameBtn!.click();

        expect(onNewGame).toHaveBeenCalled();
        expect(bus.emit).toHaveBeenCalledWith({ type: 'game:new-map', mapName: 'small1.map' });
        expect(menu.isVisible()).toBe(false); // hides after clicking new game
    });

    it('opens map selection dialog when SELECT MAP is clicked and allows choosing a map', () => {
        menu.show();
        const mapDialog = document.body.children[0] as HTMLElement;
        const overlay = document.body.children[1] as HTMLElement;
        
        expect(mapDialog.style.display).toBe('none');

        // Find the SELECT MAP button
        const buttons = Array.from(overlay.querySelectorAll('button'));
        const selectMapBtn = buttons.find(b => b.textContent === 'SELECT MAP');
        
        selectMapBtn!.click();

        // Main overlay is hidden, dialog is shown
        expect(overlay.style.display).toBe('none');
        expect(mapDialog.style.display).toBe('flex');

        // Find a specific map button (e.g. vulturia.map) inside mapDialog
        const mapButtons = Array.from(mapDialog.querySelectorAll('button'));
        const vulturiaBtn = mapButtons.find(b => b.textContent === 'vulturia.map');
        expect(vulturiaBtn).toBeDefined();

        vulturiaBtn!.click();

        // The dialog should close, main overlay shown
        expect(mapDialog.style.display).toBe('none');
        expect(overlay.style.display).toBe('flex');

        // The map label should update
        const label = Array.from(overlay.querySelectorAll('div')).find(div => div.textContent?.includes('CURRENT MAP'));
        expect(label?.textContent).toBe('CURRENT MAP: vulturia.map');

        // Now if we click NEW GAME, it should emit the new map
        const newGameBtn = buttons.find(b => b.textContent === 'NEW GAME');
        newGameBtn!.click();

        expect(bus.emit).toHaveBeenCalledWith({ type: 'game:new-map', mapName: 'vulturia.map' });
    });

    it('closes map dialog when BACK is clicked', () => {
        menu.show();
        const mapDialog = document.body.children[0] as HTMLElement;
        const overlay = document.body.children[1] as HTMLElement;
        
        const selectMapBtn = Array.from(overlay.querySelectorAll('button')).find(b => b.textContent === 'SELECT MAP');
        selectMapBtn!.click();

        const backBtn = Array.from(mapDialog.querySelectorAll('button')).find(b => b.textContent === 'BACK');
        backBtn!.click();

        expect(mapDialog.style.display).toBe('none');
        expect(overlay.style.display).toBe('flex');
    });

    it('cleans up DOM on dispose', () => {
        expect(document.body.children.length).toBe(2); // overlay and mapDialog
        menu.dispose();
        expect(document.body.children.length).toBe(0);
    });
});
