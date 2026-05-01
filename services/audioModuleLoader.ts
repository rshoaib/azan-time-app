let AudioModule: any = null;

/**
 * Lazily load the expo-av Audio module.
 * Returns null if expo-av is unavailable (e.g. Expo Go SDK 55+).
 */
export async function getAudioModule(): Promise<any> {
    if (AudioModule) return AudioModule;
    try {
        const mod = await import('expo-av');
        AudioModule = mod.Audio;
        return AudioModule;
    } catch {
        console.warn('expo-av is not available — audio features disabled.');
        return null;
    }
}
