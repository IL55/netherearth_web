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
            { id: 'tile_0_0', type: 'tile', x: 0, y: 0, subtype: 'G' },
            { id: 'robot_0', type: 'robot', x: 0, y: 0 },
            { id: 'robot_1', type: 'robot', x: 1, y: 0 },
            { id: 'robot_2', type: 'robot', x: 2, y: 0 },
        ],
    };
    return { engine, scene, warMap };
}

function pressKey(scene: Scene, key: string) {
    scene.onKeyboardObservable.notifyObservers(
        new KeyboardInfo(KeyboardEventTypes.KEYDOWN, { key } as KeyboardEvent)
    );
}

describe('attachGameControls', () => {
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

    it('pressing "t" removes the last robot', () => {
        pressKey(scene, 't');
        expect(warMap.objects.find(o => o.id === 'robot_2')).toBeUndefined();
        expect(warMap.objects).toHaveLength(3);
    });

    it('pressing "t" removes robots in reverse order', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        expect(warMap.objects.find(o => o.id === 'robot_2')).toBeUndefined();
        expect(warMap.objects.find(o => o.id === 'robot_1')).toBeUndefined();
        expect(warMap.objects.find(o => o.id === 'robot_0')).toBeDefined();
    });

    it('pressing "t" calls onUpdate', () => {
        pressKey(scene, 't');
        expect(updateCount).toBe(1);
    });

    it('pressing "t" with no robots does not call onUpdate', () => {
        warMap.objects = warMap.objects.filter(o => o.type !== 'robot');
        pressKey(scene, 't');
        expect(updateCount).toBe(0);
    });

    it('pressing "t" does not remove non-robot objects', () => {
        warMap.objects = [{ id: 'tile_0_0', type: 'tile', x: 0, y: 0 }];
        pressKey(scene, 't');
        expect(warMap.objects).toHaveLength(1);
    });

    it('other keys do not trigger updates', () => {
        pressKey(scene, 'a');
        pressKey(scene, 'd');
        pressKey(scene, 'r');
        expect(updateCount).toBe(0);
        expect(warMap.objects).toHaveLength(4);
    });

    it('KEYUP for "t" does not trigger update', () => {
        scene.onKeyboardObservable.notifyObservers(
            new KeyboardInfo(KeyboardEventTypes.KEYUP, { key: 't' } as KeyboardEvent)
        );
        expect(updateCount).toBe(0);
    });
});
