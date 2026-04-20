import * as BABYLON from '@babylonjs/core';
import { getGoalLabel, getRobotHealthPercent } from './queries';
import { buildDirectionAction, buildFireAction, buildFireActionForWeapon } from './actions';
import { setManualControl, setRobotGoal, setMoveGoal } from './mutations';
import { WEAPON_RENDER_ORDER } from '../../data/robot';
import type { Weapon } from '../../data/robot';
import { ORDERABLE_GOALS, GOAL_LABELS } from './constants';
import { Direction } from '../../game/core/warmap';
import { Owner } from '../../game/types/owner';
import { RobotGoal } from '../../game/types/robot-goal';
import type { RobotObject, WarMap } from '../../game/core/warmap';
import { ActionType } from '../../game/actions';
import type { RobotAction } from '../../game/actions';

const PANEL_STYLE: Partial<CSSStyleDeclaration> = {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.75)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '3px',
    opacity: '0.85',
    userSelect: 'none',
    lineHeight: '1.5',
};

const BTN_STYLE: Partial<CSSStyleDeclaration> = {
    display: 'block',
    background: 'none',
    border: 'none',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    textAlign: 'left',
};

const MOVE_DISTANCE_MIN = 1;
const MOVE_DISTANCE_MAX = 50;

function makeBtn(label: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, BTN_STYLE, { color });
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
}

export class RobotControl3D {
    private onExitCallback: () => void;
    private onAction: (action: RobotAction) => void;
    private warMap: WarMap;
    private currentRobot: RobotObject | null = null;
    private panel: HTMLDivElement;
    private healthEl: HTMLDivElement;
    private goalEl: HTMLDivElement;
    private mainView: HTMLDivElement;
    private goalView: HTMLDivElement;
    private manualView: HTMLDivElement;
    private moveDistance = 5;
    private moveDistanceEl: HTMLSpanElement;
    private moveFwdBtn: HTMLButtonElement;
    private moveBwdBtn: HTMLButtonElement;
    private detonateBtn: HTMLButtonElement;
    private weaponBtnsContainer!: HTMLDivElement;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;
    private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
    private heldDirection: Direction | null = null;
    private weaponKeys: Weapon[] = [];

