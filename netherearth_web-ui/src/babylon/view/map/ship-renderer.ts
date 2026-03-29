import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import type { ShipState } from '../../game/ship';

// Renders the player-controlled ship.
// On first call the GLB geometry is measured: scaled so the XZ footprint is 1×1 (same as a
// robot tile), centered in XZ on the game position, and offset in Y so the model bottom sits
// exactly at ship.height (i.e. height=1 → ship rests on the ground tile at world Y=1).
// Subsequent calls just update position — no dispose/recreate needed.
export class ShipRenderer {
    private instance: BABYLON.TransformNode | null = null;
    // Offsets applied to inst.position every frame so the ship is visually centred on (x,y)
    // and its underside is at ship.height.
    private xOffset = 0;
    private zOffset = 0;
    private yOffset = 0;

    constructor(
        private models: Map<string, BABYLON.AbstractMesh>,
        private mapBegin: BABYLON.Vector3,
    ) {}

    render(ship: ShipState): void {
        if (this.instance) {
            this.instance.position.set(
                this.mapBegin.x + ship.x + this.xOffset,
                ship.height       + this.yOffset,
                this.mapBegin.z + ship.y + this.zOffset,
            );
            return;
        }

        const model = this.models.get('ship');
        if (!model) {
            console.warn('[ShipRenderer] ship.glb not loaded');
            return;
        }
        const inst = model.instantiateHierarchy();
        if (!inst) return;

        // Place at world origin to get an unbiased bounding box.
        inst.position.set(0, 0, 0);
        setVisibleAll(inst, true);
        inst.computeWorldMatrix(true);

        // Collect all geometry meshes — children first, fall back to root if it is a mesh.
        const childMeshes = inst.getChildMeshes(false);
        const meshes: BABYLON.AbstractMesh[] = childMeshes.length > 0
            ? childMeshes
            : inst instanceof BABYLON.AbstractMesh ? [inst] : [];

        if (meshes.length > 0) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity;
            let minZ = Infinity, maxZ = -Infinity;

            for (const m of meshes) {
                m.computeWorldMatrix(true);
                const bb = m.getBoundingInfo().boundingBox;
                minX = Math.min(minX, bb.minimumWorld.x); maxX = Math.max(maxX, bb.maximumWorld.x);
                minY = Math.min(minY, bb.minimumWorld.y);
                minZ = Math.min(minZ, bb.minimumWorld.z); maxZ = Math.max(maxZ, bb.maximumWorld.z);
            }

            const xzSize = Math.max(maxX - minX, maxZ - minZ);
            if (xzSize > 0) {
                // Scale so the largest XZ dimension equals 1 game unit.
                const scaleAdj = 1.0 / xzSize;
                inst.scaling.scaleInPlace(scaleAdj);

                // After scaling, geometry positions shrink by scaleAdj relative to origin.
                this.xOffset = -((minX + maxX) / 2) * scaleAdj;   // centre X on game x
                this.zOffset = -((minZ + maxZ) / 2) * scaleAdj;   // centre Z on game y
                this.yOffset = -(minY * scaleAdj);                 // bottom at ship.height
            }
        }

        inst.position.set(
            this.mapBegin.x + ship.x + this.xOffset,
            ship.height       + this.yOffset,
            this.mapBegin.z + ship.y + this.zOffset,
        );
        this.instance = inst;
    }

    dispose(): void {
        this.instance?.dispose();
        this.instance = null;
    }
}
