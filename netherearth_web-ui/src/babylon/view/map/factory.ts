import * as BABYLON from '@babylonjs/core';
import { setVisibleAll, setFlagColor } from '../shared/scene-utils';
import { MODEL_OVERLAY } from '../shared/model-textures';
import { Owner } from '../../game/types/owner';

const FACTORY_PARTS = [
    { model: 'highwall1', overlays: ['highwall1', 'brick-side', 'brick-z-neg', 'highwall1-top'], xo: 0, yo: 0 },
    { model: 'highwall1', overlays: ['building',  'brick-center', 'highwall1-top'],               xo: 0, yo: 1 },
    { model: 'highwall1', overlays: ['highwall1', 'brick-side', 'brick-z-pos', 'highwall1-top'], xo: 0, yo: 2 },
    { model: 'lowwall2',  overlays: ['lowwall2', 'lowwall2-front', 'lowwall2-z-neg', 'lowwall2-z-pos'], xo: 1, yo: 0 },
    { model: 'lowwall2',  overlays: ['lowwall2', 'lowwall2-front', 'lowwall2-z-neg', 'lowwall2-z-pos'], xo: 1, yo: 2 },
];

const CENTRAL_PIECE_MODEL: Record<string, string> = {
    electronics: 'e-electronics',
    missiles:    'e-missiles',
    phasers:     'e-phasers',
    nuclear:     'e-nuclear',
    chassis:     'e-tracks',
    cannons:     'e-cannon',
};

const CENTRAL_PIECE_OFFSET: Record<string, { x: number; y: number; z: number }> = {
    electronics: { x: 4.4, y: 2.1, z: -0.3 },
    missiles:    { x: 1.4, y: 2.1, z: -2.1 },
    phasers:     { x: 1.7, y: 2.0, z: -1.7 },
    nuclear:     { x: 2.6, y: 2.1, z:  0.5 },
    chassis:     { x: 6.3, y: 2.1, z: -2.4 },
    cannons:     { x: 2.4, y: 2.1, z: -3.9 },
};

// owner: 1=red (flag left), 2=blue (flag right), absent=neutral (no flag)
// Note: flag GLB model origin is not at 0,0,0 — tune xo/yo/zo per side to compensate
const FLAG_OFFSET: Record<number, { xo: number; yo: number; zo: number }> = {
    1: { xo: 0,   yo: 2, zo: 0.1 },  // red:  left wall
    2: { xo: 0,   yo: 2, zo: 2.1 },  // blue: right wall
};
const FLAG_COLOR: Record<number, BABYLON.Color3> = {
    [Owner.RED]:  new BABYLON.Color3(1, 0, 0),
    [Owner.BLUE]: new BABYLON.Color3(0, 0, 1),
};


export const addFactory = (
    models: Map<string, BABYLON.AbstractMesh>,
    mapBegin: BABYLON.Vector3,
    x: number,
    y: number,
    subtype: string,
    owner?: Owner,
) => {
    FACTORY_PARTS.forEach((part, i) => {
        const model = models.get(part.model);
        if (!model) return;

        const instance = model.instantiateHierarchy();
        if (!instance) return;

        const px = mapBegin.x + x + part.xo;
        const pz = mapBegin.z + y + part.yo;
        instance.position = new BABYLON.Vector3(px, 1, pz);
        setVisibleAll(instance, true);

        const scene = model.getScene();
        part.overlays.forEach((key, oi) => {
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
    });

    const modelName = CENTRAL_PIECE_MODEL[subtype];
    const offset = CENTRAL_PIECE_OFFSET[subtype];
    if (modelName && offset) {
        const model = models.get(modelName);
        if (model) {
            const instance = model.instantiateHierarchy();
            if (instance) {
                instance.position = new BABYLON.Vector3(mapBegin.x + x + offset.x, offset.y, mapBegin.z + y + offset.z);
                setVisibleAll(instance, true);
            }
        }
    }

    if (owner !== undefined && FLAG_OFFSET[owner] !== undefined) {
        const flagModel = models.get('flag');
        if (flagModel) {
            const instance = flagModel.clone('flag', null);
            if (instance) {
                const { xo, yo, zo } = FLAG_OFFSET[owner];
                instance.position = new BABYLON.Vector3(mapBegin.x + x + xo, yo, mapBegin.z + y + zo);
                setVisibleAll(instance, true);
                setFlagColor(instance, FLAG_COLOR[owner]);
            }
        }
    }
};
