import { Owner } from '../game/types/owner';

const OVERLAY_STYLE: Partial<CSSStyleDeclaration> = {
    position:        'fixed',
    inset:           '0',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'rgba(0, 0, 0, 0.75)',
    color:           'white',
    fontFamily:      'monospace',
    zIndex:          '9999',
};

const TITLE_STYLE: Partial<CSSStyleDeclaration> = {
    fontSize:     '48px',
    fontWeight:   'bold',
    marginBottom: '24px',
    letterSpacing: '4px',
};

const BTN_STYLE: Partial<CSSStyleDeclaration> = {
    marginTop:   '32px',
    padding:     '10px 32px',
    fontSize:    '18px',
    fontFamily:  'monospace',
    cursor:      'pointer',
    background:  'none',
    border:      '1px solid white',
    color:       'white',
    letterSpacing: '2px',
};

/**
 * Full-screen HTML overlay shown when the game ends.
 * Displays "Humans win!" when RED captures all warbases,
 * "Humans lose!" when BLUE does.
 */
export class GameOverScreen {
    private overlay: HTMLDivElement;
    private visible = false;

    constructor(private onDismiss: () => void) {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, OVERLAY_STYLE);
        this.overlay.style.display = 'none';

        const title = document.createElement('div');
        Object.assign(title.style, TITLE_STYLE);
        this.overlay.appendChild(title);

        const btn = document.createElement('button');
        Object.assign(btn.style, BTN_STYLE);
        btn.textContent = 'OK';
        btn.addEventListener('click', () => this.dismiss());
        this.overlay.appendChild(btn);

        document.body.appendChild(this.overlay);
        // Keep a reference so we can update the title text on show()
        (this.overlay as any).__title = title;
    }

    show(winner: Owner): void {
        if (this.visible) return;
        this.visible = true;
        const isHumanWin = winner === Owner.RED;
        (this.overlay as any).__title.textContent = isHumanWin ? 'Humans win!' : 'Humans lose!';
        (this.overlay as any).__title.style.color = isHumanWin ? '#66bb6a' : '#ef5350';
        this.overlay.style.display = 'flex';
    }

    isVisible(): boolean {
        return this.visible;
    }

    private dismiss(): void {
        this.overlay.style.display = 'none';
        this.visible = false;
        this.onDismiss();
    }

    dispose(): void {
        this.overlay.remove();
    }
}
