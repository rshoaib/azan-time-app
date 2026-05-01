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

import { requestLocationPermission, getCurrentLocation } from '@/services/locationService';

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
      await expect(getCurrentLocation()).rejects.toThrow(/permission not granted/i);
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
});
