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
 */

export interface Reciter {
    id: string;
    name: string;
    location: string;
    description: string;
    // `audioSource` is the result of a `require()` statement.
    // Typed as `any` because React Native's asset require returns a number.
    audioSource: any;
}

// NOTE: replace the `require` paths with real files once you add them to
// assets/audio/. For now only the default `azan.mp3` exists.
export const RECITERS: Reciter[] = [
    {
        id: 'default',
        name: 'Default',
        location: 'Classic adhan',
        description: 'The built-in azan, bundled with the app',
        audioSource: require('../assets/audio/azan.mp3'),
    },
    // Uncomment as you add each audio file:
    // {
    //     id: 'makkah',
    //     name: 'Sheikh Ali Ahmad Mulla',
    //     location: 'Masjid al-Haram, Makkah',
    //     description: 'The iconic adhan from the Great Mosque',
    //     audioSource: require('../assets/audio/azan-makkah.mp3'),
    // },
    // {
    //     id: 'madinah',
    //     name: 'Sheikh Essam Bukhari',
    //     location: "Masjid an-Nabawi, Madinah",
    //     description: "Adhan from the Prophet's Mosque",
    //     audioSource: require('../assets/audio/azan-madinah.mp3'),
    // },
    // {
    //     id: 'aqsa',
    //     name: 'Masjid al-Aqsa',
    //     location: 'Jerusalem',
    //     description: 'Adhan from the third holiest mosque',
    //     audioSource: require('../assets/audio/azan-aqsa.mp3'),
    // },
    // {
    //     id: 'turkish',
    //     name: 'Turkish Adhan',
    //     location: 'Istanbul',
    //     description: 'Ottoman-style melodic adhan',
    //     audioSource: require('../assets/audio/azan-turkish.mp3'),
    // },
    // {
    //     id: 'fajr',
    //     name: 'Fajr Adhan',
    //     location: 'With As-salatu khayrun min an-nawm',
    //     description: 'Traditional Fajr adhan with extra line',
    //     audioSource: require('../assets/audio/azan-fajr.mp3'),
    // },
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
 *   1. Drop `azan-fajr.mp3` into `assets/audio/`
 *   2. Add `./assets/audio/azan-fajr.mp3` to `expo.plugins[expo-notifications].sounds` in app.json
 *   3. Uncomment the `fajr` line below
 *   4. (Android background) Uncomment the `prayer-azan-fajr` channel block in services/notificationService.ts
 */
import type { PrayerName } from '../services/prayerService';
export const PRAYER_SPECIFIC_AUDIO: Partial<Record<PrayerName, any>> = {
    fajr: require('../assets/audio/azan-fajr.mp3'),
};
