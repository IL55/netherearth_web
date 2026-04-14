import { Chassis, Weapon } from '../../data/robot';
import {
    CHASSIS_BUILD_COST,
    WEAPON_BUILD_COST,
    ELECTRONICS_BUILD_COST,
    NUCLEAR_BUILD_COST,
} from '../../game/mechanics/build';

export const CY_LAYER_MASK = 0x10000000;

export const CY_FONT = "bold 70px Arial";
export const ROTATION_SPEED = 0.02;
export const STACK_GAP = 0.15;

/** How each row behaves when clicked. */
export type PartGroup = 'chassis' | 'weapon' | 'toggle' | 'info';

export const CY_PARTS = [
    { id: 'h-bipod',       label: 'Bipod',       resourceType: 'chassis'     as const, cost: CHASSIS_BUILD_COST[Chassis.BIPOD].chassis!,    group: 'chassis' as PartGroup },
    { id: 'h-tracks',      label: 'Tracks',      resourceType: 'chassis'     as const, cost: CHASSIS_BUILD_COST[Chassis.TRACKS].chassis!,   group: 'chassis' as PartGroup },
    { id: 'h-antigrav',    label: 'Antigrav',    resourceType: 'chassis'     as const, cost: CHASSIS_BUILD_COST[Chassis.ANTIGRAV].chassis!, group: 'chassis' as PartGroup },
    { id: 'h-cannon',      label: 'Cannon',      resourceType: 'cannons'     as const, cost: WEAPON_BUILD_COST[Weapon.CANNON].cannons!,      group: 'weapon'  as PartGroup },
    { id: 'h-missiles',    label: 'Missiles',    resourceType: 'missiles'    as const, cost: WEAPON_BUILD_COST[Weapon.MISSILES].missiles!,   group: 'weapon'  as PartGroup },
    { id: 'h-phasers',     label: 'Phasers',     resourceType: 'phasers'     as const, cost: WEAPON_BUILD_COST[Weapon.PHASERS].phasers!,     group: 'weapon'  as PartGroup },
    { id: 'h-electronics', label: 'Electronics', resourceType: 'electronics' as const, cost: ELECTRONICS_BUILD_COST.electronics!,           group: 'toggle'  as PartGroup },
    { id: 'h-nuclear',     label: 'Nuclear',     resourceType: 'nuclear'     as const, cost: NUCLEAR_BUILD_COST.nuclear!,                   group: 'toggle'  as PartGroup },
    { id: 'common',        label: 'Common',      resourceType: 'common'      as const, cost: null,                                          group: 'info'    as PartGroup },
];

export const CY_LAYOUT = {
    startY: 8,
    stepY: 2,
    modelX: -3,
    labelX: 1.5,
    priceX: -1.0,
    countX: 8.5,
    targetScale: 1.5,
    // Row selection highlight / click plane (left panel)
    rowHighlightCenterX: 3,
    rowHighlightWidth: 14,
    rowHighlightHeight: 1.4,
    // Right panel (title, preview robot, buttons)
    panelX: 15,
    panelTitleY: 10,
    panelRobotY: 1,
    panelRobotScale: 6,
    panelBtnY: -9,
    cameraZ: -10,
    orthoHeight: 12,
    bgWidth: 40,
    bgHeight: 40,
};

// Parts stacked bottom-to-top: chassis → weapon → nuclear → electronics
export const PREVIEW_ROBOT_PARTS = ['h-bipod', 'h-phasers', 'h-nuclear', 'h-electronics'];
