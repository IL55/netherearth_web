import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';

const FACTORY_PARTS = [
    { model: 'highwall1', xo: 0, yo: 0 },
    { model: 'highwall1', xo: 0, yo: 1 },
    { model: 'highwall1', xo: 0, yo: 2 },
    { model: 'lowwall2',  xo: 1, yo: 0 },
    { model: 'lowwall2',  xo: 1, yo: 2 },
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

export const addFactory = (
    models: Map<string, BABYLON.AbstractMesh>,
    mapBegin: BABYLON.Vector3,
    x: number,
    y: number,
    subtype: string,
    flagSide?: string,
) => {
    FACTORY_PARTS.forEach(part => {
        const model = models.get(part.model);
        if (model) {
            const instance = model.instantiateHierarchy();
            if (instance) {
                instance.position = new BABYLON.Vector3(mapBegin.x + x + part.xo, 1, mapBegin.z + y + part.yo);
                setVisibleAll(instance, true);
            }
        }
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

    if (flagSide === 'left' || flagSide === 'right') {
        const flagModel = models.get('flag');
        if (flagModel) {
            const instance = flagModel.instantiateHierarchy();
            if (instance) {
                const xo = flagSide === 'left' ? 0 : 1;
                instance.position = new BABYLON.Vector3(mapBegin.x + x + xo, 2, mapBegin.z + y + 1);
                setVisibleAll(instance, true);
            }
        }
    }
};
