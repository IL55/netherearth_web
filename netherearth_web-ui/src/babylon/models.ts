import * as BABYLON from '@babylonjs/core';

const modelNames: string[] = [
    "bullet1.glb", "bullet2.glb", "bullet3.glb", "construction.glb", "construction1.glb", 
    "construction2.glb", "construction3.glb", "e-antigrav.glb", "e-bipod-base.glb", 
    "e-bipod-lleg.glb", "e-bipod-rleg.glb", "e-bipod.glb", "e-cannon.glb", "e-electronics.glb", 
    "e-missiles.glb", "e-nuclear.glb", "e-phasers.glb", "e-tracks.glb", "factory.glb", 
    "fence.glb", "flag.glb", "gameover.glb", "go.glb", "grass.glb", "grass1.glb", "grass2.glb", 
    "grass3.glb", "h-antigrav.glb", "h-bipod-base.glb", "h-bipod-lleg.glb", "h-bipod-rleg.glb", 
    "h-bipod.glb", "h-cannon.glb", "h-electronics.glb", "h-missiles.glb", "h-nuclear.glb", 
    "h-phasers.glb", "h-tracks.glb", "heavyrocks.glb", "highwall1.glb", "highwall2.glb", 
    "hole1.glb", "hole2.glb", "hole3.glb", "hole4.glb", "hole5.glb", "hole6.glb", 
    "lowwall1.glb", "lowwall2.glb", "lowwall3.glb", "mountains.glb", "rocks.glb", "rough.glb", 
    "sand.glb", "sand1.glb", "ship.glb", "tittle.glb", "warbase.glb", "youwin.glb"
];

export const loadModels = (assetsManager: BABYLON.AssetsManager): Map<string, BABYLON.AbstractMesh> => {
    const models = new Map<string, BABYLON.AbstractMesh>();

    modelNames.forEach(modelName => {
        const task = assetsManager.addMeshTask(modelName, "", "/models/", modelName);
        task.onSuccess = (task) => {
            const modelNameWithoutExtension = modelName.split('.')[0];
            const rootMesh = task.loadedMeshes[0];
            if (modelName === "e-phasers.glb") {
                rootMesh.position = new BABYLON.Vector3(0, 0, 0);
                rootMesh.rotation = new BABYLON.Vector3(0, 0, 0);
                rootMesh.computeWorldMatrix(true);
                const center = rootMesh.getBoundingInfo().boundingSphere.center;
                console.log(`Center of ${modelNameWithoutExtension}:`, center);
                //const translationMatrix = BABYLON.Matrix.Translation(-center.x, -center.y, -center.z);
                //rootMesh._worldMatrix = translationMatrix;
            }
            rootMesh.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            models.set(modelNameWithoutExtension, rootMesh as BABYLON.AbstractMesh);
            task.loadedMeshes.forEach(l => l.isVisible = false);
        };
    });

    return models;
};
