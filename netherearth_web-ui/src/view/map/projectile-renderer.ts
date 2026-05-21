

import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import type { WarMap, Projectile } from "../../game/core/warmap";
import { WeaponType } from '../../game/core/warmap';

const BULLET_MODEL: Record<WeaponType, string> = {
    cannon:  'bullet1',
    missile: 'bullet2',
    phaser:  'bullet3',
};

const HEIGHT = 1.5;

// Perpendicular offset (world units) between the two parallel missile instances.
const MISSILE_SPREAD = 0.2;

// Orient projectile along its direction of travel.
// rotation.y=0 → East (lower map.x); matches directionToRotation convention.
function travelRotationY(fromX: number, fromY: number, toX: number, toY: number): number {
    return Math.atan2(-(toY - fromY), -(toX - fromX));
}

// Perpendicular unit vector in the XZ plane (90° CCW from travel direction).
function perpendicular(fromX: number, fromY: number, toX: number, toY: number): { px: number; pz: number } {
    const dx = toX - fromX;
    const dz = toY - fromY;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    return { px: -dz / len, pz: dx / len };
}

function spawnInstance(
    model: BABYLON.AbstractMesh,
    rotY: number,
    rotX: number,
    rotZ = 0,
): BABYLON.TransformNode | null {
    const inst = model.instantiateHierarchy();
    if (!inst) return null;
    // GLB models use rotationQuaternion internally; null it so Euler rotation takes effect.
    inst.rotationQuaternion = null;
    inst.rotation.set(rotX, rotY, rotZ);
    setVisibleAll(inst, true);
    return inst;
}

export class ProjectileRenderer {
    // projectile id → one or two transform nodes
    private instances = new Map<string, BABYLON.TransformNode[]>();

    constructor(
        private models: Map<string, BABYLON.AbstractMesh>,
        private mapBegin: BABYLON.Vector3,
    ) {}

    render(warMap: WarMap): void {
        const active = new Set<string>();

        for (const p of warMap.projectiles ?? []) {
            active.add(p.id);

            const wx = this.mapBegin.x + p.fromX + (p.toX - p.fromX) * p.progress;
            const wz = this.mapBegin.z + p.fromY + (p.toY - p.fromY) * p.progress;

            let nodes = this.instances.get(p.id);
            if (!nodes) {
                nodes = this.createInstances(p);
                if (nodes.length === 0) continue;
                this.instances.set(p.id, nodes);
            }

            this.updatePositions(p, nodes, wx, wz);
        }

        for (const [id, nodes] of this.instances) {
            if (!active.has(id)) {
                nodes.forEach(n => n.dispose());
                this.instances.delete(id);
            }
        }
    }

    private createInstances(p: Projectile): BABYLON.TransformNode[] {
        const model = this.models.get(BULLET_MODEL[p.weaponType]);
        if (!model) return [];

        const rotY = travelRotationY(p.fromX, p.fromY, p.toX, p.toY);

        if (p.weaponType === WeaponType.MISSILE) {
            // Two parallel missiles, tilted π/2 around X to lay flat, flipped π to face forward.
            const a = spawnInstance(model, rotY + Math.PI, Math.PI / 2);
            const b = spawnInstance(model, rotY + Math.PI, Math.PI / 2);
            return [a, b].filter((n): n is BABYLON.TransformNode => n !== null);
        }

        if (p.weaponType === WeaponType.PHASER) {
            const inst = spawnInstance(model, rotY + Math.PI / 2, 0);
            return inst ? [inst] : [];
        }

        if (p.weaponType === WeaponType.CANNON) {
            // Two parallel cannon balls.
            const a = spawnInstance(model, rotY, 0);
            const b = spawnInstance(model, rotY, 0);
            return [a, b].filter((n): n is BABYLON.TransformNode => n !== null);
        }

        const inst = spawnInstance(model, rotY, 0);
        return inst ? [inst] : [];
    }

    private updatePositions(
        p: Projectile,
        nodes: BABYLON.TransformNode[],
        wx: number,
        wz: number,
    ): void {
        if (nodes.length === 2) {
            const { px, pz } = perpendicular(p.fromX, p.fromY, p.toX, p.toY);
            nodes[0].position.set(wx + px * MISSILE_SPREAD, HEIGHT, wz + pz * MISSILE_SPREAD);
            nodes[1].position.set(wx - px * MISSILE_SPREAD, HEIGHT, wz - pz * MISSILE_SPREAD);
        } else {
            nodes[0].position.set(wx, HEIGHT, wz);
        }
    }

    dispose(): void {
        for (const nodes of this.instances.values()) nodes.forEach(n => n.dispose());
        this.instances.clear();
    }
}
