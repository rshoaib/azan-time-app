/**
 * Tests for locationService — verifies retry logic, error messages,
 * and the permission / services-enabled checks.
 */

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Mock expo-location before importing
const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();
const mockHasServicesEnabledAsync = jest.fn();
const mockEnableNetworkProviderAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  getCurrentPositionAsync: mockGetCurrentPositionAsync,
  reverseGeocodeAsync: mockReverseGeocodeAsync,
  hasServicesEnabledAsync: mockHasServicesEnabledAsync,
  enableNetworkProviderAsync: mockEnableNetworkProviderAsync,
  Accuracy: { Balanced: 3 },
}));

// Mock the location cache so maybeRefreshLocation's persistence is observable
// without pulling in AsyncStorage.
jest.mock('@/services/storageService', () => ({
  setSavedLocation: jest.fn().mockResolvedValue(undefined),
  getSavedLocation: jest.fn().mockResolvedValue(null),
}));

// analyticsService transitively imports expo-constants (ESM), which jest can't
// parse and which this suite doesn't exercise. locationService only uses the one
// fire-once helper below, so stub it to keep the module graph loadable.
jest.mock('@/services/analyticsService', () => ({
  maybeFireLocationGranted: jest.fn().mockResolvedValue(undefined),
}));

import {
  requestLocationPermission,
  getCurrentLocation,
  maybeRefreshLocation,
  __resetLocationRevalidateThrottle,
} from '@/services/locationService';
import { setSavedLocation } from '@/services/storageService';

