/**
 * Azan Reciters — user-selectable adhan audio.
 *
 * Adding a new reciter:
 *   1. Drop the mp3 into `assets/audio/azan-<slug>.mp3`
 *   2. Add an entry here with a `require` pointing at the file
 *   3. No code changes needed anywhere else
 *
 * All audio should be:
 *   - 96–128 kbps mono mp3
 *   - 2–4 minutes long
 *   - Royalty-free or licensed for app distribution (the ones below are
 *     from public-domain / Creative Commons recordings from major masjids)
 *
 * If you can't ship all five at launch, start with Makkah + Madinah —
 * those two cover 80% of user preference in survey data.
 *
 * ⚠️ DO NOT REMOVE THE `require()` CALLS BELOW, even if they look unused.
 *
 * They are load-bearing for NATIVE playback, not just for in-app preview.
 * Each `require()` makes Metro bundle a second copy of the mp3 as
 * `res/raw/assets_audio_<name>`, alongside the `res/raw/<name>` copy placed by
 * the expo-notifications config plugin from app.json.
 *
 * That duplication is what lets the adhan foreground service survive resource
 * shrinking: the generated keep list
 * (android/app/build/generated/res/react/<variant>/raw/keep.xml) protects ONLY
 * the `assets_audio_*` names, so `res/raw/azan` would be stripped if
 * shrinkResources were enabled. AdhanPlaybackService.resolveSound() falls back
 * to the `assets_audio_*` copy for exactly this reason.
 *
 * Drop these requires and that fallback silently evaporates — with no build
 * error and no crash, just an adhan that does not play. See
 * modules/adhan-playback/android/proguard-rules.pro.
 */

export interface Reciter {
    id: string;
    name: string;
    location: string;
    description: string;
    // `audioSource` is the result of a `require()` statement.
    // Typed as `any` because React Native's asset require returns a number.
    audioSource: any;
    // Bare filename for the Android notification channel sound (background
    // playback). Must match an entry in app.json expo-notifications.sounds.
    androidSound: string;
}

// IMPORTANT: filenames use underscores, NOT hyphens. On Android these files are
// bundled into res/raw (via app.json expo-notifications.sounds) so the OS can
// play them for background notifications, and res/raw names cannot contain
// hyphens — a hyphen silently breaks packaging (see azan_fajr.mp3 history).
//
// The `androidSound` field is the bare filename the Android notification channel
// references; it must match an entry in app.json's expo-notifications.sounds.
export const RECITERS: Reciter[] = [
    {
        id: 'default',
        name: 'Default Adhan',
        location: 'Classic',
        description: 'The built-in azan, bundled with the app',
        audioSource: require('../assets/audio/azan.mp3'),
        androidSound: 'azan.mp3',
    },
    {
        id: 'makkah',
        name: 'Makkah — Sheikh Ali Mulla',
        location: 'Masjid al-Haram, Makkah',
        description: 'The iconic adhan from the Grand Mosque',
        audioSource: require('../assets/audio/azan_makkah.mp3'),
        androidSound: 'azan_makkah.mp3',
    },
    {
        id: 'madinah',
        name: 'Madinah',
        location: "Masjid an-Nabawi, Madinah",
        description: "Adhan from the Prophet's Mosque",
        audioSource: require('../assets/audio/azan_madinah.mp3'),
        androidSound: 'azan_madinah.mp3',
    },
    {
        id: 'aqsa',
        name: 'Al-Aqsa',
        location: 'Jerusalem',
        description: 'Adhan from the third holiest mosque',
        audioSource: require('../assets/audio/azan_aqsa.mp3'),
        androidSound: 'azan_aqsa.mp3',
    },
    {
        id: 'mishary',
        name: 'Mishary Rashid Alafasy',
        location: 'Kuwait',
        description: 'Melodic adhan by the renowned reciter',
        audioSource: require('../assets/audio/azan_mishary.mp3'),
        androidSound: 'azan_mishary.mp3',
    },
    {
        id: 'basit',
        name: 'Abdul Basit Abd us-Samad',
        location: 'Egypt',
        description: 'Classic adhan in the warm Egyptian style',
        audioSource: require('../assets/audio/azan_basit.mp3'),
        androidSound: 'azan_basit.mp3',
    },
];

// Short adhan clip — a brief takbir, used when the "Short Azan" setting is on.
// Overrides the selected reciter and any prayer-specific audio.
export const SHORT_AZAN_AUDIO = require('../assets/audio/azanshort.mp3');

export function getReciter(id: string): Reciter {
    return RECITERS.find(r => r.id === id) ?? RECITERS[0];
}

/**
 * Prayer-specific audio overrides. When a prayer name has an entry here,
 * that audio plays instead of the selected reciter's audio for that prayer.
 *
 * Fajr's adhan includes an extra line — "As-salatu khayrun min an-nawm"
 * ("Prayer is better than sleep") — that the other four daily prayers
 * don't have, so it needs a different recording.
 *
 * To enable Fajr-specific azan:
 *   1. Drop `azan_fajr.mp3` into `assets/audio/`
 *   2. Add `./assets/audio/azan_fajr.mp3` to `expo.plugins[expo-notifications].sounds` in app.json
 *   3. Uncomment the `fajr` line below
 *   4. (Android background) Uncomment the `prayer-azan-fajr` channel block in services/notificationService.ts
 */
import type { PrayerName } from '../services/prayerService';
export const PRAYER_SPECIFIC_AUDIO: Partial<Record<PrayerName, any>> = {
    fajr: require('../assets/audio/azan_fajr.mp3'),
};
