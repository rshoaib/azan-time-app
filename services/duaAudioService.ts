import * as Speech from 'expo-speech';

let currentDuaId: string | null = null;
let onFinishCallback: (() => void) | null = null;
let cachedVoices: Speech.Voice[] | null = null;

function resetDuaState() {
    currentDuaId = null;
    onFinishCallback?.();
    onFinishCallback = null;
}

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

    if (!cachedVoices) {
        cachedVoices = await Speech.getAvailableVoicesAsync();
        // Log available Arabic voices to help debug voice selection
        const arabicVoices = cachedVoices.filter((v) => v.language.startsWith('ar'));
        console.log('Available Arabic voices:', JSON.stringify(arabicVoices.map((v) => ({
            name: v.name, id: v.identifier, lang: v.language, quality: v.quality,
        }))));
    }

    const arabicVoices = cachedVoices.filter((v) => v.language.startsWith('ar'));

    // Try to find a male voice using multiple strategies
    const maleVoice =
        // 1. Explicit "male" in name/identifier (some devices label this)
        arabicVoices.find((v) => /male/i.test(v.name) && !/female/i.test(v.name))
        // 2. Known male Arabic voice identifiers on Android
        ?? arabicVoices.find((v) => /ar-xa-x-arc|ar-xa-x-ard|ar-xa-x-are/i.test(v.identifier ?? ''))
        // 3. Pick a lower-quality voice (often male on Android) if multiple exist
        ?? (arabicVoices.length > 1
            ? arabicVoices.find((v) => v.quality && v.quality < 300)
            : null);

    console.log('Selected Arabic voice:', maleVoice?.identifier ?? 'default');

    Speech.speak(arabicText, {
        language: 'ar-SA',
        ...(maleVoice ? { voice: maleVoice.identifier } : {}),
        rate: 0.75,
        pitch: 0.85,
        onDone: resetDuaState,
        onError: resetDuaState,
        onStopped: resetDuaState,
    });
}

/**
 * Stop any currently playing dua audio.
 */
export async function stopDuaAudio(): Promise<void> {
    if (currentDuaId) {
        Speech.stop();
        resetDuaState();
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
