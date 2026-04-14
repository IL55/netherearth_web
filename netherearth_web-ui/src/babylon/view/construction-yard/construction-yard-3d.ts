import * as BABYLON from '@babylonjs/core';
import { CY_LAYER_MASK, CY_PARTS, CY_LAYOUT, CY_FONT, ROTATION_SPEED } from './constants';
import { createTextPlane, createBackground, updateTextOnTexture } from './ui-utils';
import { createModelWrapper, createRobotPreviewWrapper } from './model-utils';
import {
    EMPTY_SELECTION,
    getSelectedPartIds,
    applyPartToggle,
    canAffordSelection,
    deductSelectionCost,
    isValidBuild,
    buildRobotConfig,
    spawnManualRobot,
    type BuildSelection,
} from './construction-yard-logic';
import type { OwnerResources } from '../../game/resources';
import { Owner } from '../../game/core/warmap';
import type { WarMap } from '../../game/core/warmap';

export class ConstructionYard3D {
    private scene: BABYLON.Scene;
    private mainCamera: BABYLON.Camera;
    private camera: BABYLON.FreeCamera;
    private light: BABYLON.HemisphericLight;
    private root: BABYLON.TransformNode;
    private renderObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
    private onExitCallback: () => void;
    private ownerResources: OwnerResources;
    private warMap: WarMap;
    private models: Map<string, BABYLON.AbstractMesh>;
    private countTextures: Map<string, BABYLON.DynamicTexture> = new Map();
    private selection: BuildSelection = { ...EMPTY_SELECTION };
    // Per-row highlight materials (keyed by part id)
    private rowHighlightMats: Map<string, BABYLON.StandardMaterial> = new Map();
    // Left-panel part models that spin continuously
    private partWrappers: BABYLON.TransformNode[] = [];
    // Right-panel dynamic preview (rebuilt on each selection change)
    private previewWrapper: BABYLON.TransformNode | null = null;
    // CREATE button — dimmed when build is not valid/affordable
    private createBtnMesh: BABYLON.Mesh | null = null;

