import * as BABYLON from '@babylonjs/core';
import { cycleRobotGoal, setManualControl, getGoalLabel, getRobotDescription } from './robot-control-logic';
import type { RobotObject } from '../../game/core/warmap';

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
    background: 'none',
    border: 'none',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
};

export class RobotControl3D {
    private onExitCallback: () => void;
    private currentRobot: RobotObject | null = null;
    private panel: HTMLDivElement;
    private descEl: HTMLSpanElement;
    private goalEl: HTMLSpanElement;

    constructor(scene: BABYLON.Scene, onExit: () => void, bottomOffset = 8) {
        this.onExitCallback = onExit;

        const canvas = scene.getEngine().getRenderingCanvas()!;
        const parent = canvas.parentElement ?? document.body;
        parent.style.position = 'relative';

        this.panel = document.createElement('div');
        Object.assign(this.panel.style, PANEL_STYLE);
        this.panel.style.bottom = `${bottomOffset}px`;
        this.panel.style.display = 'none';

        // Title
        const title = document.createElement('div');
        title.style.color = '#bbb';
        title.style.marginBottom = '2px';
        title.textContent = 'ROBOT CONTROL';
        this.panel.appendChild(title);

        // Robot description
        this.descEl = document.createElement('div');
        this.panel.appendChild(this.descEl);

        // Current goal
        this.goalEl = document.createElement('div');
        this.panel.appendChild(this.goalEl);

        // Buttons row
        const btnRow = document.createElement('div');
        btnRow.style.marginTop = '3px';
        btnRow.style.display = 'flex';
        btnRow.style.gap = '10px';

        const changeBtn = document.createElement('button');
        Object.assign(changeBtn.style, BTN_STYLE, { color: '#42a5f5' });
        changeBtn.textContent = 'CHANGE ORDER';
        changeBtn.addEventListener('click', () => {
            if (!this.currentRobot) return;
            cycleRobotGoal(this.currentRobot);
            this.goalEl.textContent = this.goalText();
        });

        const manualBtn = document.createElement('button');
        Object.assign(manualBtn.style, BTN_STYLE, { color: '#ffa726' });
        manualBtn.textContent = 'MANUAL CONTROL';
        manualBtn.addEventListener('click', () => {
            if (!this.currentRobot) return;
            setManualControl(this.currentRobot);
            this.close();
        });

        const exitBtn = document.createElement('button');
        Object.assign(exitBtn.style, BTN_STYLE, { color: '#ef5350' });
        exitBtn.textContent = 'EXIT';
        exitBtn.addEventListener('click', () => this.close());

        btnRow.appendChild(changeBtn);
        btnRow.appendChild(manualBtn);
        btnRow.appendChild(exitBtn);
        this.panel.appendChild(btnRow);

        parent.appendChild(this.panel);
    }

    private goalText(): string {
        return `Goal: ${getGoalLabel(this.currentRobot?.goal)}`;
    }

    public open(robot: RobotObject): void {
        this.currentRobot = robot;
        this.descEl.textContent = getRobotDescription(robot.robotConfig);
        this.goalEl.textContent = this.goalText();
        this.panel.style.display = 'block';
    }

    public close(): void {
        this.panel.style.display = 'none';
        this.currentRobot = null;
        this.onExitCallback();
    }

    public dispose(): void {
        this.close();
        this.panel.remove();
    }
}
