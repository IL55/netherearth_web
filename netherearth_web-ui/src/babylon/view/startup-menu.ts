import { bus } from '../game/event-bus';

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
    fontSize:      '52px',
    fontWeight:    'bold',
    letterSpacing: '6px',
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
    width:         '220px',
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

export class StartupMenu {
    private overlay:  HTMLDivElement;
    private visible = false;
    private onKeyDown: (e: KeyboardEvent) => void;

    constructor(
        private onSave:    () => void,
        private onLoad:    () => void,
        private onNewGame?: () => void,
    ) {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, OVERLAY_STYLE);
        this.overlay.style.display = 'none';

        const title = document.createElement('div');
        Object.assign(title.style, TITLE_STYLE);
        title.textContent = 'NETHER EARTH RESTART';
        this.overlay.appendChild(title);

        const subtitle = document.createElement('div');
        Object.assign(subtitle.style, SUBTITLE_STYLE);
        subtitle.textContent = 'PAUSE MENU';
        this.overlay.appendChild(subtitle);

        const makeBtn = (label: string, onClick: () => void): HTMLButtonElement => {
            const btn = document.createElement('button');
            Object.assign(btn.style, BTN_STYLE);
            btn.textContent = label;
            btn.addEventListener('mouseenter', () => { btn.style.border = BTN_HOVER_BORDER; });
            btn.addEventListener('mouseleave', () => { btn.style.border = BTN_NORMAL_BORDER; });
            btn.addEventListener('click', onClick);
            return btn;
        };

        this.overlay.appendChild(makeBtn('NEW GAME',  () => {
            this.hide();
            if (this.onNewGame) this.onNewGame();
            bus.emit({ type: 'game:start' });
        }));
        this.overlay.appendChild(makeBtn('RESUME',    () => this.hide()));
        this.overlay.appendChild(makeBtn('SAVE GAME', () => this.onSave()));
        this.overlay.appendChild(makeBtn('LOAD GAME', () => this.onLoad()));

        const hint = document.createElement('div');
        Object.assign(hint.style, HINT_STYLE);
        hint.textContent = 'ESC — resume';
        this.overlay.appendChild(hint);

        document.body.appendChild(this.overlay);

        this.onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') this.toggle();
        };
        document.addEventListener('keydown', this.onKeyDown);
    }

    show(): void {
        if (this.visible) return;
        this.visible = true;
        this.overlay.style.display = 'flex';
    }

    hide(): void {
        if (!this.visible) return;
        this.visible = false;
        this.overlay.style.display = 'none';
    }

    toggle(): void {
        if (this.visible) this.hide(); else this.show();
    }

    isVisible(): boolean {
        return this.visible;
    }

    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        this.overlay.remove();
    }
}
