import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder } from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';

export const createScene = (engine: Engine, canvas: HTMLCanvasElement): Scene => {
  const scene = new Scene(engine);

  // ArcRotateCamera
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const box = MeshBuilder.CreateBox('box', { size: 2 }, scene);

  const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
  sphere.position.x = 3;

  return scene;
};
