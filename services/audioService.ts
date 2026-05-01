import { getAzanReciter, getAzanSoundEnabled } from './storageService';
import { getAudioModule } from './audioModuleLoader';
import { getReciter } from '../constants/reciters';

let currentSound: any = null;

/**
 * Configure audio session for Azan playback.
 * Plays even in silent mode and mixes with other audio.
 */
export async function configureAudio(): Promise<void> {
    const AudioModule = await getAudioModule();
    if (!AudioModule) return;

    await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
    });
}

/**
 * Play the default Azan sound.
 * Check the user's preference before playing.
 */
export async function playAzan(): Promise<void> {
    const enabled = await getAzanSoundEnabled();
    if (!enabled) return;

    // Stop any currently playing Azan
    await stopAzan();

    try {
        await configureAudio();

        const AudioModule = await getAudioModule();
        if (!AudioModule) return;

        // Load the user's selected reciter (falls back to default if missing)
        const reciterId = await getAzanReciter();
        const reciter = getReciter(reciterId);
        if (!reciter?.audioSource) {
            console.warn(`Reciter ${reciterId} has no audio source`);
            return;
        }

        const { sound } = await AudioModule.Sound.createAsync(
            reciter.audioSource,
            {
                shouldPlay: true,
                volume: 1.0,
            }
        );

        currentSound = sound;

        // Clean up when playback finishes
        sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                currentSound = null;
            }
        });
    } catch (error) {
        console.warn('Failed to play Azan audio:', error);
    }
}

/**
 * Stop the currently playing Azan sound.
 */
export async function stopAzan(): Promise<void> {
    if (currentSound) {
        try {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
        } catch {
            // Sound may already be unloaded
        }
        currentSound = null;
    }
}

/**
 * Check if Azan is currently playing.
 */
export function isAzanPlaying(): boolean {
    return currentSound !== null;
}
