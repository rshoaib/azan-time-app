import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PrayerName, PrayerTimeEntry, getPrayerTimes } from './prayerService';
import {
    getAzanSoundEnabled,
    getCalculationMethod,
    getSavedLocation,
    getPrayerAzanStyles,
} from './storageService';
import { maybeFireNotificationGranted, maybeFireFirstPrayerAlarm, logEvent } from './analyticsService';
import { AzanStyle } from '../constants/azanStyles';

// Detect if running in Expo Go (notifications are NOT supported in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-loaded notifications module — only imported in dev builds
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
    if (isExpoGo) return null;
    if (!Notifications) {
        Notifications = require('expo-notifications');

        // Configure notification handler
        Notifications!.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        // Also play Azan via expo-av when app is in foreground (richer audio)
        const { playAzan, playAzanForPrayer } = require('./audioService');
        const { maybeFireFirstAdhanHeard } = require('./analyticsService');
        Notifications!.addNotificationReceivedListener(async (notification: any) => {
            // Fire the first-adhan-heard engagement conversion once per install.
            try { maybeFireFirstAdhanHeard('foreground'); } catch {}
            const azanEnabled = await getAzanSoundEnabled();
            if (!azanEnabled) return;
            // Use the per-prayer style if we can identify the prayer from the
            // notification payload; otherwise fall back to full azan.
            const prayerName: PrayerName | undefined =
                notification?.request?.content?.data?.prayer;
            if (prayerName) {
                playAzanForPrayer(prayerName);
            } else {
                playAzan();
            }
        });

        Notifications!.addNotificationResponseReceivedListener(() => {
            // User tapping the adhan notification still counts as "heard".
            try { maybeFireFirstAdhanHeard('notification_tap'); } catch {}
        });
    }
    return Notifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
    const notif = await getNotifications();
    if (!notif) {
        console.log('Notifications skipped (Expo Go). Use a dev build for full functionality.');
        return false;
    }

    const { status: existingStatus } = await notif.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        // Funnel diagnostic — fires every time the OS prompt is actually shown,
        // so we can compare against `notification_granted` and `notification_denied`
        // and tell whether users are seeing the prompt at all (vs. seeing it
        // but saying no). Not fire-once — this is a per-prompt event by design.
        try { await logEvent('notification_prompt_shown', { previous_status: existingStatus }); } catch {}
        const { status } = await notif.requestPermissionsAsync();
        finalStatus = status;
        if (status !== 'granted') {
            // Per-prompt event (not fire-once) — captures the deny reason granularly.
            // Use this against `notification_prompt_shown` to compute deny rate.
            try { await logEvent('notification_denied', { result_status: status }); } catch {}
        }
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    // Day-1 retention funnel — step 3. Fires at most once per install.
    try { await maybeFireNotificationGranted(); } catch {}

    // Android notification channels — one per azan style.
    // Channel sounds are immutable once created, so each style gets its own
    // distinct channel ID. Re-naming a channel ID later (e.g. v2 suffix)
    // forces Android to re-register with the new sound.
    if (Platform.OS === 'android') {
        await notif.setNotificationChannelAsync('prayer-azan-full', {
            name: 'Prayer Times — Full Azan',
            description: 'Plays the full adhan when a prayer arrives',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azan.mp3',
        });

        await notif.setNotificationChannelAsync('prayer-azan-short', {
            name: 'Prayer Times — Short Azan',
            description: 'Plays an abbreviated ~30 sec adhan',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azan_short.mp3',
        });

        await notif.setNotificationChannelAsync('prayer-azan-takbir', {
            name: 'Prayer Times — Takbir Only',
            description: 'Plays a brief Allahu Akbar reminder (~5 sec)',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'takbir.mp3',
        });

        await notif.setNotificationChannelAsync('prayer-silent', {
            name: 'Prayer Times — Silent',
            description: 'Banner notification only, no sound',
            importance: notif.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: null,
        });

        // Keep the legacy channel registered so existing scheduled
        // notifications (from older app versions) still fire.
        await notif.setNotificationChannelAsync('prayer-azan', {
            name: 'Prayer Times (Legacy)',
            description: 'Legacy prayer channel from previous app versions',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azan.mp3',
        });
    }

    return true;
}

