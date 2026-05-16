import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSounds } from '../../../view/shared/sounds';
import type { SoundName } from '../../../game/types/sound';

const INTRO = 'intro' as SoundName;

describe('loadSounds', () => {
    let audioInstances: Array<{ src: string; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }>;

    beforeEach(() => {
        audioInstances = [];
        vi.stubGlobal('Audio', function(this: unknown, src: string) {
            const instance = {
                src,
                play: vi.fn().mockResolvedValue(undefined),
                pause: vi.fn(),
                addEventListener: vi.fn(),
            };
            audioInstances.push(instance);
            return instance;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('stopSequence', () => {
        it('is a no-op before any sequence is played', () => {
            const sounds = loadSounds();
            expect(() => sounds.stopSequence()).not.toThrow();
        });

        it('prevents sequence from starting after user gesture', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);
            sounds.stopSequence();

            window.dispatchEvent(new Event('pointerdown'));

            expect(audioInstances).toHaveLength(0);
        });

        it('prevents sequence from starting on keydown after stop', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);
            sounds.stopSequence();

            window.dispatchEvent(new KeyboardEvent('keydown'));

            expect(audioInstances).toHaveLength(0);
        });

        it('pauses currently playing audio', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);
            window.dispatchEvent(new Event('pointerdown'));

            expect(audioInstances).toHaveLength(1);

            sounds.stopSequence();

            expect(audioInstances[0].pause).toHaveBeenCalled();
        });
    });

    describe('playSequence', () => {
        it('starts playing on first pointerdown', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);

            window.dispatchEvent(new Event('pointerdown'));

            expect(audioInstances).toHaveLength(1);
            expect(audioInstances[0].src).toContain('intro.wav');
            expect(audioInstances[0].play).toHaveBeenCalled();
        });

        it('starts playing on first keydown', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);

            window.dispatchEvent(new KeyboardEvent('keydown'));

            expect(audioInstances).toHaveLength(1);
            expect(audioInstances[0].play).toHaveBeenCalled();
        });

        it('does not double-start if both pointer and key fire', () => {
            const sounds = loadSounds();
            sounds.playSequence([INTRO]);

            window.dispatchEvent(new Event('pointerdown'));
            window.dispatchEvent(new KeyboardEvent('keydown'));

            expect(audioInstances).toHaveLength(1);
        });
    });
});
