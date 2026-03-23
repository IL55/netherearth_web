import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import type { RobotConfig } from '../../data/robot';

export type { RobotConfig } from '../../data/robot';
export { robotConfigs } from '../../data/robot';

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
    rotation = 0,
    stackGap = 0.15,
) => {
    const tx = mapBegin.x + x;
    const tz = mapBegin.z + y;

    const chassis = models.get(config.chassis);
    if (!chassis) return;
    let topY = placePart(chassis, tx, 1, tz, rotation);

    const weapon = config.weapon ? models.get(config.weapon) : undefined;
    if (weapon) topY = placePart(weapon, tx, topY, tz, rotation);

    if (config.nuclearModel) {
        const nuclearModel = models.get(config.nuclearModel);
        if (nuclearModel) topY = placePart(nuclearModel, tx, topY, tz, rotation);
    }

    // stackGap only applied before electronics to close the bounding-box padding gap
    const elec = models.get(config.electronics);
    if (elec) placePart(elec, tx, topY - stackGap, tz, rotation);
};
