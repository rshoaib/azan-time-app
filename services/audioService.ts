import { AppState } from 'react-native';
import { getAzanReciter, getAzanShortEnabled, getAzanSoundEnabled } from './storageService';
import { getAudioModule } from './audioModuleLoader';
import { maybeShowInterstitial } from './adsService';
import { getReciter, PRAYER_SPECIFIC_AUDIO, SHORT_AZAN_AUDIO } from '../constants/reciters';
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
export async function playAzan(
    prayerName?: PrayerName,
    opts?: { adOnFinish?: boolean }
): Promise<void> {
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
        const short = await getAzanShortEnabled();
        const reciterId = await getAzanReciter();
        const reciter = getReciter(reciterId);
        // Short azan overrides reciter + prayer-specific recordings.
        const audioSource = short
            ? SHORT_AZAN_AUDIO
            : (prayerName && PRAYER_SPECIFIC_AUDIO[prayerName]) ?? reciter.audioSource;

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

        // Clean up when playback finishes — and treat a *naturally finished*
        // azan as a genuine completion moment: the primary, policy-safe surface
        // for the frequency-capped interstitial (the service enforces the
        // ≥4-min / ≤5-per-day caps). Two guards keep this compliant:
        //   • adOnFinish — only the real prayer azan (fired from the notification
        //     listener) is ad-eligible. A settings "Preview adhan" tap calls
        //     playAzan() with no opts, so auditioning a voice never pops an ad.
        //   • AppState 'active' — an azan that finishes while the app is
        //     backgrounded (played from a notification) never shows an ad over
        //     the lock screen or another app.
        sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                currentSound = null;
                if (opts?.adOnFinish && AppState.currentState === 'active') {
                    maybeShowInterstitial();
                }
            }
        });
    } catch (error) {
        console.warn('Failed to play Azan audio:', error);
    } finally {
        isStarting = false;
    }
}

/**
 * Preview a specific reciter's adhan on demand, regardless of the currently
 * saved selection or the full/short/silent toggle. Used by the voice picker so
 * users can audition each voice before choosing it. Shares the same currentSound
 * machinery as playAzan(), so stopAzan()/isAzanPlaying() work for previews too.
 */
export async function previewReciter(reciterId: string): Promise<void> {
    if (isStarting) return;
    isStarting = true;
    try {
        await stopAzan();
        await configureAudio();

        const AudioModule = await getAudioModule();
        if (!AudioModule) return;

        const reciter = getReciter(reciterId);
        if (!reciter.audioSource) {
            console.warn(`No audio source for reciter ${reciterId}`);
            return;
        }

        const { sound } = await AudioModule.Sound.createAsync(
            reciter.audioSource,
            { shouldPlay: true, volume: 1.0 }
        );
        currentSound = sound;
        sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                currentSound = null;
            }
        });
    } catch (error) {
        console.warn('Failed to preview reciter audio:', error);
    } finally {
        isStarting = false;
    }
}

/**
 * Stop the currently playing Azan sound.
 */
export async function stopAzan(): Promise<void> {
    // The full adhan may be playing in the native foreground service rather than
    // here (v1.3.14). Stop that too, or the in-app Stop button would leave a
    // 3-minute recording running with no way to silence it.
    try {
        const AdhanPlayback = require('../modules/adhan-playback').default;
        if (AdhanPlayback) AdhanPlayback.stop();
    } catch {
        // Native module absent (Expo Go / iOS / tests) — nothing to stop.
    }

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
    if (currentSound !== null) return true;
    // Also report the native service's playback, so Settings shows a working
    // Stop control while the foreground-service adhan is running.
    try {
        const AdhanPlayback = require('../modules/adhan-playback').default;
        return AdhanPlayback ? AdhanPlayback.isPlaying() === true : false;
    } catch {
        return false;
    }
}
