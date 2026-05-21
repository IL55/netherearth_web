import { ObjectType } from '../../game/core/warmap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, KeyboardInfo, KeyboardEventTypes } from '@babylonjs/core';
import { attachGameControls } from '../../controls/game';
import { Owner } from '../../game/types/owner';
import type { WarMap } from '../../game/core/warmap';

function makeEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const warMap: WarMap = {
        width: 1,
        height: 1,
        tiles: [
            { id: 'tile_0_0',  type: ObjectType.TILE,     x: 0, y: 0 } as any,
            { id: 'factory_0', type: ObjectType.FACTORY,  x: 1, y: 0, subtype: 'cannons' } as any,
            { id: 'warbase_0', type: ObjectType.WARBASE,  x: 2, y: 0 } as any,
        ],
        robots: [],
        projectiles: [], killCounts: {}, tick: 0
    };
    return { engine, scene, warMap };
}

function pressKey(scene: Scene, key: string) {
    scene.onKeyboardObservable.notifyObservers(
        new KeyboardInfo(KeyboardEventTypes.KEYDOWN, { key } as KeyboardEvent)
    );
}

describe('attachGameControls - disabled', () => {
    let engine: NullEngine;
    let scene: Scene;
    let warMap: WarMap;
    let updateCount: number;

    beforeEach(() => {
        ({ engine, scene, warMap } = makeEnv());
        updateCount = 0;
        attachGameControls(scene, warMap, () => { updateCount++; });
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('does nothing when keys are pressed', () => {
        pressKey(scene, 't');
        expect(updateCount).toBe(0);
    });
});
