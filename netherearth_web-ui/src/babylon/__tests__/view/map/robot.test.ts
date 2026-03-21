import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { placeRobot, robotConfigs } from '../../../view/map/robot';
import { makeEnv } from '../../test-utils';

import type { RobotConfig } from '../../../view/map/robot';

const configs = Object.values(robotConfigs) as RobotConfig[];

describe('robotConfigs', () => {
    it('each config has chassis, weapon, and electronics', () => {
        configs.forEach(config => {
            expect(config.chassis).toBeTruthy();
            expect(config.weapon).toBeTruthy();
            expect(config.electronics).toBeTruthy();
        });
    });

    it('chassis and electronics belong to the same team prefix', () => {
        configs.forEach(config => {
            const chassisTeam = config.chassis.split('-')[0];
            const electronicsTeam = config.electronics.split('-')[0];
            expect(chassisTeam).toBe(electronicsTeam);
        });
    });

    it('nuclear configs use matching team prefix', () => {
        configs.filter(c => c.nuclearModel).forEach(config => {
            const team = config.chassis.startsWith('e') ? 'e' : 'h';
            expect(config.chassis.startsWith(team)).toBe(true);
            expect(config.electronics.startsWith(team)).toBe(true);
        });
    });

    it('has 6 configs', () => {
        expect(configs).toHaveLength(6);
    });
});

describe('placeRobot', () => {
    let engine: NullEngine;
    let scene: Scene;
    let models: Map<string, AbstractMesh>;
    const mapBegin = new Vector3(0, 0, 0);
    const STACK_GAP = 0; // disable gap so math is predictable

    beforeEach(() => {
        ({ engine, scene, models } = makeEnv());
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('does not throw with a valid config', () => {
        expect(() => placeRobot(models, mapBegin, 5, 5, robotConfigs['h-cannon'], 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when chassis model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-tracks');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs['h-cannon'], 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when weapon model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-cannon');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs['h-cannon'], 0, STACK_GAP)).not.toThrow();
    });

    it('adds 3 transform nodes for a config without nuclear', () => {
        const config = configs.find(c => !c.nuclearModel)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(3); // chassis + weapon + electronics
    });

    it('adds 4 transform nodes for a config with nuclear', () => {
        const config = configs.find(c => c.nuclearModel)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(4); // chassis + weapon + nuclear + electronics
    });

    it('places chassis XZ at the requested tile coords', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 3, 7, robotConfigs['h-cannon'], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(3, 1);
        expect(chassis.position.z).toBeCloseTo(7, 1);
    });

    it('applies mapBegin offset to XZ position', () => {
        const begin = new Vector3(10, 0, 5);
        const before = scene.transformNodes.length;
        placeRobot(models, begin, 3, 7, robotConfigs['h-cannon'], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(13, 1);
        expect(chassis.position.z).toBeCloseTo(12, 1);
    });

    it('applies rotation to all placed parts', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs['h-cannon'], Math.PI / 2, STACK_GAP);
        const newNodes = scene.transformNodes.slice(before);
        newNodes.forEach(node => {
            expect(node.rotation.y).toBeCloseTo(Math.PI / 2);
        });
    });

    it('stacks parts vertically: weapon above chassis, electronics above weapon', () => {
        const config = configs.find(c => !c.nuclearModel)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, 0, STACK_GAP);
        const [chassis, weapon, electronics] = scene.transformNodes.slice(before);
        expect(weapon.position.y).toBeGreaterThan(chassis.position.y);
        expect(electronics.position.y).toBeGreaterThan(weapon.position.y);
    });

    it('chassis bottom is grounded at y=1', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs['h-cannon'], 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        chassis.computeWorldMatrix(true);
        const childMeshes = chassis.getChildMeshes();
        childMeshes.forEach(m => m.computeWorldMatrix(true));
        const minY = Math.min(...childMeshes.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
        expect(minY).toBeCloseTo(1, 1);
    });

    it('all six configs place robots without throwing', () => {
        configs.forEach((config, i) => {
            expect(() => placeRobot(models, mapBegin, i, 0, config, 0, STACK_GAP)).not.toThrow();
        });
    });
});
