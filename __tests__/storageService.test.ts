/**
 * Tests for storageService — AsyncStorage wrapper functions.
 */

// In-memory AsyncStorage mock
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((k) => [k, store[k] ?? null] as [string, string | null]))
  ),
}));

import {
  getCalculationMethod,
  setCalculationMethod,
  getNotificationEnabled,
  setNotificationEnabled,
  getEnabledPrayers,
  setEnabledPrayers,
  getAdvanceMinutes,
  setAdvanceMinutes,
  getSavedLocation,
  setSavedLocation,
  getAzanSoundEnabled,
  setAzanSoundEnabled,
  getDayLog,
  setPrayerStatus,
  getQadaCount,
  incrementQada,
  decrementQada,
  getTasbihCount,
  setTasbihCount,
} from '@/services/storageService';

beforeEach(() => {
  // Clear store before each test
  Object.keys(store).forEach((k) => delete store[k]);
});

describe('storageService', () => {
  // ─── Calculation Method ───────────────────────────────────────────
  describe('calculationMethod', () => {
    it('defaults to MuslimWorldLeague', async () => {
      expect(await getCalculationMethod()).toBe('MuslimWorldLeague');
    });

    it('round-trips a saved value', async () => {
      await setCalculationMethod('Karachi');
      expect(await getCalculationMethod()).toBe('Karachi');
    });
  });

  // ─── Notification toggle ─────────────────────────────────────────
  describe('notificationEnabled', () => {
    it('defaults to true', async () => {
      expect(await getNotificationEnabled()).toBe(true);
    });

    it('saves and retrieves false', async () => {
      await setNotificationEnabled(false);
      expect(await getNotificationEnabled()).toBe(false);
    });

    it('saves and retrieves true', async () => {
      await setNotificationEnabled(true);
      expect(await getNotificationEnabled()).toBe(true);
    });
  });

  // ─── Enabled Prayers ─────────────────────────────────────────────
  describe('enabledPrayers', () => {
    it('returns defaults when nothing saved', async () => {
      const prayers = await getEnabledPrayers();
      expect(prayers.fajr).toBe(true);
      expect(prayers.sunrise).toBe(false);
      expect(prayers.dhuhr).toBe(true);
      expect(prayers.isha).toBe(true);
    });

    it('round-trips custom settings', async () => {
      const custom = {
        fajr: false, sunrise: true, dhuhr: false,
        asr: false, maghrib: true, isha: false,
      };
      await setEnabledPrayers(custom);
      expect(await getEnabledPrayers()).toEqual(custom);
    });
  });

  // ─── Advance Minutes ─────────────────────────────────────────────
  describe('advanceMinutes', () => {
    it('defaults to 0', async () => {
      expect(await getAdvanceMinutes()).toBe(0);
    });

    it('saves and retrieves a number', async () => {
      await setAdvanceMinutes(15);
      expect(await getAdvanceMinutes()).toBe(15);
    });
  });

  // ─── Saved Location ──────────────────────────────────────────────
  describe('savedLocation', () => {
    it('returns null when nothing saved', async () => {
      expect(await getSavedLocation()).toBeNull();
    });

    it('round-trips a location object', async () => {
      const loc = { latitude: 25.2, longitude: 55.3, city: 'Dubai', country: 'UAE' };
      await setSavedLocation(loc);
      expect(await getSavedLocation()).toEqual(loc);
    });
  });

  // ─── Azan Sound ───────────────────────────────────────────────────
  describe('azanSoundEnabled', () => {
    it('defaults to true', async () => {
      expect(await getAzanSoundEnabled()).toBe(true);
    });

    it('saves and retrieves false', async () => {
      await setAzanSoundEnabled(false);
      expect(await getAzanSoundEnabled()).toBe(false);
    });
  });

  // ─── Prayer Tracker / Day Log ─────────────────────────────────────
  describe('dayLog', () => {
    it('returns empty log when no data', async () => {
      const log = await getDayLog(new Date(2026, 0, 1));
      expect(log).toEqual({ fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null });
    });

    it('sets and retrieves a prayer status', async () => {
      const date = new Date(2026, 0, 1);
      await setPrayerStatus(date, 'fajr', 'prayed');
      const log = await getDayLog(date);
      expect(log.fajr).toBe('prayed');
      expect(log.dhuhr).toBeNull(); // Others unchanged
    });

    it('supports multiple statuses on same day', async () => {
      const date = new Date(2026, 0, 2);
      await setPrayerStatus(date, 'fajr', 'prayed');
      await setPrayerStatus(date, 'dhuhr', 'missed');
      await setPrayerStatus(date, 'asr', 'qada');
      const log = await getDayLog(date);
      expect(log.fajr).toBe('prayed');
      expect(log.dhuhr).toBe('missed');
      expect(log.asr).toBe('qada');
    });
  });

  // ─── Qada Counter ────────────────────────────────────────────────
  describe('qadaCount', () => {
    it('defaults to all zeros', async () => {
      const counts = await getQadaCount();
      expect(counts.fajr).toBe(0);
      expect(counts.isha).toBe(0);
    });

    it('increments a prayer count', async () => {
      await incrementQada('fajr');
      await incrementQada('fajr');
      const counts = await getQadaCount();
      expect(counts.fajr).toBe(2);
    });

    it('decrements but not below zero', async () => {
      await decrementQada('dhuhr');
      const counts = await getQadaCount();
      expect(counts.dhuhr).toBe(0);
    });

    it('increment then decrement restores original', async () => {
      await incrementQada('asr');
      await incrementQada('asr');
      await decrementQada('asr');
      const counts = await getQadaCount();
      expect(counts.asr).toBe(1);
    });
  });

  // ─── Tasbih Counter ──────────────────────────────────────────────
  describe('tasbihCount', () => {
    it('defaults to 0', async () => {
      expect(await getTasbihCount()).toBe(0);
    });

    it('saves and retrieves a count', async () => {
      await setTasbihCount(33);
      expect(await getTasbihCount()).toBe(33);
    });
  });
});
