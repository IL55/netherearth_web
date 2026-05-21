import * as BABYLON from '@babylonjs/core';
import { setVisibleAll } from '../shared/scene-utils';
import type { MapData } from '../../data/map';

export const debugLoadMap = (mapData: MapData, scene: BABYLON.Scene, mapBegin: BABYLON.Vector3) => {
    const createTextTexture = (text: string, size: number) => {
        const texture = new BABYLON.DynamicTexture('DynamicTexture', size, scene, true);
        texture.hasAlpha = true;
        texture.drawText(text, null, null, 'bold 72px Arial', 'black', 'white', true);
        return texture;
    };

    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            const plane = BABYLON.MeshBuilder.CreatePlane(`plane_${x}_${y}`, { size: 1 }, scene);
            plane.position = new BABYLON.Vector3(mapBegin.x + x, 0, mapBegin.z + y);
            plane.rotation.x = Math.PI / 2;
            plane.rotation.y = Math.PI / 2;
            const material = new BABYLON.StandardMaterial(`mat_${x}_${y}`, scene);
            material.diffuseTexture = createTextTexture(mapData.tiles[y][x], 256);
            plane.material = material;
        }
    }

    mapData.objects.forEach((obj, index) => {
        const box = BABYLON.MeshBuilder.CreateBox(`box_${index}`, { size: 0.5 }, scene);
        box.position = new BABYLON.Vector3(mapBegin.x + obj.x, 0.25, mapBegin.z + obj.y);
        box.rotation.y = Math.PI / 2;
        const material = new BABYLON.StandardMaterial(`mat_box_${index}`, scene);
        let text = obj.type;
        if (obj.subtype) text += `\n${obj.subtype}`;
        if (obj.owner) text += `\nOwner: ${obj.owner}`;
        material.diffuseTexture = createTextTexture(text, 512);
        box.material = material;
    });
};

export const debugPlaceGrass = (models: Map<string, BABYLON.AbstractMesh>, _scene: BABYLON.Scene, mapBegin: BABYLON.Vector3) => {
    const model = models.get('grass');
    if (model) {
        const instance = model.instantiateHierarchy();
        if (instance) {
            instance.position = new BABYLON.Vector3(mapBegin.x, 1, mapBegin.z);
            instance.rotation.x = Math.PI / 2;
            setVisibleAll(instance, true);
        }
    }
};
