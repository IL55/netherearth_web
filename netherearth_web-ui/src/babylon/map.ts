import * as BABYLON from '@babylonjs/core';

export interface MapData {
    width: number;
    height: number;
    tiles: string[][];
    objects: { type: string; x: number; y: number; [key: string]: any }[];
}

const setVisibleAll = (node: BABYLON.Node, visible: boolean) => {
    if (node instanceof BABYLON.AbstractMesh) {
        node.isVisible = visible;
    }
    node.getChildren().forEach(child => setVisibleAll(child, visible));
}

export const loadMap = async (url: string): Promise<MapData> => {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const width = parseInt(lines[0]);
    const height = parseInt(lines[1]);

    const tiles: string[][] = [];
    for (let i = 0; i < height; i++) {
        tiles.push(lines[i + 2].split(' '));
    }

    const objects: { type: string; x: number; y: number; [key: string]: any }[] = [];
    for (let i = height + 2; i < lines.length; i++) {
        const parts = lines[i].split(' ');
        const type = parts[0];
        if (type === 'fence' || type.startsWith('wall')) {
            objects.push({
                type,
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2])
            });
        } else if (type === 'factory') {
            objects.push({
                type,
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                subtype: parts[3]
            });
        } else if (type === 'warbase') {
            objects.push({
                type,
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                owner: parseInt(parts[3])
            });
        }
    }

    return { width, height, tiles, objects };
};

export const createMap = (mapData: MapData, models: Map<string, BABYLON.AbstractMesh>, scene: BABYLON.Scene, mapBegin: BABYLON.Vector3) => {
    const tileMapping: { [key: string]: string } = {
        'G': 'grass',
        'S': 'sand',
        'S2': 'sand1',
        'M': 'mountains',
        'H1': 'hole1',
        'H2': 'hole2',
        'H3': 'hole3',
        'H4': 'hole4',
        'H5': 'hole5',
        'H6': 'hole6',
    };

    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            const tile = mapData.tiles[y][x];
            const modelName = tileMapping[tile];
            if (modelName) {
                const model = models.get(modelName);
                if (model) {
                    const instance = model.instantiateHierarchy();
                    if (instance) {
                        instance.position = new BABYLON.Vector3(mapBegin.x + x, 0, mapBegin.z + y);
                        instance.position.y += 1;
                        setVisibleAll(instance, true);
                    }
                }
            }
        }
    }

    mapData.objects.forEach(obj => {
        if (obj.type === 'factory') {
            // Replicate factory structure from original game (maps.cpp)
            const factoryParts = [
                { model: 'highwall1', xo: 0, yo: 0 },
                { model: 'highwall1', xo: 0, yo: 1 },
                { model: 'highwall1', xo: 0, yo: 2 },
                { model: 'lowwall2', xo: 1, yo: 0 },
                { model: 'lowwall2', xo: 1, yo: 2 },
            ];

            factoryParts.forEach(part => {
                const model = models.get(part.model);
                if (model) {
                    const instance = model.instantiateHierarchy();
                    if (instance) {
                        instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + part.xo, 0, mapBegin.z + obj.y + part.yo);
                        instance.position.y += 1;
                        setVisibleAll(instance, true);
                    }
                }
            });

            // Central factory piece
            if (obj.subtype) {
                let modelName = `e-${obj.subtype}`;
                if (obj.subtype === 'chassis') {
                    modelName = 'e-tracks';
                } else if (obj.subtype === 'cannons') {
                    modelName = 'e-cannon';
                }
                const model = models.get(modelName);
                if (model) {
                    const instance = model.instantiateHierarchy();
                    if (instance) {
                        if (obj.subtype === 'electronics') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 4.4, 2.1, mapBegin.z + obj.y - 0.3);
                        } else if (obj.subtype === 'missiles') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 1.4, 2.1, mapBegin.z + obj.y - 2.1);
                        } else if (obj.subtype === 'phasers') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 1.7, 2.0, mapBegin.z + obj.y - 1.7);
                        } else if (obj.subtype === 'nuclear') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 2.6, 2.1, mapBegin.z + obj.y + 0.5);
                        } else if (obj.subtype === 'chassis') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 6.3, 2.1, mapBegin.z + obj.y - 2.4);
                        } else if (obj.subtype === 'cannons') {
                            instance.position = new BABYLON.Vector3(mapBegin.x + obj.x + 2.4, 2.1, mapBegin.z + obj.y - 3.9);
                        }
                        setVisibleAll(instance, true);
                    }
                }
            }
        } else {
            let modelName = obj.type;
            if (obj.type.startsWith('wall')) {
                // e.g. wall1 -> lowwall1, wall2 -> lowwall2
                // This is a guess, might need adjustment based on original game assets
                if (obj.type === 'wall1') modelName = 'lowwall1';
                if (obj.type === 'wall2') modelName = 'lowwall2';
                if (obj.type === 'wall3') modelName = 'lowwall3';
                if (obj.type === 'wall4') modelName = 'highwall1';
                if (obj.type === 'wall6') modelName = 'highwall2';
            }
    
            const model = models.get(modelName);
            if (model) {
                const instance = model.instantiateHierarchy();
                if (instance) {
                    instance.position = new BABYLON.Vector3(mapBegin.x + obj.x, 0, mapBegin.z + obj.y);
                    instance.position.y += 1;
                    setVisibleAll(instance, true);
                }
            }
        }
    });
};

export const debugLoadMap = (mapData: MapData, scene: BABYLON.Scene, mapBegin: BABYLON.Vector3) => {
    const createTextTexture = (text: string, size: number) => {
        const texture = new BABYLON.DynamicTexture("DynamicTexture", size, scene, true);
        texture.hasAlpha = true;
        texture.drawText(text, null, null, "bold 72px Arial", "black", "white", true);
        return texture;
    };

    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            const tile = mapData.tiles[y][x];
            const plane = BABYLON.MeshBuilder.CreatePlane(`plane_${x}_${y}`, { size: 1 }, scene);
            plane.position = new BABYLON.Vector3(mapBegin.x + x, 0, mapBegin.z + y);
            plane.rotation.x = Math.PI / 2;
            plane.rotation.y = Math.PI / 2;

            const material = new BABYLON.StandardMaterial(`mat_${x}_${y}`, scene);
            material.diffuseTexture = createTextTexture(tile, 256);
            plane.material = material;
        }
    }

    mapData.objects.forEach((obj, index) => {
        const box = BABYLON.MeshBuilder.CreateBox(`box_${index}`, { size: 0.5 }, scene);
        box.position = new BABYLON.Vector3(mapBegin.x + obj.x, 0.25, mapBegin.z + obj.y);
        box.rotation.y = Math.PI / 2;

        const material = new BABYLON.StandardMaterial(`mat_box_${index}`, scene);
        let text = obj.type;
        if (obj.subtype) {
            text += `\n${obj.subtype}`;
        }
        if (obj.owner) {
            text += `\nOwner: ${obj.owner}`;
        }
        material.diffuseTexture = createTextTexture(text, 512);
        box.material = material;
    });
};


export const debugPlaceGrass = (models: Map<string, BABYLON.AbstractMesh>, scene: BABYLON.Scene, mapBegin: BABYLON.Vector3) => {
    const model = models.get('grass');
    if (model) {
        const instance = model.instantiateHierarchy();
        if (instance) {
            // The grass model has an internal pivot point offset.
            // The user found the precise offset needed to align it with the debug map's origin.
            instance.position = new BABYLON.Vector3(mapBegin.x, 1, mapBegin.z);
            instance.rotation.x = Math.PI / 2;
            setVisibleAll(instance, true);
        }
    }
};
