import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PrayerName, PrayerTimeEntry, getPrayerTimes } from './prayerService';
import { getAzanSoundEnabled, getCalculationMethod, getSavedLocation } from './storageService';

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
        const { playAzan } = require('./audioService');
        Notifications!.addNotificationReceivedListener(async () => {
            const azanEnabled = await getAzanSoundEnabled();
            if (azanEnabled) {
                playAzan();
            }
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
        const { status } = await notif.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

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
            sound: 'default',
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

    for (const prayer of allPrayers) {
        if (!enabledPrayers[prayer.name]) continue;

        const notificationTime = new Date(prayer.time.getTime() - advanceMinutes * 60 * 1000);

        if (notificationTime <= now) continue;

        // Use Azan sound channel if enabled, otherwise default sound
        const channelId = azanEnabled ? 'prayer-azan' : 'prayer-times';
        const soundFile = azanEnabled ? 'azan.mp3' : 'default';

        await notif.scheduleNotificationAsync({
            content: {
                title: 'Azan Time 🕌',
                body: PRAYER_MESSAGES[prayer.name],
                sound: soundFile,
                priority: notif.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                type: notif.SchedulableTriggerInputTypes.DATE,
                date: notificationTime,
                channelId: channelId,
            },
        });
    }
}

export async function cancelAllNotifications(): Promise<void> {
    const notif = await getNotifications();
    if (!notif) return;
    await notif.cancelAllScheduledNotificationsAsync();
}

