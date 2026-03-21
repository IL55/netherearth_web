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
            const flagSide = parts[4];
            objects.push({
                type,
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                subtype: parts[3],
                ...(flagSide ? { flagSide } : {}),
            });
        } else if (type === 'warbase') {
            objects.push({ type, x: parseFloat(parts[1]), y: parseFloat(parts[2]), owner: parseInt(parts[3]) });
        }
    }

    return { width, height, tiles, objects };
};
