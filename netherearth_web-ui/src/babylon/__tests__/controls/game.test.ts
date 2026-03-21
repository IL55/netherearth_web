import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, KeyboardInfo, KeyboardEventTypes } from '@babylonjs/core';
import { attachGameControls } from '../../controls/game';
import type { WarMap } from '../../game/warmap';

function makeEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const warMap: WarMap = {
        width: 1,
        height: 1,
        objects: [
            { id: 'tile_0_0',  type: 'tile',     x: 0, y: 0 },
            { id: 'factory_0', type: 'factory',  x: 1, y: 0, subtype: 'cannons' },
            { id: 'warbase_0', type: 'warbase',  x: 2, y: 0 },
        ],
    };
    return { engine, scene, warMap };
}

function pressKey(scene: Scene, key: string) {
    scene.onKeyboardObservable.notifyObservers(
        new KeyboardInfo(KeyboardEventTypes.KEYDOWN, { key } as KeyboardEvent)
    );
}

describe('attachGameControls - t key cycles owner', () => {
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

    it('first press sets owner to 1 on all factories and warbases', () => {
        pressKey(scene, 't');
        const factory = warMap.objects.find(o => o.id === 'factory_0')!;
        const warbase = warMap.objects.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBe(1);
        expect(warbase.owner).toBe(1);
    });

    it('second press sets owner to 2', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        const factory = warMap.objects.find(o => o.id === 'factory_0')!;
        const warbase = warMap.objects.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBe(2);
        expect(warbase.owner).toBe(2);
    });

    it('third press clears owner back to neutral', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        pressKey(scene, 't');
        const factory = warMap.objects.find(o => o.id === 'factory_0')!;
        const warbase = warMap.objects.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBeUndefined();
        expect(warbase.owner).toBeUndefined();
    });

    it('calls onUpdate on every press', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        expect(updateCount).toBe(2);
    });

    it('does not affect tiles', () => {
        pressKey(scene, 't');
        const tile = warMap.objects.find(o => o.id === 'tile_0_0')!;
        expect(tile.owner).toBeUndefined();
    });

    it('rotates all robots by π/2 on each press', () => {
        const robot = { id: 'robot_0', type: 'robot', x: 0, y: 0, rotation: 0 };
        warMap.objects.push(robot);
        pressKey(scene, 't');
        expect(robot.rotation).toBeCloseTo(Math.PI / 2, 5);
        pressKey(scene, 't');
        expect(robot.rotation).toBeCloseTo(Math.PI, 5);
    });

    it('other keys do not trigger updates', () => {
        pressKey(scene, 'a');
        pressKey(scene, 'd');
        expect(updateCount).toBe(0);
    });

    it('KEYUP for t does not trigger update', () => {
        scene.onKeyboardObservable.notifyObservers(
            new KeyboardInfo(KeyboardEventTypes.KEYUP, { key: 't' } as KeyboardEvent)
        );
        expect(updateCount).toBe(0);
    });
});
