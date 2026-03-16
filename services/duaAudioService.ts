import * as Speech from 'expo-speech';

let currentDuaId: string | null = null;
let onFinishCallback: (() => void) | null = null;

/**
 * Play Arabic recitation of a dua using Text-to-Speech.
 * Stops any currently playing dua before starting the new one.
 */
export async function playDuaAudio(
    duaId: string,
    arabicText: string,
    onFinish?: () => void
): Promise<void> {
    // Stop any currently playing dua
    await stopDuaAudio();

    currentDuaId = duaId;
    onFinishCallback = onFinish ?? null;

    Speech.speak(arabicText, {
        language: 'ar-SA',
        rate: 0.75, // Slightly slower for clarity
        pitch: 1.0,
        onDone: () => {
            currentDuaId = null;
            onFinishCallback?.();
            onFinishCallback = null;
        },
        onError: () => {
            currentDuaId = null;
            onFinishCallback?.();
            onFinishCallback = null;
        },
        onStopped: () => {
            currentDuaId = null;
            onFinishCallback?.();
            onFinishCallback = null;
        },
    });
}

/**
 * Stop any currently playing dua audio.
 */
export async function stopDuaAudio(): Promise<void> {
    if (currentDuaId) {
        Speech.stop();
        currentDuaId = null;
        onFinishCallback?.();
        onFinishCallback = null;
    }
}

/**
 * Check if a specific dua is currently playing.
 */
export function isDuaPlaying(duaId: string): boolean {
    return currentDuaId === duaId;
}

/**
 * Get the ID of the currently playing dua, or null.
 */
export function getPlayingDuaId(): string | null {
    return currentDuaId;
}
