import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import { addFactory } from './factory';
import { addWarbase } from './warbase';
import { placeRobot } from './robot';
import type { WarMap, WarObject } from '../../game/warmap';

const TILE_MODELS: Record<string, string> = {
    G: 'grass', S: 'sand', S2: 'sand1', M: 'mountains',
    H1: 'hole1', H2: 'hole2', H3: 'hole3', H4: 'hole4', H5: 'hole5', H6: 'hole6',
};

const WALL_MODELS: Record<string, string> = {
    wall1: 'lowwall1', wall2: 'lowwall2', wall3: 'lowwall3',
    wall4: 'highwall1', wall5: 'highwall2', wall6: 'highwall2',
};

interface InstanceRecord {
    nodes: BABYLON.TransformNode[];
    meshes: BABYLON.AbstractMesh[];
}

// Renders a WarMap into a BabylonJS scene.
// Only re-draws objects whose state has changed since the last render call.
export class Renderer {
    private instances = new Map<string, InstanceRecord>();
    private stateCache = new Map<string, string>();

    constructor(
        private models: Map<string, BABYLON.AbstractMesh>,
        private scene: BABYLON.Scene,
        private mapBegin: BABYLON.Vector3,
    ) {}

    render(warMap: WarMap): void {
        const currentIds = new Set(warMap.objects.map(o => o.id));

        warMap.objects.forEach(obj => {
            const state = JSON.stringify(obj);
            if (this.stateCache.get(obj.id) === state) return; // unchanged, skip

            this.disposeObject(obj.id);

            const nodesBefore = this.scene.transformNodes.length;
            const meshesBefore = this.scene.meshes.length;

            this.drawObject(obj);

            this.instances.set(obj.id, {
                nodes: this.scene.transformNodes.slice(nodesBefore),
                meshes: this.scene.meshes.slice(meshesBefore),
            });
            this.stateCache.set(obj.id, state);
        });

        // remove instances for objects no longer in the map
        for (const id of [...this.instances.keys()]) {
            if (!currentIds.has(id)) this.disposeObject(id);
        }
    }

    private disposeObject(id: string): void {
        const record = this.instances.get(id);
        if (!record) return;
        record.nodes.forEach(n => n.dispose());
        record.meshes.forEach(m => { if (!m.isDisposed()) m.dispose(); });
        this.instances.delete(id);
        this.stateCache.delete(id);
    }

    private drawObject(obj: WarObject): void {
        if (obj.type === 'tile') {
            const modelName = TILE_MODELS[obj.subtype ?? ''];
            const model = modelName ? this.models.get(modelName) : undefined;
            if (model) {
                const instance = model.instantiateHierarchy();
                if (instance) {
                    instance.position = new BABYLON.Vector3(this.mapBegin.x + obj.x, 1, this.mapBegin.z + obj.y);
                    setVisibleAll(instance, true);
                }
            }
        } else if (obj.type === 'factory') {
            addFactory(this.models, this.mapBegin, obj.x, obj.y, obj.subtype!, obj.owner);
        } else if (obj.type === 'warbase') {
            addWarbase(this.models, this.scene, this.mapBegin, obj.x, obj.y, obj.owner);
        } else if (obj.type === 'robot') {
            // Death blink: hide on odd ticks, show on even ticks
            if (obj.dyingTicks !== undefined && obj.dyingTicks % 2 === 1) return;
            if (obj.robotConfig) {
                placeRobot(this.models, this.mapBegin, obj.x, obj.y, obj.robotConfig, obj.rotation ?? 0);
            }
        } else {
            // wall, fence, or any other placed model
            const modelName = WALL_MODELS[obj.type] ?? obj.type;
            const model = this.models.get(modelName);
            if (model) {
                const instance = model.instantiateHierarchy();
                if (instance) {
                    instance.position = new BABYLON.Vector3(this.mapBegin.x + obj.x, 1, this.mapBegin.z + obj.y);
                    setVisibleAll(instance, true);
                }
            }
        }
    }

    dispose(): void {
        for (const id of [...this.instances.keys()]) {
            this.disposeObject(id);
        }
    }
}
