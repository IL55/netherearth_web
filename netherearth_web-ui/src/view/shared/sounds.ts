import type { SoundName } from '../../game/types/sound';

const BASE_URL = import.meta.env.BASE_URL;

export interface Sounds {
    play(name: SoundName): void;
    playSequence(names: SoundName[]): void;
    stopSequence(): void;
}

export const loadSounds = (): Sounds => {
    const play = (name: SoundName) => {
        new Audio(`${BASE_URL}sound/${name}.wav`).play().catch(() => {});
    };

    let currentAudio: HTMLAudioElement | null = null;
    let pendingStart: (() => void) | null = null;

    const stopSequence = () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        if (pendingStart) {
            window.removeEventListener('pointerdown', pendingStart);
            window.removeEventListener('keydown', pendingStart);
            pendingStart = null;
        }
    };

    const playSequence = (names: SoundName[]) => {
        const step = (i: number) => {
            if (i >= names.length) { currentAudio = null; return; }
            const audio = new Audio(`${BASE_URL}sound/${names[i]}.wav`);
            currentAudio = audio;
            audio.addEventListener('ended', () => { if (currentAudio === audio) step(i + 1); }, { once: true });
            audio.play().catch(() => { if (currentAudio === audio) step(i + 1); });
        };

        const start = () => {
            pendingStart = null;
            window.removeEventListener('pointerdown', start);
            window.removeEventListener('keydown', start);
            step(0);
        };

        // Audio is blocked until user gesture — queue on first interaction
        pendingStart = start;
        window.addEventListener('pointerdown', start);
        window.addEventListener('keydown', start);
    };

    return { play, playSequence, stopSequence };
};