    constructor(
        scene: BABYLON.Scene,
        models: Map<string, BABYLON.AbstractMesh>,
        ownerResources: OwnerResources,
        warMap: WarMap,
        onExit: () => void,
    ) {
        this.scene = scene;
        this.mainCamera = scene.activeCamera!;
        this.onExitCallback = onExit;
        this.ownerResources = ownerResources;
        this.warMap = warMap;
        this.models = models;

        this.root = new BABYLON.TransformNode("cyRoot", scene);

        // Orthographic camera for the UI overlay
        this.camera = new BABYLON.FreeCamera("cyCamera", new BABYLON.Vector3(0, 0, CY_LAYOUT.cameraZ), scene);
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.orthoTop = CY_LAYOUT.orthoHeight;
        this.camera.orthoBottom = -CY_LAYOUT.orthoHeight;
        const ratio = scene.getEngine().getRenderWidth() / scene.getEngine().getRenderHeight();
        this.camera.orthoLeft = -CY_LAYOUT.orthoHeight * ratio;
        this.camera.orthoRight = CY_LAYOUT.orthoHeight * ratio;
        this.camera.layerMask = CY_LAYER_MASK;

        // Dedicated light for UI models
        this.light = new BABYLON.HemisphericLight("cyLight", new BABYLON.Vector3(0, 1, 0), scene);
        this.light.intensity = 1.0;
        this.light.setEnabled(false);

        createBackground(scene, this.root, CY_LAYOUT.bgWidth, CY_LAYOUT.bgHeight, CY_LAYER_MASK);

        if (!scene.actionManager) {
            scene.actionManager = new BABYLON.ActionManager(scene);
        }

        // ── Right panel ─────────────────────────────────────────────────────
        const { mesh: title } = createTextPlane(scene, "Construction Yard", 9, 1.5, CY_LAYER_MASK, "bold 60px Arial");
        title.parent = this.root;
        title.position = new BABYLON.Vector3(CY_LAYOUT.panelX, CY_LAYOUT.panelTitleY, 0);

        const { mesh: createBtn } = createTextPlane(scene, "CREATE ROBOT", 6, 1.5, CY_LAYER_MASK, CY_FONT, "green");
        createBtn.parent = this.root;
        createBtn.position = new BABYLON.Vector3(CY_LAYOUT.panelX - 2.5, CY_LAYOUT.panelBtnY, 0);
        createBtn.actionManager = new BABYLON.ActionManager(scene);
        createBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                this.handleCreate();
            })
        );
        this.createBtnMesh = createBtn;

        const { mesh: exitBtn } = createTextPlane(scene, "EXIT", 3, 1.5, CY_LAYER_MASK, CY_FONT, "red");
        exitBtn.parent = this.root;
        exitBtn.position = new BABYLON.Vector3(CY_LAYOUT.panelX + 3.5, CY_LAYOUT.panelBtnY, 0);
        exitBtn.actionManager = new BABYLON.ActionManager(scene);
        exitBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                this.close();
            })
        );

        // ── Left panel — parts list ──────────────────────────────────────────
        CY_PARTS.forEach((part, index) => {
            const y = CY_LAYOUT.startY - index * CY_LAYOUT.stepY;
            const selectable = part.group !== 'info';

            if (part.id !== 'common') {
                const wrapper = createModelWrapper(
                    scene, models, part.id, this.root,
                    new BABYLON.Vector3(CY_LAYOUT.modelX, y, 0),
                    CY_LAYOUT.targetScale, CY_LAYER_MASK,
                );
                if (wrapper) this.partWrappers.push(wrapper);
            }

            const { mesh: labelMesh } = createTextPlane(scene, part.label, 5, 1.5, CY_LAYER_MASK, CY_FONT);
            labelMesh.parent = this.root;
            labelMesh.position = new BABYLON.Vector3(CY_LAYOUT.labelX + 1, y, 0);

            const priceText = part.cost !== null ? String(part.cost) : '';
            const { mesh: priceMesh } = createTextPlane(scene, priceText, 2, 1.5, CY_LAYER_MASK, CY_FONT);
            priceMesh.parent = this.root;
            priceMesh.position = new BABYLON.Vector3(CY_LAYOUT.priceX, y, 0);

            const { mesh: countMesh, texture: countDt } = createTextPlane(scene, "0", 2.5, 1.5, CY_LAYER_MASK, CY_FONT);
            countMesh.parent = this.root;
            countMesh.position = new BABYLON.Vector3(CY_LAYOUT.countX, y, 0);
            this.countTextures.set(part.id, countDt);

            if (selectable) {
                // Highlight / click plane — slightly in front of text (z < 0) so
                // it intercepts picks across the full row width.
                const hlMat = new BABYLON.StandardMaterial(`hlMat_${part.id}`, scene);
                hlMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
                hlMat.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2);
                hlMat.alpha = 0;
                hlMat.disableLighting = true;

                const hlMesh = BABYLON.MeshBuilder.CreatePlane(
                    `hl_${part.id}`,
                    { width: CY_LAYOUT.rowHighlightWidth, height: CY_LAYOUT.rowHighlightHeight },
                    scene,
                );
                hlMesh.parent = this.root;
                hlMesh.position = new BABYLON.Vector3(CY_LAYOUT.rowHighlightCenterX, y, -0.5);
                hlMesh.material = hlMat;
                hlMesh.layerMask = CY_LAYER_MASK;
                hlMesh.renderingGroupId = 2;

                hlMesh.actionManager = new BABYLON.ActionManager(scene);
                hlMesh.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                        this.handleRowClick(part.id);
                    })
                );

                this.rowHighlightMats.set(part.id, hlMat);
            }
        });

        this.renderObserver = scene.onBeforeRenderObservable.add(() => {
            this.partWrappers.forEach(m => { m.rotation.y += ROTATION_SPEED; });
            if (this.previewWrapper) this.previewWrapper.rotation.y += ROTATION_SPEED;
        });
    }

    // ── Selection ──────────────────────────────────────────────────────────────

    private handleRowClick(partId: string): void {
        const resources = this.ownerResources[Owner.RED];
        const proposed = applyPartToggle(this.selection, partId);
        if (!canAffordSelection(resources, proposed)) return;
        this.selection = proposed;
        this.updateSelectionVisuals();
    }

    private updateSelectionVisuals(): void {
        const selectedIds = new Set(getSelectedPartIds(this.selection));
        this.rowHighlightMats.forEach((mat, partId) => {
            mat.alpha = selectedIds.has(partId) ? 0.35 : 0;
        });
        this.rebuildPreview();
        this.updateCreateBtnState();
    }

    private rebuildPreview(): void {
        if (this.previewWrapper) {
            this.previewWrapper.dispose();
            this.previewWrapper = null;
        }
        const partIds = getSelectedPartIds(this.selection);
        if (partIds.length === 0) return;
        this.previewWrapper = createRobotPreviewWrapper(
            this.scene, this.models, partIds, this.root,
            new BABYLON.Vector3(CY_LAYOUT.panelX, CY_LAYOUT.panelRobotY, 0),
            CY_LAYOUT.panelRobotScale, CY_LAYER_MASK,
        );
    }

    private updateCreateBtnState(): void {
        if (!this.createBtnMesh) return;
        const resources = this.ownerResources[Owner.RED];
        const enabled = isValidBuild(this.selection) && canAffordSelection(resources, this.selection);
        (this.createBtnMesh.material as BABYLON.StandardMaterial).alpha = enabled ? 1.0 : 0.3;
        this.createBtnMesh.isPickable = enabled;
    }

    private handleCreate(): void {
        const resources = this.ownerResources[Owner.RED];
        if (!isValidBuild(this.selection) || !canAffordSelection(resources, this.selection)) return;
        const config = buildRobotConfig(this.selection);
        if (!config) return;
        deductSelectionCost(resources, this.selection);
        spawnManualRobot(this.warMap, config, Owner.RED);
        this.close();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public updateLabels(): void {
        const redResources = this.ownerResources[Owner.RED];
        CY_PARTS.forEach(part => {
            const dt = this.countTextures.get(part.id);
            if (dt) {
                const count = redResources[part.resourceType];
                updateTextOnTexture(dt, String(count), CY_FONT);
            }
        });
    }

    public open(): void {
        this.selection = { ...EMPTY_SELECTION };
        this.updateLabels();
        this.updateSelectionVisuals();
        this.scene.activeCameras = [this.mainCamera, this.camera];
        this.light.setEnabled(true);
        this.root.setEnabled(true);
    }

    public close(): void {
        (this.scene as any).activeCameras = null;
        this.scene.activeCamera = this.mainCamera;
        this.light.setEnabled(false);
        this.root.setEnabled(false);
        this.onExitCallback();
    }

    public dispose(): void {
        this.close();
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
        }
        this.root.dispose();
        this.camera.dispose();
        this.light.dispose();
    }
}
