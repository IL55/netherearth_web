export * from '../data/storage';

export function formatKey(code: string): string {
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Arrow')) return code.replace('Arrow', '').toUpperCase();
    if (code.startsWith('Key')) return code.replace('Key', '').toUpperCase();
    return code.toUpperCase();
}
