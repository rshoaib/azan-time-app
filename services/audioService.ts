import { Audio } from 'expo-av';
import { getAzanSoundEnabled } from './storageService';

let currentSound: Audio.Sound | null = null;

/**
 * Configure audio session for Azan playback.
 * Plays even in silent mode and mixes with other audio.
 */
export async function configureAudio(): Promise<void> {
    await Audio.setAudioModeAsync({
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

        // Load and play the bundled Azan audio
        let audioSource;
        try {
            audioSource = require('../assets/audio/azan.mp3');
        } catch {
            console.warn('Azan audio file not found in assets/audio/azan.mp3');
            return;
        }

        const { sound } = await Audio.Sound.createAsync(
            audioSource,
            {
                shouldPlay: true,
                volume: 1.0,
            }
        );

        currentSound = sound;

        // Clean up when playback finishes
        sound.setOnPlaybackStatusUpdate((status) => {
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
