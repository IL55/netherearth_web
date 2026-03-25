import { Owner } from '../game/owner';

export interface MapData {
    width: number;
    height: number;
    tiles: string[][];
    objects: { type: string; x: number; y: number; [key: string]: any }[];
}

export const loadMap = async (url: string): Promise<MapData> => {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const width = parseInt(lines[0]);
    const height = parseInt(lines[1]);

    const tiles: string[][] = [];
    for (let i = 0; i < height; i++) {
        tiles.push(lines[i + 2].split(' '));
    }

    const objects: { type: string; x: number; y: number; [key: string]: any }[] = [];
    for (let i = height + 2; i < lines.length; i++) {
        const parts = lines[i].split(' ');
        const type = parts[0];
        if (type === 'fence' || type.startsWith('wall')) {
            objects.push({ type, x: parseFloat(parts[1]), y: parseFloat(parts[2]) });
        } else if (type === 'factory') {
            const ownerNum = parts[4] ? parseInt(parts[4]) : undefined;
            const owner = ownerNum !== undefined && !isNaN(ownerNum) ? ownerNum as Owner : Owner.NEUTRAL;
            objects.push({ type, x: parseFloat(parts[1]), y: parseFloat(parts[2]), subtype: parts[3], owner });
        } else if (type === 'warbase') {
            objects.push({ type, x: parseFloat(parts[1]), y: parseFloat(parts[2]), owner: parseInt(parts[3]) as Owner });
        }
    }

    return { width, height, tiles, objects };
};
