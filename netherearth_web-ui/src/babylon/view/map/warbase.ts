import * as BABYLON from '@babylonjs/core';
import { setVisibleAll, setFlagColor } from '../shared/scene-utils';
import { MODEL_OVERLAY } from '../shared/model-textures';
import { Owner } from '../../game/types/owner';

const B   = 'warbase-brick-back';
const BF  = 'warbase-front';
const ZN  = 'warbase-brick-z-neg';
const ZP  = 'warbase-brick-z-pos';
const LW  = ['warbase-lw-back', 'warbase-lw-front', 'warbase-lw-z-neg', 'warbase-lw-z-pos'];
const LWT = [...LW, 'warbase-lw-top'];
const HP  = ['warbase-hp-front', 'warbase-hp-z-neg', 'warbase-hp-z-pos'];

const WARBASE_PARTS = [
    { model: 'highwall1', overlays: [B, ZN, ZP],                  xo: 0.5, yo: 0 }, { model: 'highwall2', overlays: [B, BF, ZN, ZP], xo: 1.5, yo: 0 },
    { model: 'highwall1', overlays: [B, ZN, ZP],      xo: 0,   yo: 1 }, { model: 'lowwall1',  overlays: LW, xo: 1, yo: 1 }, { model: 'lowwall1', overlays: LW, xo: 2, yo: 1 }, { model: 'lowwall2', overlays: LWT, xo: 3, yo: 1 },
    { model: 'highwall1', overlays: [B, ZN, ZP],      xo: 0.5, yo: 2 }, { model: 'warbase', overlays: HP, xo: 1.5, yo: 2 }, { model: 'lowwall2', overlays: LW, xo: 2.5, yo: 2 },
    { model: 'highwall1', overlays: [B, ZN, ZP],      xo: 0,   yo: 3 }, { model: 'lowwall1',  overlays: LW, xo: 1, yo: 3 }, { model: 'lowwall1', overlays: LW, xo: 2, yo: 3 }, { model: 'lowwall2', overlays: LWT, xo: 3, yo: 3 },
    { model: 'highwall1', overlays: [B, ZN, ZP],                  xo: 0.5, yo: 4 }, { model: 'highwall2', overlays: [B, BF, ZN, ZP], xo: 1.5, yo: 4 },
];

// owner: 1=red (flag left = low Z), 2=blue (flag right = high Z); xo=1.5 is center of structure
// Note: the flag GLB model origin is not at 0,0,0 — offsets are tuned visually to compensate
const FLAG_OFFSET: Record<number, { xo: number; zo: number }> = {
    1: { xo: 0.5, zo: 0.1 },  // RED:  back wall, left side
    2: { xo: 0.5, zo: 4.1 },  // BLUE: back wall, right side
};
const OWNER_TEXTURE: Record<number, string> = { 1: 'warbaser1.bmp' };
const FLAG_COLOR: Record<number, BABYLON.Color3> = {
    [Owner.RED]:  new BABYLON.Color3(1, 0, 0),
    [Owner.BLUE]: new BABYLON.Color3(0, 0, 1),
};

export const addWarbase = (
    models: Map<string, BABYLON.AbstractMesh>,
    scene: BABYLON.Scene,
    mapBegin: BABYLON.Vector3,
    x: number,
    y: number,
    owner?: Owner,
) => {
    WARBASE_PARTS.forEach((part, i) => {
        const model = models.get(part.model);
        if (!model) return;
        const instance = model.instantiateHierarchy();
        if (!instance) return;

        const px = mapBegin.x + x + part.xo;
        const pz = mapBegin.z + y + part.yo;
        instance.position = new BABYLON.Vector3(px, 1, pz);
        setVisibleAll(instance, true);

        if (part.model === 'warbase' && owner === Owner.RED && OWNER_TEXTURE[Owner.RED]) {
            const decalMaterial = new BABYLON.StandardMaterial(`decalMat_${owner}`, scene);
            decalMaterial.diffuseTexture = new BABYLON.Texture(`${import.meta.env.BASE_URL}models/textures/${OWNER_TEXTURE[1]}`, scene);
            decalMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            decalMaterial.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.01);
            decalMaterial.zOffset = -2;

            const decal = BABYLON.MeshBuilder.CreatePlane('decal', { size: 0.8 }, scene);
            decal.material = decalMaterial;
            decal.position = new BABYLON.Vector3(px, 2, pz);
            decal.rotation.x = Math.PI / 2;
        }

        if ('overlays' in part) {
            (part.overlays as string[]).forEach((key, oi) => {
                const cfg = MODEL_OVERLAY[key];
                if (!cfg) return;

                const mat = new BABYLON.StandardMaterial(`${part.model}_ov${oi}_${x}_${y}_${i}`, scene);
                const tex = new BABYLON.Texture(cfg.texture, scene);
                if (cfg.texRot) tex.wAng = cfg.texRot;
                mat.diffuseTexture = tex;
                const b = cfg.brightness ?? 1;
                mat.diffuseColor = new BABYLON.Color3(b, b, b);
                mat.specularColor = new BABYLON.Color3(0, 0, 0);
                mat.backFaceCulling = false;
                mat.zOffset = -2;

                const plane = BABYLON.MeshBuilder.CreatePlane(`${part.model}_ov${oi}_plane_${x}_${y}_${i}`, { width: cfg.w, height: cfg.h }, scene);
                plane.material = mat;
                plane.rotation.set(cfg.rx, cfg.ry, cfg.rz);
                plane.position = new BABYLON.Vector3(px + cfg.dx, 1 + cfg.dy, pz + cfg.dz);
            });
        }
    });

    if (owner !== undefined && FLAG_OFFSET[owner] !== undefined) {
        const flagModel = models.get('flag');
        if (flagModel) {
            const instance = flagModel.clone('flag', null);
            if (instance) {
                const { xo, zo } = FLAG_OFFSET[owner];
                instance.position = new BABYLON.Vector3(mapBegin.x + x + xo, 2, mapBegin.z + y + zo);
                setVisibleAll(instance, true);
                setFlagColor(instance, FLAG_COLOR[owner]);
            }
        }
    }
};
