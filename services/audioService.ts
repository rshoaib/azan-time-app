import { getAzanReciter, getAzanSoundEnabled } from './storageService';
import { getAudioModule } from './audioModuleLoader';
import { getReciter, PRAYER_SPECIFIC_AUDIO } from '../constants/reciters';
import type { PrayerName } from './prayerService';

let currentSound: any = null;
// Guard against concurrent playAzan() calls racing during the async
// createAsync setup — without this, two near-simultaneous notifications
// can each spawn their own sound and the first one plays orphaned.
let isStarting = false;

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
 * Play the Azan sound for the given prayer.
 * Falls back to the user's selected reciter if no prayer-specific audio exists
 * (e.g. Fajr has its own recording with "As-salatu khayrun min an-nawm").
 */
export async function playAzan(prayerName?: PrayerName): Promise<void> {
    const enabled = await getAzanSoundEnabled();
    if (!enabled) return;

    // Reject overlapping starts — keeps a second notification firing in the
    // same tick from creating a second Sound that we lose track of.
    if (isStarting) return;
    isStarting = true;

    try {
        // Stop any currently playing Azan
        await stopAzan();

        await configureAudio();

        const AudioModule = await getAudioModule();
        if (!AudioModule) return;

        // Pick the audio source: prayer-specific (e.g. Fajr) takes precedence
        // over the user's selected reciter.
        const reciterId = await getAzanReciter();
        const reciter = getReciter(reciterId);
        const audioSource =
            (prayerName && PRAYER_SPECIFIC_AUDIO[prayerName]) ?? reciter.audioSource;

        if (!audioSource) {
            console.warn(`No audio source for reciter ${reciterId}`);
            return;
        }

        const { sound } = await AudioModule.Sound.createAsync(
            audioSource,
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
    } finally {
        isStarting = false;
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
