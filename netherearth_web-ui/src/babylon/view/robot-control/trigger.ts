import { Owner } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import { ActionType } from '../../game/actions';
import type { RobotAction } from '../../game/actions';
import { RobotControl3D } from './robot-control-3d';
import { findRobotUnderShip, isRobotAlive } from './robot-control-logic';
import { calcRobotHeight } from '../../data/robot';
import type * as BABYLON from '@babylonjs/core';

const HOVER_GAP = 0.5; // how far above the robot's top the ship hovers

export class RobotControlTrigger {
    private isRobotControlOpen = false;
    private triggeredRobotControlId: string | null = null;
    private robotControl: RobotControl3D | null = null;
    private pendingManualAction: RobotAction | null = null;

    constructor(
        private scene: BABYLON.Scene,
        private mapWidth: number,
        private onExit: () => void
    ) {}

    public check(
        warMap: WarMap,
        ship: { x: number; y: number; height: number },
        isConstructionYardOpen: boolean
    ): void {
        // ── Robot control — close if controlled robot died; track robot position ──
        if (this.isRobotControlOpen && this.robotControl && !isRobotAlive(warMap, this.triggeredRobotControlId)) {
            this.robotControl.close();
        } else if (this.isRobotControlOpen && this.robotControl) {
            // Keep ship above the controlled robot so it follows as the robot moves
            const controlled = warMap.objects.find(o => o.id === this.triggeredRobotControlId) as RobotObject | undefined;
            if (controlled) {
                ship.x = controlled.x;
                ship.y = controlled.y;
                ship.height = (controlled.robotConfig ? calcRobotHeight(controlled.robotConfig) : 1.0) + HOVER_GAP;
            }
            this.robotControl.updateDisplay();
        }

        // ── Robot control ────────────────────────────────────────────────────────
        if (!isConstructionYardOpen && !this.isRobotControlOpen) {
            const nearRobot = findRobotUnderShip(warMap, ship, Owner.RED);
            if (nearRobot && nearRobot.id !== this.triggeredRobotControlId) {
                this.triggeredRobotControlId = nearRobot.id;
                this.isRobotControlOpen = true;
                ship.height = (nearRobot.robotConfig ? calcRobotHeight(nearRobot.robotConfig) : 1.0) + HOVER_GAP;
                if (!this.robotControl) {
                    // minimap height = mapData.width * 4px (CELL=4, rotated 90°), plus 8px margin and 8px gap
                    const minimapHeight = this.mapWidth * 4;
                    this.robotControl = new RobotControl3D(this.scene, warMap, () => {
                        this.isRobotControlOpen = false;
                        this.triggeredRobotControlId = null;
                        this.onExit();
                    }, (action) => {
                        // Fire takes priority: don't let a direction/rotate overwrite a pending fire
                        if (this.pendingManualAction?.type === ActionType.FIRE && action.type !== ActionType.FIRE) return;
                        this.pendingManualAction = action;
                    }, 8 + minimapHeight + 8);
                }
                this.robotControl.open(nearRobot);
            }
        }
    }

    public isOpen(): boolean {
        return this.isRobotControlOpen;
    }

    public getTriggeredRobotId(): string | null {
        return this.triggeredRobotControlId;
    }

    public takePendingAction(): RobotAction | null {
        const action = this.pendingManualAction;
        this.pendingManualAction = null;
        return action;
    }
}
