export const CY_LAYER_MASK = 0x10000000;

export const CY_PARTS = [
    { id: 'common', label: 'Common', resourceType: 'common' as const },
    { id: 'h-bipod', label: 'Bipod Chassis', resourceType: 'chassis' as const },
    { id: 'h-tracks', label: 'Tracks Chassis', resourceType: 'chassis' as const },
    { id: 'h-antigrav', label: 'Antigrav Chassis', resourceType: 'chassis' as const },
    { id: 'h-cannon', label: 'Cannon', resourceType: 'cannons' as const },
    { id: 'h-missiles', label: 'Missiles', resourceType: 'missiles' as const },
    { id: 'h-phasers', label: 'Phasers', resourceType: 'phasers' as const },
    { id: 'h-electronics', label: 'Electronics', resourceType: 'electronics' as const },
    { id: 'h-nuclear', label: 'Nuclear', resourceType: 'nuclear' as const }
];

export const CY_LAYOUT = {
    startY: 8,
    stepY: 2,
    modelX: -3,
    labelX: 1.5,
    targetScale: 1.5,
    cameraZ: -10,
    orthoHeight: 12,
    bgWidth: 40,
    bgHeight: 40
};
