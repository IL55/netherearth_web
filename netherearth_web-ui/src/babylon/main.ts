import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> => {
  const scene = new BABYLON.Scene(engine);

  // ArcRotateCamera
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);

  // H-Nuclear Task
  const hNuclearTask = assetsManager.addMeshTask("hNuclearTask", "", "/models/", "h-nuclear.glb");
  let hNuclearRoot: BABYLON.AbstractMesh;
  hNuclearTask.onSuccess = (task) => {
    hNuclearRoot = task.loadedMeshes[0];
    hNuclearRoot.position = new BABYLON.Vector3(-1.55, 0, 0);
    hNuclearRoot.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
  };

  // Bullet1 Task
  const bullet1Task = assetsManager.addMeshTask("bullet1Task", "", "/models/", "bullet1.glb");
  let bullet1Root: BABYLON.AbstractMesh;
  bullet1Task.onSuccess = (task) => {
    bullet1Root = task.loadedMeshes[0];
    bullet1Root.position = new BABYLON.Vector3(1.01, 0, 0);
    bullet1Root.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
  };

  await assetsManager.loadAsync();

  const box = BABYLON.MeshBuilder.CreateBox('box', { size: 2 }, scene);

  scene.onBeforeRenderObservable.add(() => {
    if (hNuclearRoot) {
      hNuclearRoot.addRotation(0, 0.01, 0);
    }
    if (bullet1Root) {
      bullet1Root.addRotation(0, 0.01, 0);
    }
    box.addRotation(0, 0.01, 0);
  });

  return scene;
};
