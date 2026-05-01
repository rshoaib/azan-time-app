import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerName } from './prayerService';

const KEYS = {
    CALCULATION_METHOD: 'calculation_method',
    NOTIFICATION_ENABLED: 'notification_enabled',
    ENABLED_PRAYERS: 'enabled_prayers',
    ADVANCE_MINUTES: 'advance_minutes',
    SAVED_LOCATION: 'saved_location',
    AZAN_SOUND_ENABLED: 'azan_sound_enabled',
    AZAN_RECITER: 'azan_reciter',
};

export interface SavedLocation {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
}

const DEFAULT_ENABLED_PRAYERS: Record<PrayerName, boolean> = {
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
};

// Calculation method
export async function getCalculationMethod(): Promise<string> {
    const value = await AsyncStorage.getItem(KEYS.CALCULATION_METHOD);
    return value || 'MuslimWorldLeague';
}

export async function setCalculationMethod(method: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.CALCULATION_METHOD, method);
}

// Notification master toggle
export async function getNotificationEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.NOTIFICATION_ENABLED);
    return value === null ? true : value === 'true';
}

export async function setNotificationEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.NOTIFICATION_ENABLED, enabled.toString());
}

// Per-prayer notification toggles
export async function getEnabledPrayers(): Promise<Record<PrayerName, boolean>> {
    const value = await AsyncStorage.getItem(KEYS.ENABLED_PRAYERS);
    if (value) {
        return JSON.parse(value);
    }
    return DEFAULT_ENABLED_PRAYERS;
}

export async function setEnabledPrayers(prayers: Record<PrayerName, boolean>): Promise<void> {
    await AsyncStorage.setItem(KEYS.ENABLED_PRAYERS, JSON.stringify(prayers));
}

// Advance notification minutes
export async function getAdvanceMinutes(): Promise<number> {
    const value = await AsyncStorage.getItem(KEYS.ADVANCE_MINUTES);
    return value ? parseInt(value, 10) : 0;
}

export async function setAdvanceMinutes(minutes: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.ADVANCE_MINUTES, minutes.toString());
}

// Saved location
export async function getSavedLocation(): Promise<SavedLocation | null> {
    const value = await AsyncStorage.getItem(KEYS.SAVED_LOCATION);
    if (value) {
        return JSON.parse(value);
    }
    return null;
}

export async function setSavedLocation(location: SavedLocation): Promise<void> {
    await AsyncStorage.setItem(KEYS.SAVED_LOCATION, JSON.stringify(location));
}

// Azan sound playback toggle
export async function getAzanSoundEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.AZAN_SOUND_ENABLED);
    return value === null ? true : value === 'true';
}

export async function setAzanSoundEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.AZAN_SOUND_ENABLED, enabled.toString());
}

// Azan reciter selection (personalization — strong retention lever)
export async function getAzanReciter(): Promise<string> {
    const value = await AsyncStorage.getItem(KEYS.AZAN_RECITER);
    return value || 'default';
}

export async function setAzanReciter(reciterId: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.AZAN_RECITER, reciterId);
}

// ============ Prayer Tracker ============

export type PrayerStatus = 'prayed' | 'missed' | 'qada' | null;

export interface DayLog {
    fajr: PrayerStatus;
    dhuhr: PrayerStatus;
    asr: PrayerStatus;
    maghrib: PrayerStatus;
    isha: PrayerStatus;
}

const EMPTY_DAY: DayLog = { fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null };

function dateKey(date: Date): string {
    return `prayer_log_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getDayLog(date: Date): Promise<DayLog> {
    const value = await AsyncStorage.getItem(dateKey(date));
    return value ? JSON.parse(value) : { ...EMPTY_DAY };
}

export async function setPrayerStatus(date: Date, prayer: keyof DayLog, status: PrayerStatus): Promise<void> {
    const log = await getDayLog(date);
    log[prayer] = status;
    await AsyncStorage.setItem(dateKey(date), JSON.stringify(log));
}

export async function getWeekLog(): Promise<{ date: Date; log: DayLog }[]> {
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d);
    }
    const keys = dates.map(dateKey);
    const pairs = await AsyncStorage.multiGet(keys);
    return dates.map((date, i) => ({
        date,
        log: pairs[i][1] ? JSON.parse(pairs[i][1]!) : { ...EMPTY_DAY },
    }));
}

export async function getStreak(): Promise<number> {
    let streak = 0;
    const today = new Date();
    const prayers: (keyof DayLog)[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    // Batch-read in chunks of 30 days at a time for efficiency
    const CHUNK_SIZE = 30;
    let offset = 0;
    let done = false;

    while (!done && offset < 365) {
        const dates: Date[] = [];
        for (let i = offset; i < Math.min(offset + CHUNK_SIZE, 365); i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }
        const keys = dates.map(dateKey);
        const pairs = await AsyncStorage.multiGet(keys);

        for (let j = 0; j < pairs.length; j++) {
            const i = offset + j;
            const log: DayLog = pairs[j][1] ? JSON.parse(pairs[j][1]!) : { ...EMPTY_DAY };
            const allPrayed = prayers.every((p) => log[p] === 'prayed');
            if (allPrayed) {
                streak++;
            } else if (i === 0) {
                // Today might not be complete yet, skip it
                continue;
            } else {
                done = true;
                break;
            }
        }
        offset += CHUNK_SIZE;
    }
    return streak;
}

// Qada counter
export async function getQadaCount(): Promise<Record<string, number>> {
    const value = await AsyncStorage.getItem('qada_counter');
    return value ? JSON.parse(value) : { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
}

export async function incrementQada(prayer: string): Promise<void> {
    const counts = await getQadaCount();
    counts[prayer] = (counts[prayer] || 0) + 1;
    await AsyncStorage.setItem('qada_counter', JSON.stringify(counts));
}

export async function decrementQada(prayer: string): Promise<void> {
    const counts = await getQadaCount();
    counts[prayer] = Math.max(0, (counts[prayer] || 0) - 1);
    await AsyncStorage.setItem('qada_counter', JSON.stringify(counts));
}

// Tasbih counter
export async function getTasbihCount(): Promise<number> {
    const value = await AsyncStorage.getItem('tasbih_count');
    return value ? parseInt(value, 10) : 0;
}

export async function setTasbihCount(count: number): Promise<void> {
    await AsyncStorage.setItem('tasbih_count', count.toString());
}
