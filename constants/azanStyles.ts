/**
 * Azan Style — per-prayer sound mode.
 *
 *   full    — full ~2-3 min adhan (uses the user's selected reciter)
 *   short   — abbreviated ~30 sec adhan
 *   takbir  — Allahu Akbar only, ~5 sec
 *   silent  — banner notification only, no sound
 *
 * Default policy: Fajr and Maghrib play the full adhan because users
 * most want the full call for the first and breaking-fast prayers.
 * The midday three (Dhuhr/Asr/Isha) default to "short" because users
 * are usually at work, in public, or settling in for the night.
 */

import { PrayerName } from '../services/prayerService';

export type AzanStyle = 'full' | 'short' | 'takbir' | 'silent';

export interface AzanStyleMeta {
    id: AzanStyle;
    label: string;
    emoji: string;
    description: string;
    durationLabel: string;
    // `audioSource` is `require()` output — typed any because RN asset
    // requires return a number. `null` for `full` (uses the reciter) and `silent`.
    audioSource: any | null;
    // Filename used by expo-notifications native channel (no path).
    notificationSound: string | null;
}

export const AZAN_STYLES: AzanStyleMeta[] = [
    {
        id: 'full',
        label: 'Full Azan',
        emoji: '🕌',
        description: 'Complete adhan from your selected reciter',
        durationLabel: '~2–3 min',
        audioSource: null, // resolved at playback time via getReciter()
        notificationSound: 'azan.mp3',
    },
    {
        id: 'short',
        label: 'Short Azan',
        emoji: '⏩',
        description: 'Abbreviated adhan — quick reminder',
        durationLabel: '~30 sec',
        audioSource: require('../assets/audio/azan_short.mp3'),
        notificationSound: 'azan_short.mp3',
    },
    {
        id: 'takbir',
        label: 'Takbir Only',
        emoji: '🔔',
        description: 'Allahu Akbar — subtle prompt',
        durationLabel: '~5 sec',
        audioSource: require('../assets/audio/takbir.mp3'),
        notificationSound: 'takbir.mp3',
    },
    {
        id: 'silent',
        label: 'Silent',
        emoji: '🔕',
        description: 'Notification banner only, no sound',
        durationLabel: '',
        audioSource: null,
        notificationSound: null,
    },
];

export function getAzanStyleMeta(id: AzanStyle): AzanStyleMeta {
    return AZAN_STYLES.find((s) => s.id === id) ?? AZAN_STYLES[0];
}

export const DEFAULT_PRAYER_AZAN_STYLES: Record<PrayerName, AzanStyle> = {
    fajr: 'full',
    sunrise: 'silent',
    dhuhr: 'short',
    asr: 'short',
    maghrib: 'full',
    isha: 'short',
};
