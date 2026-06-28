import {
    Coordinates,
    CalculationMethod,
    PrayerTimes,
    Prayer,
    Qibla,
    CalculationParameters,
    Madhab,
} from 'adhan';
import { e2eNow } from './e2eConfig';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

// Asr juristic method. 'standard' (Shafiʿi/Maliki/Hanbali) uses shadow = 1×
// object length; 'hanafi' uses 2× (a later Asr). Default is 'standard'.
export type MadhabKey = 'standard' | 'hanafi';

export interface PrayerTimeEntry {
    name: PrayerName;
    label: string;
    time: Date;
}

export interface PrayerTimesResult {
    prayers: PrayerTimeEntry[];
    nextPrayer: PrayerName | null;
    nextPrayerTime: Date | null;
    date: Date;
}

// Map our method keys to adhan CalculationMethod
function getCalculationParams(methodKey: string): CalculationParameters {
    switch (methodKey) {
        case 'MuslimWorldLeague':
            return CalculationMethod.MuslimWorldLeague();
        case 'Egyptian':
            return CalculationMethod.Egyptian();
        case 'Karachi':
            return CalculationMethod.Karachi();
        case 'UmmAlQura':
            return CalculationMethod.UmmAlQura();
        case 'Dubai':
            return CalculationMethod.Dubai();
        case 'Qatar':
            return CalculationMethod.Qatar();
        case 'Kuwait':
            return CalculationMethod.Kuwait();
        case 'Singapore':
            return CalculationMethod.Singapore();
        case 'NorthAmerica':
            return CalculationMethod.NorthAmerica();
        case 'Tehran':
            return CalculationMethod.Tehran();
        case 'Turkey':
            return CalculationMethod.Turkey();
        default:
            return CalculationMethod.MuslimWorldLeague();
    }
}

export function getPrayerTimes(
    latitude: number,
    longitude: number,
    date: Date = new Date(),
    methodKey: string = 'MuslimWorldLeague',
    madhab: MadhabKey = 'standard'
): PrayerTimesResult {
    const coordinates = new Coordinates(latitude, longitude);
    const params = getCalculationParams(methodKey);
    // Only the Asr calculation depends on the madhab; everything else is shared.
    params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    const prayerTimes = new PrayerTimes(coordinates, date, params);

    const prayers: PrayerTimeEntry[] = [
        { name: 'fajr', label: 'Fajr', time: prayerTimes.fajr },
        { name: 'sunrise', label: 'Sunrise', time: prayerTimes.sunrise },
        { name: 'dhuhr', label: 'Dhuhr', time: prayerTimes.dhuhr },
        { name: 'asr', label: 'Asr', time: prayerTimes.asr },
        { name: 'maghrib', label: 'Maghrib', time: prayerTimes.maghrib },
        { name: 'isha', label: 'Isha', time: prayerTimes.isha },
    ];

    // Determine next prayer relative to e2eNow() (the real clock in production).
    const nextAdhanPrayer = prayerTimes.nextPrayer(e2eNow());
    let nextPrayer: PrayerName | null = null;
    let nextPrayerTime: Date | null = null;

    if (nextAdhanPrayer !== Prayer.None) {
        const prayerMap: Record<string, PrayerName> = {
            [Prayer.Fajr]: 'fajr',
            [Prayer.Sunrise]: 'sunrise',
            [Prayer.Dhuhr]: 'dhuhr',
            [Prayer.Asr]: 'asr',
            [Prayer.Maghrib]: 'maghrib',
            [Prayer.Isha]: 'isha',
        };
        nextPrayer = prayerMap[nextAdhanPrayer as string] || null;
        nextPrayerTime = prayerTimes.timeForPrayer(nextAdhanPrayer) || null;
    }

    return { prayers, nextPrayer, nextPrayerTime, date };
}

export function getQiblaDirection(latitude: number, longitude: number): number {
    const coordinates = new Coordinates(latitude, longitude);
    return Qibla(coordinates);
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

export function getTimeRemaining(target: Date): string {
    const now = e2eNow();
    let diff = target.getTime() - now.getTime();

    if (diff < 0) return '—';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * 1000 * 60 * 60;
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
