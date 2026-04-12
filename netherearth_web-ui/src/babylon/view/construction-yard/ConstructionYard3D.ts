import * as BABYLON from '@babylonjs/core';
import { CY_LAYER_MASK, CY_PARTS, CY_LAYOUT } from './constants';
import { createTextPlane, createBackground, updateTextOnTexture } from './ui-utils';
import { createModelWrapper } from './model-utils';
import type { OwnerResources } from '../../game/resources';
import { Owner } from '../../game/core/warmap';

export class ConstructionYard3D {
    private scene: BABYLON.Scene;
    private mainCamera: BABYLON.Camera;
    private camera: BABYLON.FreeCamera;
    private light: BABYLON.HemisphericLight;
    private root: BABYLON.TransformNode;
    private renderObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
    private onExitCallback: () => void;
    private ownerResources: OwnerResources;
    private labelTextures: Map<string, BABYLON.DynamicTexture> = new Map();

    constructor(scene: BABYLON.Scene, models: Map<string, BABYLON.AbstractMesh>, ownerResources: OwnerResources, onExit: () => void) {
        this.scene = scene;
        this.mainCamera = scene.activeCamera!;
        this.onExitCallback = onExit;

        this.root = new BABYLON.TransformNode("cyRoot", scene);

        // Setup Orthographic Camera
        this.camera = new BABYLON.FreeCamera("cyCamera", new BABYLON.Vector3(0, 0, CY_LAYOUT.cameraZ), scene);
        this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.orthoTop = CY_LAYOUT.orthoHeight;
        this.camera.orthoBottom = -CY_LAYOUT.orthoHeight;
        const ratio = scene.getEngine().getRenderWidth() / scene.getEngine().getRenderHeight();
        this.camera.orthoLeft = -CY_LAYOUT.orthoHeight * ratio;
        this.camera.orthoRight = CY_LAYOUT.orthoHeight * ratio;
        this.camera.layerMask = CY_LAYER_MASK;

        // Light specifically for the UI models
        this.light = new BABYLON.HemisphericLight("cyLight", new BABYLON.Vector3(0, 1, 0), scene);
        this.light.intensity = 1.0;
        this.light.setEnabled(false);

        // Semi-transparent background
        createBackground(scene, this.root, CY_LAYOUT.bgWidth, CY_LAYOUT.bgHeight, CY_LAYER_MASK);

        this.ownerResources = ownerResources;

        // Title
        const { mesh: title } = createTextPlane(scene, "Construction Yard", 10, 2, CY_LAYER_MASK, "bold 100px Arial");
        title.parent = this.root;
        title.position = new BABYLON.Vector3(0, 10.5, 0);

        // Exit Button
        const { mesh: exitBtn } = createTextPlane(scene, "EXIT", 4, 1.5, CY_LAYER_MASK, "bold 80px Arial", "red");
        exitBtn.parent = this.root;
        exitBtn.position = new BABYLON.Vector3(0, -10.5, 0);
        
        // Add click action to Exit button
        if (!scene.actionManager) {
            scene.actionManager = new BABYLON.ActionManager(scene);
        }
        exitBtn.actionManager = new BABYLON.ActionManager(scene);
        exitBtn.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                this.close();
            })
        );

        const rotatingMeshes: BABYLON.TransformNode[] = [];

        CY_PARTS.forEach((part, index) => {
            const y = CY_LAYOUT.startY - index * CY_LAYOUT.stepY;

            // Only try to load a model if it's not the "common" resource line
            if (part.id !== 'common') {
                const wrapper = createModelWrapper(
                    scene, 
                    models, 
                    part.id, 
                    this.root, 
                    new BABYLON.Vector3(CY_LAYOUT.modelX, y, 0), 
                    CY_LAYOUT.targetScale, 
                    CY_LAYER_MASK
                );
                
                if (wrapper) {
                    rotatingMeshes.push(wrapper);
                }
            }

            // Label
            // Using a larger width and font size
            const { mesh: labelMesh, texture: dt } = createTextPlane(scene, part.label, 8, 1.5, CY_LAYER_MASK, "bold 70px Arial");
            labelMesh.parent = this.root;
            labelMesh.position = new BABYLON.Vector3(CY_LAYOUT.labelX + 1, y, 0); // Shift slightly right to accommodate larger width
            
            this.labelTextures.set(part.id, dt);
        });

        this.renderObserver = scene.onBeforeRenderObservable.add(() => {
            rotatingMeshes.forEach(m => {
                m.rotation.y += 0.02;
            });
        });
    }

    public updateLabels() {
        const redResources = this.ownerResources[Owner.RED];
        
        CY_PARTS.forEach(part => {
            const dt = this.labelTextures.get(part.id);
            if (dt) {
                const count = redResources[part.resourceType];
                const text = `${part.label} ${count}`;
                updateTextOnTexture(dt, text, "bold 70px Arial");
            }
        });
    }

    public open() {
        this.updateLabels();
        this.scene.activeCameras = [this.mainCamera, this.camera];
        this.light.setEnabled(true);
        this.root.setEnabled(true);
    }

    public close() {
        (this.scene as any).activeCameras = null;
        this.scene.activeCamera = this.mainCamera;
        this.light.setEnabled(false);
        this.root.setEnabled(false);
        this.onExitCallback();
    }

    public dispose() {
        this.close();
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
        }
        this.root.dispose();
        this.camera.dispose();
        this.light.dispose();
    }
}
