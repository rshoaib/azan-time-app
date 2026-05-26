import { getAzanReciter, getAzanSoundEnabled, getPrayerAzanStyles } from './storageService';
import { getAudioModule } from './audioModuleLoader';
import { getReciter } from '../constants/reciters';
import { getAzanStyleMeta } from '../constants/azanStyles';
import { PrayerName } from './prayerService';

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
 * Play the azan for a specific prayer, honoring the user's per-prayer
 * azan style choice. Falls back to playAzan() (full + selected reciter)
 * if no per-prayer style is stored.
 */
export async function playAzanForPrayer(prayer: PrayerName): Promise<void> {
    const enabled = await getAzanSoundEnabled();
    if (!enabled) return;

    const styles = await getPrayerAzanStyles();
    const style = styles[prayer] ?? 'full';

    if (style === 'silent') return;
    if (style === 'full') {
        await playAzan();
        return;
    }

    const meta = getAzanStyleMeta(style);
    if (!meta.audioSource) {
        // Asset missing — fall back gracefully to the full azan.
        await playAzan();
        return;
    }

    await stopAzan();

    try {
        await configureAudio();
        const AudioModule = await getAudioModule();
        if (!AudioModule) return;

        const { sound } = await AudioModule.Sound.createAsync(meta.audioSource, {
            shouldPlay: true,
            volume: 1.0,
        });

        currentSound = sound;
        sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                currentSound = null;
            }
        });
    } catch (error) {
        console.warn(`Failed to play ${style} azan:`, error);
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
