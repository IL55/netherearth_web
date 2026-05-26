import type { ShipInput } from '../game/ship/types';

type InputKey = keyof ShipInput;

function buildVisualOverlay(): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '5',
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: '28px',
        color: 'rgba(255,255,255,0.18)',
        userSelect: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    const place = (text: string, s: Partial<CSSStyleDeclaration>) => {
        const d = document.createElement('div');
        Object.assign(d.style, { position: 'absolute', pointerEvents: 'none', ...s });
        d.textContent = text;
        el.appendChild(d);
    };

    // Left-half arrows at cross arm midpoints
    place('↑', { top: '10%',  left: '22%',  transform: 'translateX(-50%)' });
    place('↓', { bottom: '10%', left: '22%', transform: 'translateX(-50%)' });
    place('←', { top: '50%',  left: '4%',   transform: 'translateY(-50%)' });
    place('→', { top: '50%',  left: '42%',  transform: 'translateY(-50%)' });

    // Right-half fire indicator
    place('⬤', { top: '50%', left: '75%', transform: 'translate(-50%,-50%)', fontSize: '36px' });

    // Divider
    const div = document.createElement('div');
    Object.assign(div.style, {
        position: 'absolute',
        left: '50%',
        top: '8%',
        bottom: '8%',
        width: '1px',
        background: 'rgba(255,255,255,0.10)',
    });
    el.appendChild(div);

    return el;
}

export function attachTouchZones(input: ShipInput): () => void {
    if (navigator.maxTouchPoints === 0) return () => {};

    const visual = buildVisualOverlay();
    document.body.appendChild(visual);

    // Zone divs sit at z-index 5 with pointer-events: auto so they intercept
    // touches before the canvas (and prevent BabylonJS from rotating the camera
    // in those regions). Dead-zone corners have no div — touches pass through.
    const zonesEl = document.createElement('div');
    Object.assign(zonesEl.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '5',
        pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(zonesEl);

    const activePointers = new Map<number, InputKey | null>();

    function makeZoneDiv(style: Partial<CSSStyleDeclaration>, key: InputKey): HTMLDivElement {
        const zone = document.createElement('div');
        Object.assign(zone.style, { position: 'absolute', pointerEvents: 'auto', ...style });

        zone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            zone.setPointerCapture(e.pointerId);
            activePointers.set(e.pointerId, key);
            input[key] = true;
        });
        const release = (e: PointerEvent) => {
            if (!activePointers.has(e.pointerId)) return;
            activePointers.delete(e.pointerId);
            input[key] = false;
        };
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);

        return zone;
    }

    // Column widths as fractions of the left half (50% of screen):
    //   col0 = 0–1/3 of left half = 0–16.67% of screen
    //   col1 = 1/3–2/3 of left half = 16.67–33.33% of screen
    //   col2 = 2/3–1 of left half = 33.33–50% of screen
    const col = (n: number) => `${(50 / 3) * n}%`;
    const colW = `${50 / 3}%`;

    zonesEl.appendChild(makeZoneDiv({ left: col(1), top: '0',   width: colW,  height: '33%' }, 'forward'));
    zonesEl.appendChild(makeZoneDiv({ left: col(1), bottom: '0', width: colW, height: '33%' }, 'backward'));
    zonesEl.appendChild(makeZoneDiv({ left: col(0), top: '33%', width: colW,  height: '34%' }, 'left'));
    zonesEl.appendChild(makeZoneDiv({ left: col(2), top: '33%', width: colW,  height: '34%' }, 'right'));
    zonesEl.appendChild(makeZoneDiv({ left: '50%',  top: '0',   width: '50%', height: '100%' }, 'ascend'));

    return () => {
        for (const key of activePointers.values()) {
            if (key) input[key] = false;
        }
        activePointers.clear();
        visual.remove();
        zonesEl.remove();
    };
}
