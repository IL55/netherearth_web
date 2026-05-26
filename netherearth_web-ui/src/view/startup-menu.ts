import { bus } from '../game/event-bus';
import { formatKey } from '../controls/keybindings';
import { loadKeyBindings, saveKeyBindings, type KeyBindings, type StartupMenuStorage } from '../data/storage';

const OVERLAY_STYLE: Partial<CSSStyleDeclaration> = {
    position:       'fixed',
    inset:          '0',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'rgba(0, 0, 0, 0.82)',
    color:          'white',
    fontFamily:     'monospace',
    zIndex:         '9998',
};

const TITLE_STYLE: Partial<CSSStyleDeclaration> = {
    fontSize:      'min(52px, 8vw)',
    fontWeight:    'bold',
    letterSpacing: 'clamp(2px, 1vw, 6px)',
    marginBottom:  '8px',
};

const SUBTITLE_STYLE: Partial<CSSStyleDeclaration> = {
    fontSize:      '13px',
    letterSpacing: '4px',
    opacity:       '0.5',
    marginBottom:  '48px',
};

const BTN_STYLE: Partial<CSSStyleDeclaration> = {
    display:       'block',
    width:         'min(220px, 80vw)',
    minHeight:     '44px',
    padding:       '10px 0',
    marginBottom:  '10px',
    fontSize:      '14px',
    fontFamily:    'monospace',
    letterSpacing: '2px',
    cursor:        'pointer',
    background:    'none',
    border:        '1px solid rgba(255,255,255,0.4)',
    color:         'white',
    textAlign:     'center',
};

const BTN_HOVER_BORDER = '1px solid white';
const BTN_NORMAL_BORDER = '1px solid rgba(255,255,255,0.4)';

const HINT_STYLE: Partial<CSSStyleDeclaration> = {
    marginTop:  '32px',
    fontSize:   '11px',
    opacity:    '0.35',
    letterSpacing: '1px',
};

/**
 * Full-screen pause / startup menu.
 * Shown on game start; toggled with Escape during play.
 * All action callbacks (new game, save, load) are stubs — wire them up later.
 */

const AVAILABLE_MAPS = [
    'bigcitylights.map',
    'castle.map',
    'city.map',
    'crossroads.map',
    'ecuador.map',
    'factory_test.map',
    'la.map',
    'labirynth.map',
    'map1.map',
    'nucl_war2.map',
    'nuclear.map',
    'original.map',
    'rectangle.map',
    'rectangle2.map',
    'small1.map',
    'small2.map',
    'small3.map',
    'vulturia.map'
];

const isTouchDevice = () => navigator.maxTouchPoints > 0;

export class StartupMenu {
    private overlay:    HTMLDivElement;
    private mapDialog:  HTMLDivElement;
    private keysDialog: HTMLDivElement;
    private loadDialog: HTMLDivElement;
    private pauseBtn:   HTMLButtonElement;
    private visible = false;
    private onKeyDown: (e: KeyboardEvent) => void;
    private selectedMap: string;
    private storage: StartupMenuStorage;

    constructor(
        storage: StartupMenuStorage,
        private onSave:    () => boolean,
        private onLoad:    (timestamp: number, mapName: string) => void,
        private onNewGame?: () => void,
        private onShow?: () => void,
        private onHide?: () => void,
    ) {
        this.storage = storage;
        this.selectedMap = storage.loadSelectedMap();
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, OVERLAY_STYLE);
        this.overlay.style.display = 'none';

        const title = document.createElement('div');
        Object.assign(title.style, TITLE_STYLE);
        title.textContent = 'NETHER EARTH WEB';
        this.overlay.appendChild(title);

        const subtitle = document.createElement('div');
        Object.assign(subtitle.style, SUBTITLE_STYLE);
        subtitle.textContent = 'PAUSE MENU';
        this.overlay.appendChild(subtitle);

