import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import { Chassis, Weapon, Electronics, WEAPON_RENDER_ORDER } from '../../data/robot';
import type { RobotConfig } from '../../data/robot';
import { Owner } from '../../game/types/owner';

export type { RobotConfig } from '../../data/robot';
export { robotConfigs } from '../../data/robot';

// Team prefix used in model file names: 'h-' for BLUE, 'e-' for RED (or neutral).
function teamPrefix(owner: Owner): string {
    return owner === Owner.RED ? 'e-' : 'h-';
}

// Explicit mapping from enum value to model file name suffix.
// Decoupled from enum string value so the two can diverge independently.
const CHASSIS_MODEL: Record<Chassis, string> = {
    [Chassis.TRACKS]:   'tracks',
    [Chassis.ANTIGRAV]: 'antigrav',
    [Chassis.BIPOD]:    'bipod',
};

const WEAPON_MODEL: Record<Weapon, string> = {
    [Weapon.CANNON]:   'cannon',
    [Weapon.MISSILES]: 'missiles',
    [Weapon.PHASERS]:  'phasers',
};

const ELECTRONICS_MODEL: Record<Electronics, string> = {
    [Electronics.STANDARD]: 'electronics',
};

// Places one model part at groundY, centers it on XZ, returns the top Y for the next part.
// stackGap is subtracted from the returned topY to account for bounding box padding above visible geometry.
const placePart = (model: BABYLON.AbstractMesh, tx: number, groundY: number, tz: number, rotation: number, stackGap = 0): number => {
    const instance = model.instantiateHierarchy();
    if (!instance) return groundY;

    instance.position.set(tx, groundY, tz);
    instance.rotation.set(0, rotation, 0);
    setVisibleAll(instance, true);
    instance.computeWorldMatrix(true);

    const childMeshes = instance.getChildMeshes(false);
    if (childMeshes.length === 0) return groundY;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    childMeshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        const bb = mesh.getBoundingInfo().boundingBox;
        minX = Math.min(minX, bb.minimumWorld.x);
        maxX = Math.max(maxX, bb.maximumWorld.x);
        minY = Math.min(minY, bb.minimumWorld.y);
        maxY = Math.max(maxY, bb.maximumWorld.y);
        minZ = Math.min(minZ, bb.minimumWorld.z);
        maxZ = Math.max(maxZ, bb.maximumWorld.z);
    });

    instance.position.x += tx - (minX + maxX) / 2;
    instance.position.y += groundY - minY;
    instance.position.z += tz - (minZ + maxZ) / 2;

    return groundY + (maxY - minY) - stackGap;
};

export const placeRobot = (
    models: Map<string, BABYLON.AbstractMesh>,
    mapBegin: BABYLON.Vector3,
    x: number,
    y: number,
    config: RobotConfig,
    owner: Owner,
    rotation = 0,
    stackGap = 0.15,
) => {
    const prefix = teamPrefix(owner);
    const tx = mapBegin.x + x;
    const tz = mapBegin.z + y;

    const chassis = models.get(prefix + CHASSIS_MODEL[config.chassis]);
    if (!chassis) return;
    let topY = placePart(chassis, tx, 1, tz, rotation);

    for (const w of WEAPON_RENDER_ORDER) {
        if (!(config.weapons ?? []).includes(w)) continue;
        const model = models.get(prefix + WEAPON_MODEL[w]);
        if (model) topY = placePart(model, tx, topY, tz, rotation);
    }

    if (config.nuclear) {
        const nuclear = models.get(prefix + 'nuclear');
        if (nuclear) topY = placePart(nuclear, tx, topY, tz, rotation);
    }

    if (config.electronics) {
        // stackGap only applied before electronics to close the bounding-box padding gap
        const elec = models.get(prefix + ELECTRONICS_MODEL[config.electronics]);
        if (elec) placePart(elec, tx, topY - stackGap, tz, rotation);
    }
};
