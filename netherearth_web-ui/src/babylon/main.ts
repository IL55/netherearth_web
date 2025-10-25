import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './models';

const setEnabledAll = (node: BABYLON.Node, enabled: boolean) => {
    if (node instanceof BABYLON.AbstractMesh) {
        node.setEnabled(enabled);
    }
    node.getChildren().forEach(child => setEnabledAll(child, enabled));
}

export const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> => {
  const scene = new BABYLON.Scene(engine);

  // ArcRotateCamera
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const assetsManager = new BABYLON.AssetsManager(scene);
  const models = loadModels(assetsManager);
  await assetsManager.loadAsync();

  const hNuclearModel = models.get('h-nuclear');
  let hNuclearRoot: BABYLON.TransformNode | null = null;
  if (hNuclearModel) {
    hNuclearRoot = hNuclearModel.instantiateHierarchy();
    if (hNuclearRoot) {
      hNuclearRoot.position = new BABYLON.Vector3(-1.55, 0, 0);
      hNuclearRoot.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
      setEnabledAll(hNuclearRoot, true);
    }
  }

  const bullet1Model = models.get('bullet1');
  let bullet1Root: BABYLON.TransformNode | null = null;
  if (bullet1Model) {
    bullet1Root = bullet1Model.instantiateHierarchy();
    if (bullet1Root) {
      bullet1Root.position = new BABYLON.Vector3(1.01, 0, 0);
      bullet1Root.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
      setEnabledAll(bullet1Root, true);
    }
  }

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
