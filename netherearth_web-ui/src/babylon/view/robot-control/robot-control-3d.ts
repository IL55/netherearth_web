import * as BABYLON from '@babylonjs/core';
import { RC_LAYER_MASK, RC_FONT, RC_LAYOUT } from './constants';
import { cycleRobotGoal, setManualControl, getGoalLabel, getRobotDescription } from './robot-control-logic';
import { createTextPlane, createBackground, updateTextOnTexture } from '../construction-yard/ui-utils';
import type { RobotObject } from '../../game/core/warmap';

export class RobotControl3D {
    private scene: BABYLON.Scene;
    private mainCamera: BABYLON.Camera;
    private camera: BABYLON.FreeCamera;
    private root: BABYLON.TransformNode;
    private onExitCallback: () => void;
    private currentRobot: RobotObject | null = null;
    private descTexture: BABYLON.DynamicTexture;
    private goalTexture: BABYLON.DynamicTexture;

    constructor(scene: BABYLON.Scene, onExit: () => void) {
        this.scene = scene;
        this.mainCamera = scene.activeCamera!;
        this.onExitCallback = onExit;

        this.root = new BABYLON.TransformNode("rcRoot", scene);

        // Orthographic camera for the left-panel overlay
        this.camera = new BABYLON.FreeCamera(
            "rcCamera",
            new BABYLON.Vector3(0, 0, RC_LAYOUT.cameraZ),
            scene,
        );
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.orthoTop    =  RC_LAYOUT.orthoHeight;
        this.camera.orthoBottom = -RC_LAYOUT.orthoHeight;
        const ratio = scene.getEngine().getRenderWidth() / scene.getEngine().getRenderHeight();
        this.camera.orthoLeft  = -RC_LAYOUT.orthoHeight * ratio;
        this.camera.orthoRight =  RC_LAYOUT.orthoHeight * ratio;
        this.camera.layerMask = RC_LAYER_MASK;

        // Left-strip semi-transparent background
        const bg = createBackground(scene, this.root, RC_LAYOUT.bgWidth, RC_LAYOUT.bgHeight, RC_LAYER_MASK);
        bg.position.x = RC_LAYOUT.bgX;
        bg.position.y = RC_LAYOUT.bgY;

        if (!scene.actionManager) {
            scene.actionManager = new BABYLON.ActionManager(scene);
        }

        // ── Static labels ────────────────────────────────────────────────────
        const { mesh: title } = createTextPlane(scene, "Robot Control", 8, 1.5, RC_LAYER_MASK, "bold 60px Arial");
        title.parent = this.root;
        title.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.titleY, 0);

        // ── Dynamic: robot description ───────────────────────────────────────
        const { mesh: descMesh, texture: descTex } = createTextPlane(scene, "", 8, 1.5, RC_LAYER_MASK, RC_FONT);
        descMesh.parent = this.root;
        descMesh.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.infoY, 0);
        this.descTexture = descTex;

        // ── Dynamic: current goal ────────────────────────────────────────────
        const { mesh: goalMesh, texture: goalTex } = createTextPlane(scene, "", 8, 1.5, RC_LAYER_MASK, RC_FONT);
        goalMesh.parent = this.root;
        goalMesh.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.goalLabelY, 0);
        this.goalTexture = goalTex;

        // ── CHANGE ORDER button ──────────────────────────────────────────────
        const { mesh: changeBtn } = createTextPlane(
            scene, "CHANGE ORDER", 8, 1.5, RC_LAYER_MASK, RC_FONT, "blue",
        );
        changeBtn.parent = this.root;
        changeBtn.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.changeOrderBtnY, 0);
        changeBtn.actionManager = new BABYLON.ActionManager(scene);
        changeBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (!this.currentRobot) return;
                cycleRobotGoal(this.currentRobot);
                updateTextOnTexture(this.goalTexture, this.goalText(), RC_FONT);
            }),
        );

        // ── MANUAL CONTROL button ────────────────────────────────────────────
        const { mesh: manualBtn } = createTextPlane(
            scene, "MANUAL CONTROL", 8, 1.5, RC_LAYER_MASK, RC_FONT, "orange",
        );
        manualBtn.parent = this.root;
        manualBtn.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.manualControlBtnY, 0);
        manualBtn.actionManager = new BABYLON.ActionManager(scene);
        manualBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (!this.currentRobot) return;
                setManualControl(this.currentRobot);
                this.close();
            }),
        );

        // ── EXIT button ──────────────────────────────────────────────────────
        const { mesh: exitBtn } = createTextPlane(scene, "EXIT", 3, 1.5, RC_LAYER_MASK, RC_FONT, "red");
        exitBtn.parent = this.root;
        exitBtn.position = new BABYLON.Vector3(RC_LAYOUT.panelX, RC_LAYOUT.exitBtnY, 0);
        exitBtn.actionManager = new BABYLON.ActionManager(scene);
        exitBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                this.close();
            }),
        );

        this.root.setEnabled(false);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private goalText(): string {
        return `GOAL: ${getGoalLabel(this.currentRobot?.goal)}`;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public open(robot: RobotObject): void {
        this.currentRobot = robot;
        updateTextOnTexture(this.descTexture, getRobotDescription(robot.robotConfig), RC_FONT);
        updateTextOnTexture(this.goalTexture, this.goalText(), RC_FONT);
        this.scene.activeCameras = [this.mainCamera, this.camera];
        this.root.setEnabled(true);
    }

    public close(): void {
        (this.scene as any).activeCameras = null;
        this.scene.activeCamera = this.mainCamera;
        this.root.setEnabled(false);
        this.currentRobot = null;
        this.onExitCallback();
    }

    public dispose(): void {
        this.close();
        this.root.dispose();
        this.camera.dispose();
    }
}
