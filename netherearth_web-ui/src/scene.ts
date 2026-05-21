import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { loadModels } from './view/shared/models';
import { loadSounds } from './view/shared/sounds';
import { bus } from './game/event-bus';
import { GameSession } from './game-session';

export const createScene = async (
    engine: BABYLON.Engine,
    canvas: HTMLCanvasElement,
): Promise<{ scene: BABYLON.Scene; dispose: () => void }> => {
    const scene = new BABYLON.Scene(engine);

    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    const assetsManager = new BABYLON.AssetsManager(scene);
    const models = loadModels(assetsManager);
    await assetsManager.loadAsync();

    const sounds = loadSounds();
    bus.on('sound:play', ({ name }) => sounds.play(name));

    const session = await GameSession.create(scene, canvas, models, sounds);

    return {
        scene,
        dispose: () => session.dispose(),
    };
};
