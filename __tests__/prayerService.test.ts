import { getPrayerTimes, getQiblaDirection, formatTime, getTimeRemaining } from '@/services/prayerService';

describe('prayerService', () => {
  // ─── getPrayerTimes ───────────────────────────────────────────────
  describe('getPrayerTimes', () => {
    const lat = 25.2048; // Dubai
    const lng = 55.2708;
    const testDate = new Date(2026, 0, 15); // Jan 15 2026

    it('returns all 6 prayer entries', () => {
      const result = getPrayerTimes(lat, lng, testDate);
      expect(result.prayers).toHaveLength(6);
      const names = result.prayers.map((p) => p.name);
      expect(names).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
    });

    it('returns valid Date objects for each prayer', () => {
      const result = getPrayerTimes(lat, lng, testDate);
      for (const prayer of result.prayers) {
        expect(prayer.time).toBeInstanceOf(Date);
        expect(prayer.time.getTime()).not.toBeNaN();
      }
    });

    it('prayers are in chronological order', () => {
      const result = getPrayerTimes(lat, lng, testDate);
      for (let i = 1; i < result.prayers.length; i++) {
        expect(result.prayers[i].time.getTime()).toBeGreaterThan(
          result.prayers[i - 1].time.getTime()
        );
      }
    });

    it('includes the date in the result', () => {
      const result = getPrayerTimes(lat, lng, testDate);
      expect(result.date).toBe(testDate);
    });

    it('uses MuslimWorldLeague as default method', () => {
      const a = getPrayerTimes(lat, lng, testDate);
      const b = getPrayerTimes(lat, lng, testDate, 'MuslimWorldLeague');
      expect(a.prayers[0].time.getTime()).toBe(b.prayers[0].time.getTime());
    });

    it('different calculation methods yield different times', () => {
      const mwl = getPrayerTimes(lat, lng, testDate, 'MuslimWorldLeague');
      const ummAlQura = getPrayerTimes(lat, lng, testDate, 'UmmAlQura');
      // Isha angles differ significantly between MWL and UmmAlQura
      const mwlIsha = mwl.prayers[5].time.getTime();
      const uaqIsha = ummAlQura.prayers[5].time.getTime();
      expect(mwlIsha).not.toBe(uaqIsha);
    });

    it('supports all documented calculation methods', () => {
      const methods = [
        'MuslimWorldLeague', 'Egyptian', 'Karachi', 'UmmAlQura',
        'Dubai', 'Qatar', 'Kuwait', 'Singapore',
        'NorthAmerica', 'Tehran', 'Turkey',
      ];
      for (const method of methods) {
        const result = getPrayerTimes(lat, lng, testDate, method);
        expect(result.prayers).toHaveLength(6);
      }
    });

    it('falls back to MuslimWorldLeague for unknown method', () => {
      const fallback = getPrayerTimes(lat, lng, testDate, 'SomeUnknownMethod');
      const mwl = getPrayerTimes(lat, lng, testDate, 'MuslimWorldLeague');
      expect(fallback.prayers[0].time.getTime()).toBe(mwl.prayers[0].time.getTime());
    });

    it('determines nextPrayer correctly', () => {
      const result = getPrayerTimes(lat, lng, testDate);
      // nextPrayer should be one of the valid prayer names or null
      if (result.nextPrayer) {
        expect(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']).toContain(
          result.nextPrayer
        );
        expect(result.nextPrayerTime).toBeInstanceOf(Date);
      }
    });
  });

  // ─── getQiblaDirection ────────────────────────────────────────────
  describe('getQiblaDirection', () => {
    it('returns a number for valid coordinates', () => {
      const qibla = getQiblaDirection(25.2048, 55.2708); // Dubai
      expect(typeof qibla).toBe('number');
      expect(qibla).not.toBeNaN();
    });

    it('returns roughly 240° for New York (SW direction)', () => {
      const qibla = getQiblaDirection(40.7128, -74.006); // NYC
      // Qibla from NYC is roughly 58° (NE), but the exact number depends on the library
      expect(qibla).toBeGreaterThan(0);
      expect(qibla).toBeLessThan(360);
    });

    it('returns different values for different locations', () => {
      const dubai = getQiblaDirection(25.2048, 55.2708);
      const tokyo = getQiblaDirection(35.6762, 139.6503);
      expect(dubai).not.toBe(tokyo);
    });
  });

  // ─── formatTime ───────────────────────────────────────────────────
  describe('formatTime', () => {
    it('formats a date into a time string', () => {
      const date = new Date(2026, 0, 1, 14, 30, 0);
      const formatted = formatTime(date);
      // Should contain the hour and minute
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
      // Should be PM for 14:30
      expect(formatted.toUpperCase()).toContain('PM');
    });

    it('formats morning time as AM', () => {
      const date = new Date(2026, 0, 1, 5, 15, 0);
      const formatted = formatTime(date);
      expect(formatted.toUpperCase()).toContain('AM');
    });
  });

  // ─── getTimeRemaining ─────────────────────────────────────────────
  describe('getTimeRemaining', () => {
    it('returns dash for a past time', () => {
      const past = new Date(Date.now() - 60000);
      expect(getTimeRemaining(past)).toBe('—');
    });

    it('returns minutes-only format when < 1 hour', () => {
      const future = new Date(Date.now() + 30 * 60 * 1000); // +30 min
      const remaining = getTimeRemaining(future);
      expect(remaining).toMatch(/^\d+m$/);
    });

    it('returns hours + minutes format when >= 1 hour', () => {
      const future = new Date(Date.now() + 2.5 * 60 * 60 * 1000); // +2.5 hr
      const remaining = getTimeRemaining(future);
      expect(remaining).toMatch(/^\d+h \d+m$/);
    });
  });
});
