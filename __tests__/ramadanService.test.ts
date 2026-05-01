import { getRamadanInfo, getHijriDate } from '@/services/ramadanService';
import { PrayerTimesResult } from '@/services/prayerService';

describe('ramadanService', () => {
  // ─── getHijriDate ─────────────────────────────────────────────────
  describe('getHijriDate', () => {
    it('returns year, month, day, and monthName', () => {
      const hijri = getHijriDate();
      expect(typeof hijri.year).toBe('number');
      expect(hijri.month).toBeGreaterThanOrEqual(1);
      expect(hijri.month).toBeLessThanOrEqual(12);
      expect(hijri.day).toBeGreaterThanOrEqual(1);
      expect(hijri.day).toBeLessThanOrEqual(30);
      expect(typeof hijri.monthName).toBe('string');
      expect(hijri.monthName.length).toBeGreaterThan(0);
    });

    it('monthName corresponds to the month number', () => {
      const hijri = getHijriDate();
      const HIJRI_MONTHS = [
        '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
        'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah",
      ];
      expect(hijri.monthName).toBe(HIJRI_MONTHS[hijri.month]);
    });

    it('year is reasonable (14xx range)', () => {
      const hijri = getHijriDate();
      expect(hijri.year).toBeGreaterThanOrEqual(1440);
      expect(hijri.year).toBeLessThanOrEqual(1500);
    });
  });

  // ─── getRamadanInfo ───────────────────────────────────────────────
  describe('getRamadanInfo', () => {
    const mockPrayerTimes: PrayerTimesResult = {
      prayers: [
        { name: 'fajr', label: 'Fajr', time: new Date(2026, 0, 1, 5, 30) },
        { name: 'sunrise', label: 'Sunrise', time: new Date(2026, 0, 1, 6, 45) },
        { name: 'dhuhr', label: 'Dhuhr', time: new Date(2026, 0, 1, 12, 15) },
        { name: 'asr', label: 'Asr', time: new Date(2026, 0, 1, 15, 30) },
        { name: 'maghrib', label: 'Maghrib', time: new Date(2026, 0, 1, 17, 45) },
        { name: 'isha', label: 'Isha', time: new Date(2026, 0, 1, 19, 15) },
      ],
      nextPrayer: 'dhuhr',
      nextPrayerTime: new Date(2026, 0, 1, 12, 15),
      date: new Date(2026, 0, 1),
    };

    it('returns valid RamadanInfo structure', () => {
      const info = getRamadanInfo(mockPrayerTimes);
      expect(typeof info.isRamadan).toBe('boolean');
      expect(typeof info.dayOfRamadan).toBe('number');
      expect(typeof info.daysRemaining).toBe('number');
    });

    it('handles null prayerTimes gracefully', () => {
      const info = getRamadanInfo(null);
      expect(info.suhoorTime).toBeNull();
      expect(info.iftarTime).toBeNull();
    });

    it('dayOfRamadan is 0 when not Ramadan', () => {
      const info = getRamadanInfo(mockPrayerTimes);
      const hijri = getHijriDate();
      if (hijri.month !== 9) {
        expect(info.isRamadan).toBe(false);
        expect(info.dayOfRamadan).toBe(0);
        expect(info.daysRemaining).toBe(0);
      }
    });
  });
});
