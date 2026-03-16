import { PrayerTimesResult } from './prayerService';

// Approximate Hijri date calculation
// This uses a simplified algorithm — accurate to ±1 day
function toHijri(date: Date): { year: number; month: number; day: number } {
    const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
        + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
        - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    return { year, month, day };
}

export interface RamadanInfo {
    isRamadan: boolean;
    dayOfRamadan: number; // 1-30
    daysRemaining: number;
    suhoorTime: Date | null; // Fajr time
    iftarTime: Date | null;  // Maghrib time
}

export function getRamadanInfo(prayerTimes: PrayerTimesResult | null): RamadanInfo {
    const hijri = toHijri(new Date());

    const isRamadan = hijri.month === 9; // Ramadan is the 9th month
    const dayOfRamadan = isRamadan ? hijri.day : 0;
    const daysRemaining = isRamadan ? Math.max(0, 30 - hijri.day) : 0;

    let suhoorTime: Date | null = null;
    let iftarTime: Date | null = null;

    if (isRamadan && prayerTimes) {
        // Suhoor ends at Fajr, Iftar is at Maghrib
        const fajr = prayerTimes.prayers.find(p => p.name === 'fajr');
        const maghrib = prayerTimes.prayers.find(p => p.name === 'maghrib');
        suhoorTime = fajr ? fajr.time : null;
        iftarTime = maghrib ? maghrib.time : null;
    }

    return { isRamadan, dayOfRamadan, daysRemaining, suhoorTime, iftarTime };
}

export function getHijriDate(): { year: number; month: number; day: number; monthName: string } {
    const hijri = toHijri(new Date());
    const HIJRI_MONTHS = [
        '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];
    return { ...hijri, monthName: HIJRI_MONTHS[hijri.month] || '' };
}