const mockSetSavedLocation = setSavedLocation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('locationService', () => {
  // ─── requestLocationPermission ──────────────────────────────────
  describe('requestLocationPermission', () => {
    it('returns true when permission is granted', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      await expect(requestLocationPermission()).resolves.toBe(true);
    });

    it('returns false when permission is denied', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
      await expect(requestLocationPermission()).resolves.toBe(false);
    });
  });

  // ─── getCurrentLocation ─────────────────────────────────────────
  describe('getCurrentLocation', () => {
    const mockCoords = {
      coords: { latitude: 25.2048, longitude: 55.2708 },
    };

    const mockAddress = {
      city: 'Dubai',
      country: 'United Arab Emirates',
      subregion: null,
      region: null,
    };

    function setupSuccess() {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockResolvedValue(mockCoords);
      mockReverseGeocodeAsync.mockResolvedValue([mockAddress]);
    }

    it('returns location with city and country on success', async () => {
      setupSuccess();
      const result = await getCurrentLocation();
      expect(result).toEqual({
        latitude: 25.2048,
        longitude: 55.2708,
        city: 'Dubai',
        country: 'United Arab Emirates',
      });
    });

    it('throws when permission is denied', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
      await expect(getCurrentLocation()).rejects.toThrow(/location access/i);
    });

    it('throws when location services stay disabled after prompt', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(false);
      mockEnableNetworkProviderAsync.mockResolvedValue(undefined);
      await expect(getCurrentLocation()).rejects.toThrow(/services are disabled/i);
      // Should have tried to prompt the user
      expect(mockEnableNetworkProviderAsync).toHaveBeenCalled();
    }, 15000);

    it('succeeds when user enables location after prompt', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      // First check: off. After prompt + poll: on
      mockHasServicesEnabledAsync
        .mockResolvedValueOnce(false)   // initial check
        .mockResolvedValueOnce(false)   // poll 1
        .mockResolvedValueOnce(true);   // poll 2 — user turned it on
      mockEnableNetworkProviderAsync.mockResolvedValue(undefined);
      mockGetCurrentPositionAsync.mockResolvedValue(mockCoords);
      mockReverseGeocodeAsync.mockResolvedValue([mockAddress]);

      const result = await getCurrentLocation();
      expect(result.city).toBe('Dubai');
      expect(mockEnableNetworkProviderAsync).toHaveBeenCalled();
    }, 15000);

    it('retries on getCurrentPositionAsync failure', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync
        .mockRejectedValueOnce(new Error('GPS timeout'))
        .mockResolvedValueOnce(mockCoords);
      mockReverseGeocodeAsync.mockResolvedValue([mockAddress]);

      const result = await getCurrentLocation();
      expect(result.city).toBe('Dubai');
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
    });

    it('throws after all retries are exhausted', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));

      await expect(getCurrentLocation()).rejects.toThrow('GPS unavailable');
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(3);
    }, 15000);

    it('falls back to "Unknown" when reverse geocoding fails', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockResolvedValue(mockCoords);
      mockReverseGeocodeAsync.mockRejectedValue(new Error('Network error'));

      const result = await getCurrentLocation();
      expect(result.city).toBe('Unknown');
      expect(result.country).toBe('');
    });

    it('uses subregion when city is null', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockResolvedValue(mockCoords);
      mockReverseGeocodeAsync.mockResolvedValue([{
        city: null,
        subregion: 'Deira',
        region: 'Dubai',
        country: 'UAE',
      }]);

      const result = await getCurrentLocation();
      expect(result.city).toBe('Deira');
    });

    it('uses region when city and subregion are null', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockResolvedValue(mockCoords);
      mockReverseGeocodeAsync.mockResolvedValue([{
        city: null,
        subregion: null,
        region: 'Abu Dhabi',
        country: 'UAE',
      }]);

      const result = await getCurrentLocation();
      expect(result.city).toBe('Abu Dhabi');
    });
  });

  // ─── maybeRefreshLocation ───────────────────────────────────────
  // Regression: the saved location used to be written once and never
  // refreshed, so a user who travelled kept seeing their old city and
  // its prayer times. maybeRefreshLocation re-checks GPS and updates the
  // cache only when the device has actually moved.
  describe('maybeRefreshLocation', () => {
    const current = {
      latitude: 51.5074,
      longitude: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    };

    function mockGpsAt(latitude: number, longitude: number, city = 'Elsewhere') {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockResolvedValue({ coords: { latitude, longitude } });
      mockReverseGeocodeAsync.mockResolvedValue([
        { city, country: 'X', subregion: null, region: null },
      ]);
    }

    beforeEach(() => {
      __resetLocationRevalidateThrottle();
    });

    it('updates and persists when the user has travelled (>5km)', async () => {
      mockGpsAt(48.8566, 2.3522, 'Paris'); // ~340 km from London
      const result = await maybeRefreshLocation(current, { force: true });
      expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522, city: 'Paris', country: 'X' });
      expect(mockSetSavedLocation).toHaveBeenCalledWith(result);
    });

    it('returns null and keeps the cache when the user has not moved (<5km)', async () => {
      mockGpsAt(51.5080, -0.1290, 'London'); // ~120 m away
      const result = await maybeRefreshLocation(current, { force: true });
      expect(result).toBeNull();
      expect(mockSetSavedLocation).not.toHaveBeenCalled();
    });

    it('returns null and never throws when GPS is unavailable (offline-safe)', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockHasServicesEnabledAsync.mockResolvedValue(true);
      mockGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));
      const result = await maybeRefreshLocation(current, { force: true });
      expect(result).toBeNull();
      expect(mockSetSavedLocation).not.toHaveBeenCalled();
    }, 15000);

    it('throttles auto (non-forced) revalidations — second call skips GPS', async () => {
      mockGpsAt(48.8566, 2.3522, 'Paris');
      await maybeRefreshLocation(current); // first: hits GPS
      const callsAfterFirst = mockGetCurrentPositionAsync.mock.calls.length;
      const result = await maybeRefreshLocation(current); // second: throttled
      expect(result).toBeNull();
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(callsAfterFirst);
    });

    it('force bypasses the throttle', async () => {
      mockGpsAt(48.8566, 2.3522, 'Paris');
      await maybeRefreshLocation(current); // sets the throttle stamp
      const callsAfterFirst = mockGetCurrentPositionAsync.mock.calls.length;
      await maybeRefreshLocation(current, { force: true }); // forced → hits GPS again
      expect(mockGetCurrentPositionAsync.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });
});
