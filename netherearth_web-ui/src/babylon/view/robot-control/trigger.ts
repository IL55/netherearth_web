import { Owner } from '../../game/core/warmap';
import type { WarMap, RobotObject } from '../../game/core/warmap';
import { ActionType } from '../../game/actions';
import type { RobotAction } from '../../game/actions';
import { RobotControl3D } from './robot-control-3d';
import { isRobotAlive } from './queries';
import { findRobotUnderShip, setHoverHeight, applyExitBump } from './physics';
import type * as BABYLON from '@babylonjs/core';

export class RobotControlTrigger {
    private isRobotControlOpen = false;
    private triggeredRobotControlId: string | null = null;
    private robotControl: RobotControl3D | null = null;
    private pendingManualAction: RobotAction | null = null;
    private trackedShip: { x: number; y: number; height: number } | null = null;

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
        this.trackedShip = ship;

        // ── Robot control — close if controlled robot died; track robot position ──
        if (this.isRobotControlOpen && this.robotControl && !isRobotAlive(warMap, this.triggeredRobotControlId)) {
            this.robotControl.close();
        } else if (this.isRobotControlOpen && this.robotControl) {
            // Keep ship above the controlled robot so it follows as the robot moves
            const controlled = warMap.robots.find(o => o.id === this.triggeredRobotControlId);
            if (controlled) {
                ship.x = controlled.x;
                ship.y = controlled.y;
                setHoverHeight(ship, controlled);
            }
            this.robotControl.updateDisplay();
        }

        // ── Robot control ────────────────────────────────────────────────────────
        if (!isConstructionYardOpen && !this.isRobotControlOpen) {
            const nearRobot = findRobotUnderShip(warMap, ship, Owner.RED);
            if (nearRobot && nearRobot.id !== this.triggeredRobotControlId) {
                this.triggeredRobotControlId = nearRobot.id;
                this.isRobotControlOpen = true;
                setHoverHeight(ship, nearRobot);
                if (!this.robotControl) {
                    // minimap height = mapData.width * 4px (CELL=4, rotated 90°), plus 8px margin and 8px gap
                    const minimapHeight = this.mapWidth * 4;
                    this.robotControl = new RobotControl3D(this.scene, warMap, () => {
                        this.isRobotControlOpen = false;
                        this.triggeredRobotControlId = null;
                        if (this.trackedShip) applyExitBump(this.trackedShip);
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

    public dispose(): void {
        if (this.robotControl) {
            this.robotControl.dispose();
            this.robotControl = null;
        }
    }
}
