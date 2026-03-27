import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import { Owner } from '../../game/owner';

const WARBASE_PARTS = [
    { model: 'highwall1', xo: 0.5, yo: 0 }, { model: 'highwall2', xo: 1.5, yo: 0 },
    { model: 'highwall1', xo: 0,   yo: 1 }, { model: 'lowwall1',  xo: 1,   yo: 1 }, { model: 'lowwall1', xo: 2, yo: 1 }, { model: 'lowwall2', xo: 3, yo: 1 },
    { model: 'highwall1', xo: 0.5, yo: 2 }, { model: 'warbase',   xo: 1.5, yo: 2 }, { model: 'lowwall2', xo: 2.5, yo: 2 },
    { model: 'highwall1', xo: 0,   yo: 3 }, { model: 'lowwall1',  xo: 1,   yo: 3 }, { model: 'lowwall1', xo: 2, yo: 3 }, { model: 'lowwall2', xo: 3, yo: 3 },
    { model: 'highwall1', xo: 0.5, yo: 4 }, { model: 'highwall2', xo: 1.5, yo: 4 },
];

// owner: 1=red (flag left = low Z), 2=blue (flag right = high Z); xo=1.5 is center of structure
// Note: the flag GLB model origin is not at 0,0,0 — offsets are tuned visually to compensate
const FLAG_OFFSET: Record<number, { xo: number; zo: number }> = {
    1: { xo: 0.5, zo: 0.1 },  // RED:  back wall, left side
    2: { xo: 0.5, zo: 4.1 },  // BLUE: back wall, right side
};
const OWNER_TEXTURE: Record<number, string> = { 1: 'warbaser1.bmp' };

export const addWarbase = (
    models: Map<string, BABYLON.AbstractMesh>,
    scene: BABYLON.Scene,
    mapBegin: BABYLON.Vector3,
    x: number,
    y: number,
    owner?: Owner,
) => {
    WARBASE_PARTS.forEach(part => {
        const model = models.get(part.model);
        if (!model) return;
        const instance = model.instantiateHierarchy();
        if (!instance) return;

        instance.position = new BABYLON.Vector3(mapBegin.x + x + part.xo, 1, mapBegin.z + y + part.yo);
        setVisibleAll(instance, true);

        if (part.model === 'warbase' && owner === Owner.RED && OWNER_TEXTURE[Owner.RED]) {
            const decalMaterial = new BABYLON.StandardMaterial(`decalMat_${owner}`, scene);
            decalMaterial.diffuseTexture = new BABYLON.Texture(`/models/textures/${OWNER_TEXTURE[1]}`, scene);
            decalMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            decalMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            decalMaterial.zOffset = -2;

            const decal = BABYLON.MeshBuilder.CreatePlane('decal', { size: 0.8 }, scene);
            decal.material = decalMaterial;
            decal.position = new BABYLON.Vector3(mapBegin.x + x + part.xo, 2, mapBegin.z + y + part.yo);
            decal.rotation.x = Math.PI / 2;
        }
    });

    if (owner !== undefined && FLAG_OFFSET[owner] !== undefined) {
        const flagModel = models.get('flag');
        if (flagModel) {
            const instance = flagModel.instantiateHierarchy();
            if (instance) {
                const { xo, zo } = FLAG_OFFSET[owner];
                instance.position = new BABYLON.Vector3(mapBegin.x + x + xo, 2, mapBegin.z + y + zo);
                setVisibleAll(instance, true);
            }
        }
    }
};
