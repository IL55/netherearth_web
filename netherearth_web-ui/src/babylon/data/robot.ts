export interface RobotConfig {
    chassis: string;
    weapon: string;
    nuclearModel?: string; // explicit model name so color matches team
    electronics: string;
}

export const robotConfigs = {
    'h-cannon':   { chassis: 'h-tracks',   weapon: 'h-cannon',                              electronics: 'h-electronics' },
    'h-missiles': { chassis: 'h-antigrav', weapon: 'h-missiles',                            electronics: 'h-electronics' },
    'h-phasers':  { chassis: 'h-bipod',    weapon: 'h-phasers',  nuclearModel: 'h-nuclear', electronics: 'h-electronics' },
    'e-cannon':   { chassis: 'e-tracks',   weapon: 'e-cannon',                              electronics: 'e-electronics' },
    'e-missiles': { chassis: 'e-antigrav', weapon: 'e-missiles',  nuclearModel: 'e-nuclear', electronics: 'e-electronics' },
    'e-phasers':  { chassis: 'e-bipod',    weapon: 'e-phasers',                             electronics: 'e-electronics' },
} satisfies Record<string, RobotConfig>;

export type RobotConfigName = keyof typeof robotConfigs;
