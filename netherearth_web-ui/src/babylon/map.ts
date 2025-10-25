import * as BABYLON from '@babylonjs/core';

export interface MapData {
    width: number;
    height: number;
    tiles: string[][];
    objects: { type: string; x: number; y: number; [key: string]: any }[];
}

const setEnabledAll = (node: BABYLON.Node, enabled: boolean) => {
    if (node instanceof BABYLON.AbstractMesh) {
        node.setEnabled(enabled);
    }
    node.getChildren().forEach(child => setEnabledAll(child, enabled));
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

export const createMap = (mapData: MapData, models: Map<string, BABYLON.AbstractMesh>, scene: BABYLON.Scene) => {
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
                        instance.position = new BABYLON.Vector3(x, 0, y);
                        setEnabledAll(instance, true);
                    }
                }
            }
        }
    }

    mapData.objects.forEach(obj => {
        let modelName = obj.type;
        if (obj.type === 'factory') {
            // For now, just use the factory model, subtype can be used later
            modelName = 'factory';
        } else if (obj.type.startsWith('wall')) {
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
                instance.position = new BABYLON.Vector3(obj.x, 0, obj.y);
                setEnabledAll(instance, true);
            }
        }
    });
};

export const debugLoadMap = (mapData: MapData, scene: BABYLON.Scene) => {
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
            plane.position = new BABYLON.Vector3(x, 0, y);
            plane.rotation.x = Math.PI / 2;

            const material = new BABYLON.StandardMaterial(`mat_${x}_${y}`, scene);
            material.diffuseTexture = createTextTexture(tile, 256);
            plane.material = material;
        }
    }

    mapData.objects.forEach((obj, index) => {
        const box = BABYLON.MeshBuilder.CreateBox(`box_${index}`, { size: 0.5 }, scene);
        box.position = new BABYLON.Vector3(obj.x, 0.25, obj.y);

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
