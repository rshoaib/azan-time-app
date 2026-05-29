import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PrayerName, PrayerTimeEntry, getPrayerTimes } from './prayerService';
import { getAzanSoundEnabled, getCalculationMethod, getSavedLocation } from './storageService';
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

        // Fajr-specific channel — enable once `azan-fajr.mp3` is bundled. Until
        // then, Fajr falls through to `prayer-azan` (same recording as the other
        // prayers). Foreground playback already picks the Fajr file via
        // PRAYER_SPECIFIC_AUDIO the moment you uncomment it in reciters.ts.
        // To enable for BACKGROUND Android:
        //   1. Drop `assets/audio/azan-fajr.mp3`
        //   2. Add it to `expo.plugins[expo-notifications].sounds` in app.json
        //   3. Uncomment the block below
        //   4. Route Fajr to this channel in schedulePrayerNotifications (also commented below)
        //
        // await notif.setNotificationChannelAsync('prayer-azan-fajr', {
        //     name: 'Fajr Prayer (Azan)',
        //     description: 'Fajr prayer notifications with Fajr-specific Azan',
        //     importance: notif.AndroidImportance.MAX,
        //     vibrationPattern: [0, 250, 250, 250],
        //     sound: 'azan-fajr.mp3',
        // });
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

    let scheduled = 0;
    for (const prayer of allPrayers) {
        if (!enabledPrayers[prayer.name]) continue;

        const notificationTime = new Date(prayer.time.getTime() - advanceMinutes * 60 * 1000);

        if (notificationTime <= now) continue;

        // Use Azan sound channel if enabled, otherwise default sound.
        // Once `azan-fajr.mp3` is bundled (see channel setup above), route Fajr
        // to its own channel so Android background notifications also use the
        // Fajr-specific recording:
        //   const channelId = !azanEnabled
        //       ? 'prayer-times'
        //       : prayer.name === 'fajr' ? 'prayer-azan-fajr' : 'prayer-azan';
        //   const soundFile = !azanEnabled
        //       ? 'default'
        //       : prayer.name === 'fajr' ? 'azan-fajr.mp3' : 'azan.mp3';
        const channelId = azanEnabled ? 'prayer-azan' : 'prayer-times';
        // `true` = system default sound. The bundled custom file ('azan.mp3')
        // resolves fine; the string 'default' does not — it throws.
        const soundFile: string | boolean = azanEnabled ? 'azan.mp3' : true;

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