        const makeBtn = (label: string, onClick: () => void): HTMLButtonElement => {
            const btn = document.createElement('button');
            Object.assign(btn.style, BTN_STYLE);
            btn.textContent = label;
            btn.addEventListener('pointerenter', () => { btn.style.border = BTN_HOVER_BORDER; });
            btn.addEventListener('pointerleave', () => { btn.style.border = BTN_NORMAL_BORDER; });
            btn.addEventListener('click', onClick);
            return btn;
        };

        const selectedMapLabel = document.createElement('div');
        Object.assign(selectedMapLabel.style, SUBTITLE_STYLE, { marginBottom: '10px', marginTop: '-30px', color: 'yellow' });
        selectedMapLabel.textContent = `CURRENT MAP: ${this.selectedMap}`;
        this.overlay.appendChild(selectedMapLabel);

        this.overlay.appendChild(makeBtn('NEW GAME',  () => {
            this.hide();
            if (this.onNewGame) this.onNewGame();
            bus.emit({ type: 'game:new-map', mapName: this.selectedMap });
        }));
        this.overlay.appendChild(makeBtn('SELECT MAP', () => {
            this.overlay.style.display = 'none';
            this.mapDialog.style.display = 'flex';
        }));
        if (!isTouchDevice()) this.overlay.appendChild(makeBtn('BIND KEYS', () => {
            this.overlay.style.display = 'none';
            this.keysDialog.style.display = 'flex';
            this.updateKeysUI();
        }));
        this.overlay.appendChild(makeBtn('RESUME',    () => this.hide()));
        this.overlay.appendChild(makeBtn('SAVE GAME', () => {
            if (this.onSave()) { this.showSaveConfirmation(); } else { this.showSaveError(); }
        }));
        this.overlay.appendChild(makeBtn('LOAD GAME', () => this.showLoadDialog()));

        // --- MAP DIALOG ---
        this.mapDialog = document.createElement('div');
        Object.assign(this.mapDialog.style, OVERLAY_STYLE, { background: 'rgba(0, 0, 0, 0.95)', display: 'none' });

