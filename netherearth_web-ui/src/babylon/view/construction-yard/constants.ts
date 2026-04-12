export const CY_LAYER_MASK = 0x10000000;

export const CY_PARTS = [
    { id: 'h-bipod', label: 'Bipod Chassis' },
    { id: 'h-tracks', label: 'Tracks Chassis' },
    { id: 'h-antigrav', label: 'Antigrav Chassis' },
    { id: 'h-cannon', label: 'Cannon' },
    { id: 'h-missiles', label: 'Missiles' },
    { id: 'h-phasers', label: 'Phasers' },
    { id: 'h-electronics', label: 'Electronics' },
    { id: 'h-nuclear', label: 'Nuclear' }
];

export const CY_LAYOUT = {
    startY: 6,
    stepY: 2,
    modelX: -3,
    labelX: 1.5,
    targetScale: 1.5,
    cameraZ: -10,
    orthoHeight: 10,
    bgWidth: 40,
    bgHeight: 40
};