function resolveChannelAndSound(style: AzanStyle): { channelId: string; soundFile: string | undefined } {
    switch (style) {
        case 'short':
            return { channelId: 'prayer-azan-short', soundFile: 'azan_short.mp3' };
        case 'takbir':
            return { channelId: 'prayer-azan-takbir', soundFile: 'takbir.mp3' };
        case 'silent':
            return { channelId: 'prayer-silent', soundFile: undefined };
        case 'full':
        default:
            return { channelId: 'prayer-azan-full', soundFile: 'azan.mp3' };
    }
}

const PRAYER_MESSAGES: Record<PrayerName, string> = {
    fajr: '🌙 Fajr — Time for the dawn prayer',
    sunrise: '🌅 Sunrise — The sun has risen',
    dhuhr: '☀️ Dhuhr — Time for the noon prayer',
    asr: '🌤️ Asr — Time for the afternoon prayer',
    maghrib: '🌇 Maghrib — Time for the sunset prayer',
    isha: '⭐ Isha — Time for the night prayer',
};

export async function schedulePrayerNotifications(
    prayers: PrayerTimeEntry[],
    enabledPrayers: Record<PrayerName, boolean>,
    advanceMinutes: number = 0
): Promise<void> {
    const notif = await getNotifications();
    if (!notif) return;

    // Cancel all existing scheduled notifications
    await notif.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const azanEnabled = await getAzanSoundEnabled();

    // Schedule notifications for today + the next 2 days (3 days total)
    const loc = await getSavedLocation();
    const method = await getCalculationMethod();

    const allPrayers: PrayerTimeEntry[] = [...prayers];

    // Add prayer times for the next 2 days
    if (loc) {
        for (let dayOffset = 1; dayOffset <= 2; dayOffset++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + dayOffset);
            const futureTimes = getPrayerTimes(loc.latitude, loc.longitude, futureDate, method);
            allPrayers.push(...futureTimes.prayers);
        }
    }

    // Per-prayer azan style — picked here so each scheduled notification
    // uses the right channel + sound file.
    const prayerStyles = await getPrayerAzanStyles();

    let scheduled = 0;
    for (const prayer of allPrayers) {
        if (!enabledPrayers[prayer.name]) continue;

        const notificationTime = new Date(prayer.time.getTime() - advanceMinutes * 60 * 1000);
        if (notificationTime <= now) continue;

        // Resolve channel + sound for this prayer. When the master azan
        // toggle is off, everything routes to the silent channel.
        const effectiveStyle: AzanStyle = azanEnabled ? (prayerStyles[prayer.name] ?? 'full') : 'silent';
        const { channelId, soundFile } = resolveChannelAndSound(effectiveStyle);

        await notif.scheduleNotificationAsync({
            content: {
                title: 'Azan Time 🕌',
                body: PRAYER_MESSAGES[prayer.name],
                sound: soundFile,
                priority: notif.AndroidNotificationPriority.HIGH,
                data: { prayer: prayer.name, style: effectiveStyle },
            },
            trigger: {
                type: notif.SchedulableTriggerInputTypes.DATE,
                date: notificationTime,
                channelId,
            },
        });
        scheduled++;
    }

    // Day-1 retention funnel — step 4. Fires at most once per install, the
    // first time we successfully schedule at least one prayer alarm. This is
    // the moment Azan Time's core promise lands.
    if (scheduled > 0) {
        try { await maybeFireFirstPrayerAlarm(scheduled); } catch {}
    }
}

export async function cancelAllNotifications(): Promise<void> {
    const notif = await getNotifications();
    if (!notif) return;
    await notif.cancelAllScheduledNotificationsAsync();
}