        const mapDialogTitle = document.createElement('div');
        Object.assign(mapDialogTitle.style, TITLE_STYLE, { fontSize: '32px' });
        mapDialogTitle.textContent = 'SELECT MAP';
        this.mapDialog.appendChild(mapDialogTitle);

        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(50vh, 40dvh)',
            overflowY: 'auto',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px',
            width: 'min(300px, 90vw)',
        });

        AVAILABLE_MAPS.forEach(mapName => {
            const btn = makeBtn(mapName, () => {
                this.selectedMap = mapName;
                this.storage.saveSelectedMap(mapName);
                selectedMapLabel.textContent = `CURRENT MAP: ${this.selectedMap}`;
                this.mapDialog.style.display = 'none';
                this.overlay.style.display = 'flex';
            });
            btn.style.width = '100%';
            listContainer.appendChild(btn);
        });
        this.mapDialog.appendChild(listContainer);

        this.mapDialog.appendChild(makeBtn('BACK', () => {
            this.mapDialog.style.display = 'none';
            this.overlay.style.display = 'flex';
        }));

        document.body.appendChild(this.mapDialog);

        // --- KEYS DIALOG ---
        this.keysDialog = document.createElement('div');
        Object.assign(this.keysDialog.style, OVERLAY_STYLE, { background: 'rgba(0, 0, 0, 0.95)', display: 'none' });
        
        const keysDialogTitle = document.createElement('div');
        Object.assign(keysDialogTitle.style, TITLE_STYLE, { fontSize: '32px' });
        keysDialogTitle.textContent = 'BIND KEYS';
        this.keysDialog.appendChild(keysDialogTitle);

        this.keysContainer = document.createElement('div');
        Object.assign(this.keysContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px',
            width: 'min(300px, 90vw)',
        });
        this.keysDialog.appendChild(this.keysContainer);

        this.keysDialog.appendChild(makeBtn('BACK', () => {
            this.keysDialog.style.display = 'none';
            this.overlay.style.display = 'flex';
        }));
        document.body.appendChild(this.keysDialog);

        // --- LOAD DIALOG ---
        this.loadDialog = document.createElement('div');
        Object.assign(this.loadDialog.style, OVERLAY_STYLE, { background: 'rgba(0, 0, 0, 0.95)', display: 'none' });

        const loadDialogTitle = document.createElement('div');
        Object.assign(loadDialogTitle.style, TITLE_STYLE, { fontSize: '32px' });
        loadDialogTitle.textContent = 'LOAD GAME';
        this.loadDialog.appendChild(loadDialogTitle);

        this.loadListContainer = document.createElement('div');
        Object.assign(this.loadListContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(50vh, 40dvh)',
            overflowY: 'auto',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px',
            width: 'min(340px, 90vw)',
        });
        this.loadDialog.appendChild(this.loadListContainer);

        this.loadDialog.appendChild(makeBtn('BACK', () => {
            this.loadDialog.style.display = 'none';
            this.overlay.style.display = 'flex';
        }));
        document.body.appendChild(this.loadDialog);

        const hint = document.createElement('div');
        Object.assign(hint.style, HINT_STYLE);
        hint.textContent = isTouchDevice() ? 'TAP ≡ TO RESUME' : 'ESC — resume';
        this.overlay.appendChild(hint);

        document.body.appendChild(this.overlay);

        this.pauseBtn = document.createElement('button');
        Object.assign(this.pauseBtn.style, {
            position:   'fixed',
            top:        'max(12px, env(safe-area-inset-top))',
            right:      'max(12px, env(safe-area-inset-right))',
            width:      '44px',
            height:     '44px',
            fontSize:   '22px',
            lineHeight: '44px',
            textAlign:  'center',
            padding:    '0',
            background: 'rgba(0,0,0,0.55)',
            border:     '1px solid rgba(255,255,255,0.35)',
            color:      'white',
            fontFamily: 'monospace',
            cursor:     'pointer',
            zIndex:     '9997',
            display:    'none',
        } satisfies Partial<CSSStyleDeclaration>);
        this.pauseBtn.textContent = '≡';
        this.pauseBtn.setAttribute('aria-label', 'Menu');
        this.pauseBtn.addEventListener('click', () => this.toggle());
        document.body.appendChild(this.pauseBtn);

        this.onKeyDown = (e: KeyboardEvent) => {
            if (this.waitingForKey) {
                e.preventDefault();
                this.bindKey(e.code);
                return;
            }
            if (e.key === 'Escape') this.toggle();
        };
        document.addEventListener('keydown', this.onKeyDown);
    }

    private keysContainer: HTMLDivElement;
    private loadListContainer: HTMLDivElement;
    private waitingForKey: keyof KeyBindings | null = null;
    
    private updateKeysUI() {
        this.keysContainer.innerHTML = '';
        const bindings = loadKeyBindings();
        
        const actions: { id: keyof KeyBindings, label: string }[] = [
            { id: 'up', label: 'UP' },
            { id: 'down', label: 'DOWN' },
            { id: 'left', label: 'LEFT' },
            { id: 'right', label: 'RIGHT' },
            { id: 'fire', label: 'FIRE/ASCEND' }
        ];

        actions.forEach(action => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontFamily: 'monospace'
            });
            
            const labelEl = document.createElement('span');
            labelEl.textContent = action.label;
            
            const valEl = document.createElement('span');
            valEl.style.color = 'yellow';
            valEl.textContent = this.waitingForKey === action.id ? '[PRESS KEY]' : formatKey(bindings[action.id]);
            
            row.appendChild(labelEl);
            row.appendChild(valEl);
            
            row.addEventListener('click', () => {
                this.waitingForKey = action.id;
                this.updateKeysUI();
            });
            
            this.keysContainer.appendChild(row);
        });
    }

    private showLoadDialog(): void {
        const saves = this.storage.listSaves();
        this.loadListContainer.innerHTML = '';

        if (saves.length === 0) {
            const empty = document.createElement('div');
            Object.assign(empty.style, { padding: '12px', opacity: '0.5', fontFamily: 'monospace', fontSize: '13px' });
            empty.textContent = 'NO SAVES FOUND';
            this.loadListContainer.appendChild(empty);
        } else {
            saves.forEach(slot => {
                const btn = document.createElement('button');
                Object.assign(btn.style, BTN_STYLE, { width: '100%', textAlign: 'left', padding: '10px 8px' });
                btn.textContent = slot.label;
                btn.addEventListener('pointerenter', () => { btn.style.border = BTN_HOVER_BORDER; });
                btn.addEventListener('pointerleave', () => { btn.style.border = BTN_NORMAL_BORDER; });
                btn.addEventListener('click', () => {
                    this.loadDialog.style.display = 'none';
                    this.hide();
                    this.onLoad(slot.timestamp, slot.mapName);
                });
                this.loadListContainer.appendChild(btn);
            });
        }

        this.overlay.style.display = 'none';
        this.loadDialog.style.display = 'flex';
    }

    private bindKey(code: string) {
        if (!this.waitingForKey) return;
        
        const bindings = loadKeyBindings();
        bindings[this.waitingForKey] = code;
        saveKeyBindings(bindings);
        
        this.waitingForKey = null;
        this.updateKeysUI();
    }

    show(): void {
        if (this.visible) return;
        this.visible = true;
        this.overlay.style.display = 'flex';
        this.mapDialog.style.display = 'none';
        this.keysDialog.style.display = 'none';
        this.loadDialog.style.display = 'none';
        this.pauseBtn.style.display = 'none';
        this.waitingForKey = null;
        this.onShow?.();
    }

    hide(): void {
        if (!this.visible) return;
        this.visible = false;
        this.overlay.style.display = 'none';
        this.mapDialog.style.display = 'none';
        this.keysDialog.style.display = 'none';
        this.loadDialog.style.display = 'none';
        this.pauseBtn.style.display = 'block';
        this.waitingForKey = null;
        this.onHide?.();
    }

    toggle(): void {
        if (this.visible) this.hide(); else this.show();
    }

    isVisible(): boolean {
        return this.visible;
    }

    private showSaveError(): void {
        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position:     'fixed',
            bottom:       '24px',
            left:         '50%',
            transform:    'translateX(-50%)',
            background:   'rgba(0,0,0,0.85)',
            color:        '#ef5350',
            fontFamily:   'monospace',
            fontSize:     '13px',
            letterSpacing:'2px',
            padding:      '8px 20px',
            borderRadius: '3px',
            border:       '1px solid #ef5350',
            zIndex:       '9999',
            pointerEvents:'none',
        } satisfies Partial<CSSStyleDeclaration>);
        toast.textContent = 'SAVE FAILED (storage full?)';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    private showSaveConfirmation(): void {
        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position:     'fixed',
            bottom:       '24px',
            left:         '50%',
            transform:    'translateX(-50%)',
            background:   'rgba(0,0,0,0.85)',
            color:        '#66bb6a',
            fontFamily:   'monospace',
            fontSize:     '13px',
            letterSpacing:'2px',
            padding:      '8px 20px',
            borderRadius: '3px',
            border:       '1px solid #66bb6a',
            zIndex:       '9999',
            pointerEvents:'none',
        } satisfies Partial<CSSStyleDeclaration>);
        toast.textContent = 'GAME SAVED';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1800);
    }

    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        this.overlay.remove();
        this.mapDialog.remove();
        this.keysDialog.remove();
        this.loadDialog.remove();
        this.pauseBtn.remove();
    }
}