    constructor(
        scene: BABYLON.Scene,
        warMap: WarMap,
        onExit: () => void,
        onAction: (action: RobotAction) => void,
        bottomOffset = 8,
    ) {
        this.onExitCallback = onExit;
        this.onAction = onAction;
        this.warMap = warMap;

        const canvas = scene.getEngine().getRenderingCanvas()!;
        const parent = canvas.parentElement ?? document.body;
        parent.style.position = 'relative';

        this.panel = document.createElement('div');
        Object.assign(this.panel.style, PANEL_STYLE);
        this.panel.style.bottom = `${bottomOffset}px`;
        this.panel.style.display = 'none';

        // ── Header (always visible) ────────────────────────────────────────
        const title = document.createElement('div');
        title.style.color = '#bbb';
        title.style.marginBottom = '2px';
        title.textContent = 'ROBOT CONTROL';
        this.panel.appendChild(title);

        this.healthEl = document.createElement('div');
        this.panel.appendChild(this.healthEl);

        this.goalEl = document.createElement('div');
        this.panel.appendChild(this.goalEl);

        // ── Main view ─────────────────────────────────────────────────────
        this.mainView = document.createElement('div');
        this.mainView.style.marginTop = '3px';
        this.mainView.appendChild(makeBtn('CHANGE GOAL', '#42a5f5', () => this.showGoalView()));
        this.mainView.appendChild(makeBtn('MANUAL CONTROL', '#ffa726', () => this.showManualView()));
        this.mainView.appendChild(makeBtn('EXIT', '#ef5350', () => this.close()));
        this.panel.appendChild(this.mainView);

        // ── Goal selection view ────────────────────────────────────────────
        this.goalView = document.createElement('div');
        this.goalView.style.marginTop = '3px';
        this.goalView.style.display = 'none';

        // Distance stepper
        const stepperRow = document.createElement('div');
        stepperRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:2px';

        const stepperLabel = document.createElement('span');
        stepperLabel.style.color = '#bbb';
        stepperLabel.textContent = 'miles:';

        const minusBtn = document.createElement('button');
        Object.assign(minusBtn.style, BTN_STYLE, { display: 'inline', color: '#aaa' });
        minusBtn.textContent = '−';
        minusBtn.addEventListener('click', () => {
            this.moveDistance = Math.max(MOVE_DISTANCE_MIN, this.moveDistance - 5);
            this.updateStepper();
        });

        this.moveDistanceEl = document.createElement('span');
        this.moveDistanceEl.style.cssText = 'min-width:2ch;text-align:center';
        this.moveDistanceEl.textContent = String(this.moveDistance);

        const plusBtn = document.createElement('button');
        Object.assign(plusBtn.style, BTN_STYLE, { display: 'inline', color: '#aaa' });
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', () => {
            this.moveDistance = Math.min(MOVE_DISTANCE_MAX, this.moveDistance + 5);
            this.updateStepper();
        });

        stepperRow.append(stepperLabel, minusBtn, this.moveDistanceEl, plusBtn);
        this.goalView.appendChild(stepperRow);

        this.moveFwdBtn = makeBtn('', '#66bb6a', () => {
            if (!this.currentRobot) return;
            const dx = (this.currentRobot.owner === Owner.RED ? 1 : -1) * this.moveDistance;
            setMoveGoal(this.currentRobot, RobotGoal.MOVE_FORWARD, dx);
            this.goalEl.textContent = this.goalText();
            this.showMainView();
        });
        this.goalView.appendChild(this.moveFwdBtn);

        this.moveBwdBtn = makeBtn('', '#ef9a9a', () => {
            if (!this.currentRobot) return;
            const dx = (this.currentRobot.owner === Owner.RED ? -1 : 1) * this.moveDistance;
            setMoveGoal(this.currentRobot, RobotGoal.MOVE_BACKWARD, dx);
            this.goalEl.textContent = this.goalText();
            this.showMainView();
        });
        this.goalView.appendChild(this.moveBwdBtn);

        const divider = document.createElement('div');
        divider.style.cssText = 'border-top:1px solid #444;margin:2px 0';
        this.goalView.appendChild(divider);

        for (const goal of ORDERABLE_GOALS) {
            this.goalView.appendChild(makeBtn(GOAL_LABELS[goal] ?? goal, 'white', () => {
                if (this.currentRobot) {
                    setRobotGoal(this.currentRobot, goal);
                    this.goalEl.textContent = this.goalText();
                }
                this.showMainView();
            }));
        }
        this.goalView.appendChild(makeBtn("don't change goal", '#888', () => this.showMainView()));
        this.panel.appendChild(this.goalView);

        // ── Manual control view ────────────────────────────────────────────
        this.manualView = document.createElement('div');
        this.manualView.style.cssText = 'margin-top:3px;display:none';

        // D-pad grid: 3×2 grid with Up in top-center, Left/Down/Right in bottom row
        const dpad = document.createElement('div');
        dpad.style.cssText = 'display:grid;grid-template-columns:repeat(3,1.5em);grid-template-rows:repeat(2,1.2em);gap:1px;margin-bottom:3px';

        const arrowBtn = (label: string, dir: Direction) => {
            const b = document.createElement('button');
            Object.assign(b.style, BTN_STYLE, {
                display: 'inline',
                color: 'white',
                textAlign: 'center',
                width: '1.5em',
            });
            b.textContent = label;
            b.addEventListener('click', () => this.dispatchDir(dir));
            return b;
        };

        const empty = () => document.createElement('span');

        // Arrow keys match ship movement directions:
        // ↑=West, ↓=East, ←=North, →=South  (same visual axis as ship controls)
        dpad.appendChild(empty());
        dpad.appendChild(arrowBtn('↑', Direction.W));
        dpad.appendChild(empty());
        dpad.appendChild(arrowBtn('←', Direction.N));
        dpad.appendChild(arrowBtn('↓', Direction.E));
        dpad.appendChild(arrowBtn('→', Direction.S));
        this.manualView.appendChild(dpad);

        this.manualView.appendChild(makeBtn('FIRE BEST  [Space]', '#ffa726', () => this.dispatchFire()));

        this.weaponBtnsContainer = document.createElement('div');
        this.manualView.appendChild(this.weaponBtnsContainer);

        this.detonateBtn = makeBtn('DETONATE A-BOMB  [X]', '#ef5350', () => this.dispatchDetonate());
        this.manualView.appendChild(this.detonateBtn);

        this.manualView.appendChild(makeBtn('RETURN', '#888', () => this.showMainView()));
        this.panel.appendChild(this.manualView);

        parent.appendChild(this.panel);
    }

    // ── Action dispatch ────────────────────────────────────────────────────────

    private dispatchDir(dir: Direction): void {
        if (!this.currentRobot) return;
        this.onAction(buildDirectionAction(this.currentRobot, dir));
    }

    private dispatchFire(): void {
        if (!this.currentRobot) return;
        const action = buildFireAction(this.currentRobot, this.warMap);
        if (action) this.onAction(action);
    }

    private dispatchFireWeapon(weapon: Weapon): void {
        if (!this.currentRobot) return;
        const action = buildFireActionForWeapon(this.currentRobot, this.warMap, weapon);
        if (action) this.onAction(action);
    }

    private dispatchDetonate(): void {
        if (!this.currentRobot?.robotConfig?.nuclear) return;
        this.onAction({ type: ActionType.DETONATE });
        this.close(); // Detonation kills the robot, so close the control panel
    }

    // ── Key bindings ───────────────────────────────────────────────────────────

    private attachKeys(): void {
        this.keyHandler = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'ArrowLeft':  e.preventDefault(); this.heldDirection = Direction.N; break;
                case 'ArrowRight': e.preventDefault(); this.heldDirection = Direction.S; break;
                case 'ArrowUp':    e.preventDefault(); this.heldDirection = Direction.W; break;
                case 'ArrowDown':  e.preventDefault(); this.heldDirection = Direction.E; break;
                case 'Space':      if (!e.repeat) { e.preventDefault(); this.dispatchFire(); } break;
                case 'KeyX':       if (!e.repeat) { e.preventDefault(); this.dispatchDetonate(); } break;
                case 'Digit1': case 'Digit2': case 'Digit3': {
                    if (!e.repeat) {
                        e.preventDefault();
                        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
                        const w = this.weaponKeys[idx];
                        if (w) this.dispatchFireWeapon(w);
                    }
                    break;
                }
            }
        };
        this.keyUpHandler = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    this.heldDirection = null;
                    break;
            }
        };
        document.addEventListener('keydown', this.keyHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    }

    private detachKeys(): void {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        if (this.keyUpHandler) {
            document.removeEventListener('keyup', this.keyUpHandler);
            this.keyUpHandler = null;
        }
        this.heldDirection = null;
    }

    // ── View switching ─────────────────────────────────────────────────────────

    private goalText(): string {
        return `Goal: ${getGoalLabel(this.currentRobot?.goal)}`;
    }

    private updateStepper(): void {
        this.moveDistanceEl.textContent = String(this.moveDistance);
        this.moveFwdBtn.textContent = `Move ${this.moveDistance} forward`;
        this.moveBwdBtn.textContent = `Move ${this.moveDistance} backward`;
    }

    private showMainView(): void {
        this.detachKeys();
        this.mainView.style.display = 'block';
        this.goalView.style.display = 'none';
        this.manualView.style.display = 'none';
    }

    private showGoalView(): void {
        this.updateStepper();
        this.mainView.style.display = 'none';
        this.goalView.style.display = 'block';
        this.manualView.style.display = 'none';
    }

    private showManualView(): void {
        if (!this.currentRobot) return;
        setManualControl(this.currentRobot);

        // Build per-weapon fire buttons in render order
        this.weaponBtnsContainer.innerHTML = '';
        this.weaponKeys = [];
        const robotWeapons = new Set(this.currentRobot.robotConfig?.weapons ?? []);
        let keyIndex = 1;
        for (const w of WEAPON_RENDER_ORDER) {
            if (!robotWeapons.has(w)) continue;
            const label = `FIRE ${w.toUpperCase()}  [${keyIndex}]`;
            const weapon = w;
            this.weaponBtnsContainer.appendChild(
                makeBtn(label, '#ce93d8', () => this.dispatchFireWeapon(weapon)),
            );
            this.weaponKeys.push(weapon);
            keyIndex++;
        }

        // Show or hide detonate button based on robot equipment
        this.detonateBtn.style.display = this.currentRobot.robotConfig?.nuclear ? 'block' : 'none';

        this.attachKeys();
        this.mainView.style.display = 'none';
        this.goalView.style.display = 'none';
        this.manualView.style.display = 'block';
        this.updateDisplay();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Called each render tick while the panel is open. Updates health display and forwards held direction. */
    public updateDisplay(): void {
        if (!this.currentRobot) return;
        const pct = getRobotHealthPercent(this.currentRobot);
        this.healthEl.textContent = `HP: ${pct}%`;
        this.healthEl.style.color = pct >= 60 ? '#66bb6a' : pct >= 30 ? '#ffa726' : '#ef5350';
        if (this.heldDirection !== null && this.keyHandler !== null) {
            this.dispatchDir(this.heldDirection);
        }
    }

    public open(robot: RobotObject): void {
        this.currentRobot = robot;
        this.goalEl.textContent = this.goalText();
        this.updateDisplay();
        this.showMainView();
        this.panel.style.display = 'block';
    }

    public close(): void {
        this.detachKeys();
        this.panel.style.display = 'none';
        this.currentRobot = null;
        this.onExitCallback();
    }

    public dispose(): void {
        this.close();
        this.panel.remove();
    }
}
