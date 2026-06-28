import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PrayerName, PrayerTimeEntry, getPrayerTimes } from './prayerService';
import { getAzanShortEnabled, getAzanSoundEnabled, getCalculationMethod, getMadhab, getSavedLocation } from './storageService';
import { maybeFireNotificationGranted, maybeFireFirstPrayerAlarm, logEvent } from './analyticsService';

// Detect if running in Expo Go (notifications are NOT supported in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-loaded notifications module — only imported in dev builds
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
    if (isExpoGo) return null;
    if (!Notifications) {
        Notifications = require('expo-notifications');

        // When Azan sound is enabled, expo-av plays the full-length recording
        // via addNotificationReceivedListener below. Letting the OS also play
        // the channel's sound at the same time would stack two azans on top
        // of each other in the foreground — so we suppress the OS sound when
        // Azan is on, and let the OS handle the default chime when it's off.
        Notifications!.setNotificationHandler({
            handleNotification: async () => {
                const azanOn = await getAzanSoundEnabled();
                return {
                    shouldShowAlert: true,
                    shouldPlaySound: !azanOn,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                };
            },
        });

        // Also play Azan via expo-av when app is in foreground (richer audio)
        const { playAzan } = require('./audioService');
        const { maybeFireFirstAdhanHeard } = require('./analyticsService');
        Notifications!.addNotificationReceivedListener(async (notification: any) => {
            // Fire the first-adhan-heard engagement conversion once per install.
            try { maybeFireFirstAdhanHeard('foreground'); } catch {}
            const azanEnabled = await getAzanSoundEnabled();
            if (azanEnabled) {
                // Route to the right azan recording (Fajr has its own version).
                const prayerName = notification?.request?.content?.data?.prayer as
                    | PrayerName
                    | undefined;
                playAzan(prayerName);
            }
        });

        Notifications!.addNotificationResponseReceivedListener(() => {
            // User tapping the adhan notification still counts as "heard".
            try { maybeFireFirstAdhanHeard('notification_tap'); } catch {}
        });
    }
    return Notifications;
}

/**
 * Number of local notifications currently scheduled. Used by an
 * EXPO_PUBLIC_E2E-gated readout in Settings to verify the scheduling pipeline.
 */
export async function getScheduledNotificationCount(): Promise<number> {
    const notif = await getNotifications();
    if (!notif) return 0;
    const scheduled = await notif.getAllScheduledNotificationsAsync();
    return scheduled.length;
}

/**
 * E2E helper: fire a notification a second from now so the foreground
 * `addNotificationReceivedListener` runs and plays the azan — lets a test verify
 * the delivery -> azan-playback path without waiting for a real prayer time.
 */
export async function fireTestNotification(): Promise<void> {
    const notif = await getNotifications();
    if (!notif) return;
    await notif.scheduleNotificationAsync({
        content: {
            title: 'Azan Time 🕌',
            body: 'E2E test notification',
            sound: true,
            data: { prayer: 'dhuhr' },
        },
        trigger: {
            type: notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
        },
    });
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

    // Android notification channels
    if (Platform.OS === 'android') {
        // Channel WITH Azan sound (for prayer notifications when Azan is enabled)
        await notif.setNotificationChannelAsync('prayer-azan', {
            name: 'Prayer Times (Azan)',
            description: 'Prayer time notifications with Azan sound',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azan.mp3',
        });

        // Channel with the SHORT azan (when "Short Azan" is enabled)
        await notif.setNotificationChannelAsync('prayer-azan-short', {
            name: 'Prayer Times (Short Azan)',
            description: 'Prayer time notifications with a short azan',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azanshort.mp3',
        });

        // Channel with default sound (for prayer notifications when Azan is off)
        await notif.setNotificationChannelAsync('prayer-times', {
            name: 'Prayer Times',
            description: 'Prayer time notifications with default sound',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            // Omit `sound` to use the system default chime. Passing the string
            // 'default' makes expo-notifications hunt for a bundled sound file
            // literally named "default" and throw "Custom sound not found".
        });

        // Fajr-specific channel — Fajr's adhan has the extra "As-salatu khayrun
        // min an-nawm" line, so it plays azan_fajr.mp3 instead of azan.mp3.
        // (Background sound requires azan_fajr.mp3 bundled via app.json sounds +
        // a native rebuild; foreground playback uses PRAYER_SPECIFIC_AUDIO.)
        // NOTE: the file is azan_fajr.mp3 (underscore) — Android res/raw names
        // can't contain hyphens, which silently broke packaging when it was
        // azan-fajr.mp3. The channel id is bumped to `-v2` because Android
        // notification channels are immutable after creation: existing installs
        // created `prayer-azan-fajr` with the (broken) old sound, and a fresh id
        // is the only way to move them onto the now-working azan_fajr.mp3.
        await notif.setNotificationChannelAsync('prayer-azan-fajr-v2', {
            name: 'Fajr Prayer (Azan)',
            description: 'Fajr prayer notifications with Fajr-specific Azan',
            importance: notif.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'azan_fajr.mp3',
        });
    }

    return true;
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
    const azanShort = await getAzanShortEnabled();

    // Schedule notifications for today + the next 2 days (3 days total)
    const loc = await getSavedLocation();
    const method = await getCalculationMethod();
    const madhab = await getMadhab();

    const allPrayers: PrayerTimeEntry[] = [...prayers];

    // Add prayer times for the next 2 days
    if (loc) {
        for (let dayOffset = 1; dayOffset <= 2; dayOffset++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + dayOffset);
            const futureTimes = getPrayerTimes(loc.latitude, loc.longitude, futureDate, method, madhab);
            allPrayers.push(...futureTimes.prayers);
        }
    }

    let scheduled = 0;
    for (const prayer of allPrayers) {
        if (!enabledPrayers[prayer.name]) continue;

        const notificationTime = new Date(prayer.time.getTime() - advanceMinutes * 60 * 1000);

        if (notificationTime <= now) continue;

        // Channel + sound per prayer. Fajr uses its own recording (the extra
        // "As-salatu khayrun min an-nawm" line); the short azan is the same brief
        // takbir for every prayer, so it isn't Fajr-specific.
        const channelId = !azanEnabled
            ? 'prayer-times'
            : azanShort ? 'prayer-azan-short'
            : prayer.name === 'fajr' ? 'prayer-azan-fajr-v2'
            : 'prayer-azan';
        // `true` = system default sound. Bundled files resolve fine; the string
        // 'default' does not — it throws.
        const soundFile: string | boolean = !azanEnabled
            ? true
            : azanShort ? 'azanshort.mp3'
            : prayer.name === 'fajr' ? 'azan_fajr.mp3'
            : 'azan.mp3';

        await notif.scheduleNotificationAsync({
            content: {
                title: 'Azan Time 🕌',
                body: PRAYER_MESSAGES[prayer.name],
                sound: soundFile,
                priority: notif.AndroidNotificationPriority.HIGH,
                // Carry the prayer name so the foreground listener can pick
                // the right azan recording (Fajr has its own variant).
                data: { prayer: prayer.name },
            },
            trigger: {
                type: notif.SchedulableTriggerInputTypes.DATE,
                date: notificationTime,
                channelId: channelId,
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
