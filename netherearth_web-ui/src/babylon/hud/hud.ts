/**
 * GameHud — two semi-transparent overlays on the game canvas.
 *
 * Resources panel  — top-right corner, compact stats table.
 * Minimap canvas   — bottom-left corner, map rotated 90° CCW so
 *                    Red base (low Y) appears on the left and
 *                    Blue base (high Y) appears on the right.
 *
 * Both panels have opacity 0.7 — secondary info, not intrusive.
 */
import type { WarMap } from '../game/core/warmap';
import { ObjectType } from '../game/core/warmap';
import { Owner } from '../game/types/owner';
import { buildHudData, type OwnerStats } from './hud-data';

const C_RED     = '#ef5350';
const C_BLUE    = '#42a5f5';
const C_LABEL   = '#bbb';
const C_NEUTRAL = '#777';
const C_WALL    = '#aaa';
const C_FENCE   = '#888';

const WALL_TYPES = new Set<string>([
    ObjectType.WALL1, ObjectType.WALL2, ObjectType.WALL3,
    ObjectType.WALL4, ObjectType.WALL5, ObjectType.WALL6,
]);
const CELL      = 4; // minimap pixels per map cell

// Factory C-shape — mirrors FACTORY_PARTS xo/yo
const FACTORY_SHAPE = [
    {xo:0,yo:0},{xo:0,yo:1},{xo:0,yo:2},
    {xo:1,yo:0},{xo:1,yo:2},
];

// Warbase schematic shape (integer grid, matches top-down footprint):
//   yo=0,4: cols 1-2 (caps start at xo=0.5 — shifted 1 col from the back wall at col 0)
//   yo=1,3: cols 0-3 (full-width side rows, back wall at col 0)
//   yo=2:   cols 0-2 (col 3 open = entrance / capture zone)
const WARBASE_SHAPE = [
    {xo:1,yo:0},{xo:2,yo:0},
    {xo:0,yo:1},{xo:1,yo:1},{xo:2,yo:1},{xo:3,yo:1},
    {xo:0,yo:2},{xo:1,yo:2},{xo:2,yo:2},
    {xo:0,yo:3},{xo:1,yo:3},{xo:2,yo:3},{xo:3,yo:3},
    {xo:1,yo:4},{xo:2,yo:4},
];

const ROWS: Array<{ label: string; key: keyof OwnerStats }> = [
    { label: 'Robots',  key: 'robots'      },
    { label: 'Bases',   key: 'warbases'    },
    { label: 'Elec',    key: 'electronics' },
    { label: 'Chassis', key: 'chassis'     },
    { label: 'Msls',    key: 'missiles'    },
    { label: 'Cannon',  key: 'cannons'     },
    { label: 'Phaser',  key: 'phasers'     },
    { label: 'Nuke',    key: 'nuclear'     },
];

function ownerColor(owner?: Owner): string {
    if (owner === Owner.RED)  return C_RED;
    if (owner === Owner.BLUE) return C_BLUE;
    return C_NEUTRAL;
}

const PANEL_STYLE: Partial<CSSStyleDeclaration> = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.75)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '4px 8px',
    pointerEvents: 'none',
    opacity: '0.7',
    borderRadius: '3px',
};

export class GameHud {
    private resourcesEl: HTMLDivElement;
    private minimapCanvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        const parent = canvas.parentElement ?? document.body;
        parent.style.position = 'relative';

        this.resourcesEl = document.createElement('div');
        Object.assign(this.resourcesEl.style, PANEL_STYLE, { top: '8px', right: '8px' });
        parent.appendChild(this.resourcesEl);

        this.minimapCanvas = document.createElement('canvas');
        Object.assign(this.minimapCanvas.style, {
            position: 'absolute', bottom: '8px', right: '8px',
            imageRendering: 'pixelated',
            opacity: '0.7', pointerEvents: 'none',
            borderRadius: '3px',
        });
        parent.appendChild(this.minimapCanvas);
    }

    update(warMap: WarMap): void {
        this.updateResources(warMap);
        this.updateMinimap(warMap);
    }

    private updateResources(warMap: WarMap): void {
        const d = buildHudData(warMap);
        const prog = String(d.dayProgress).padStart(2, '0');

        const rows = ROWS.map(r => `
            <tr>
                <td style="color:${C_RED};text-align:right;padding:0 4px">${d.red[r.key]}</td>
                <td style="color:${C_LABEL};padding:0 4px">${r.label}</td>
                <td style="color:${C_BLUE};padding:0 4px">${d.blue[r.key]}</td>
            </tr>`).join('');

        this.resourcesEl.innerHTML = `
            <div style="text-align:center;margin-bottom:2px;letter-spacing:1px">
                Day&nbsp;<b>${d.day}</b>&nbsp;<span style="color:${C_LABEL}">${prog}%</span>
            </div>
            <table style="border-collapse:collapse;line-height:1.35">
                <tr>
                    <th style="color:${C_RED};text-align:right;padding:0 4px">R</th>
                    <th></th>
                    <th style="color:${C_BLUE};padding:0 4px">B</th>
                </tr>
                ${rows}
            </table>`;
    }

    private updateMinimap(warMap: WarMap): void {
        // Rotated 90° CW: canvas width = mapHeight, canvas height = mapWidth
        const cw = warMap.height * CELL;
        const ch = warMap.width  * CELL;

        if (this.minimapCanvas.width !== cw || this.minimapCanvas.height !== ch) {
            this.minimapCanvas.width  = cw;
            this.minimapCanvas.height = ch;
        }

        const ctx = this.minimapCanvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, cw, ch);

        // 90° CCW: map (x, y) → canvas (y * CELL, x * CELL)
        const toCanvas = (mx: number, my: number) => ({
            cx: Math.floor(my) * CELL,
            cy: Math.floor(mx) * CELL,
        });

        for (const obj of warMap.objects) {
            const color = ownerColor(obj.owner);
            ctx.fillStyle = color;

            if (obj.type === ObjectType.FACTORY) {
                for (const {xo, yo} of FACTORY_SHAPE) {
                    const {cx, cy} = toCanvas(obj.x + xo, obj.y + yo);
                    ctx.fillRect(cx, cy, CELL, CELL);
                }
            } else if (obj.type === ObjectType.WARBASE) {
                // Use xo directly (not obj.x + xo) so both warbases render
                // the same shape regardless of their sub-cell x offset.
                const baseY = Math.round(obj.y);
                for (const {xo, yo} of WARBASE_SHAPE) {
                    const {cx, cy} = toCanvas(xo, baseY + yo);
                    ctx.fillRect(cx, cy, CELL, CELL);
                }
            } else if (WALL_TYPES.has(obj.type)) {
                ctx.fillStyle = C_WALL;
                const {cx, cy} = toCanvas(obj.x, obj.y);
                ctx.fillRect(cx, cy, CELL, CELL);
            } else if (obj.type === ObjectType.FENCE) {
                ctx.fillStyle = C_FENCE;
                const {cx, cy} = toCanvas(obj.x, obj.y);
                ctx.fillRect(cx, cy, CELL, CELL);
            } else if (obj.type === ObjectType.ROBOT) {
                const {cx, cy} = toCanvas(obj.x, obj.y);
                ctx.beginPath();
                ctx.arc(cx + CELL / 2, cy + CELL / 2, CELL / 2 - 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
