export interface RobotConfig {
    chassis: string;
    weapon: string;
    nuclearModel?: string; // explicit model name so color matches team
    electronics: string;
}

export const robotConfigs: RobotConfig[] = [
    { chassis: 'h-tracks',   weapon: 'h-cannon',                              electronics: 'h-electronics' },
    { chassis: 'h-antigrav', weapon: 'h-missiles',                            electronics: 'h-electronics' },
    { chassis: 'h-bipod',    weapon: 'h-phasers',  nuclearModel: 'h-nuclear', electronics: 'h-electronics' },
    { chassis: 'e-tracks',   weapon: 'e-cannon',                              electronics: 'e-electronics' },
    { chassis: 'e-antigrav', weapon: 'e-missiles',  nuclearModel: 'e-nuclear', electronics: 'e-electronics' },
    { chassis: 'e-bipod',    weapon: 'e-phasers',                             electronics: 'e-electronics' },
];
