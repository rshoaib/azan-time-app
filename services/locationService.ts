import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { maybeFireLocationGranted } from './analyticsService';
import { setSavedLocation } from './storageService';
import { E2E, E2E_LOCATION } from './e2eConfig';

export interface LocationResult {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
}

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    // Day-1 retention funnel — step 2. Fires at most once per install.
    if (granted) {
        try { await maybeFireLocationGranted(); } catch {}
    }
    return granted;
}

/**
 * Small helper that resolves after `ms` milliseconds.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensure device location services (GPS) are turned on.
 * On Android this shows a native system dialog so the user can enable
 * location without leaving the app. We then poll briefly to confirm
 * the services actually came up.
 */
async function ensureLocationServicesEnabled(): Promise<boolean> {
    let enabled = await Location.hasServicesEnabledAsync();
    if (enabled) return true;

    // Android: show native "Turn on location" dialog
    if (Platform.OS === 'android') {
        try {
            await Location.enableNetworkProviderAsync();
        } catch {
            // User declined the dialog or it's not available
        }
    }

    // Wait for the OS to actually activate location services.
    // Poll up to 5 times (5 seconds total) because the system dialog
    // resolves before the hardware is fully ready.
    for (let i = 0; i < 5; i++) {
        await delay(1000);
        enabled = await Location.hasServicesEnabledAsync();
        if (enabled) return true;
    }

    return false;
}

/**
 * Try to fetch the device position with retry logic.
 * On a fresh permission grant the OS may need a moment before the
 * location provider is fully ready, so we retry a few times with
 * increasing back-off.
 */
async function getPositionWithRetry(
    maxAttempts = 3,
    initialDelay = 1000,
): Promise<Location.LocationObject> {
    let lastError: any;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            // On retries, give the native provider a moment to warm up.
            if (attempt > 0) {
                await delay(initialDelay * attempt);
            }
            return await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch (e) {
            lastError = e;
            console.warn(`Location attempt ${attempt + 1}/${maxAttempts} failed:`, e);
        }
    }
    throw lastError;
}

export async function getCurrentLocation(): Promise<LocationResult> {
    // E2E: return a fixed location so prayer times / Qibla bearing are
    // deterministic and tests don't depend on real GPS. Stripped in production.
    if (E2E) return E2E_LOCATION;

    // 1. Check / request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        throw new Error('Azan Time needs your location to calculate accurate prayer times. Enable location access in Settings.');
    }

    // 2. Ensure location services (GPS) are on — prompt user if not
    const servicesReady = await ensureLocationServicesEnabled();
    if (!servicesReady) {
        throw new Error('Location services are disabled. Please enable GPS in your device settings and try again.');
    }

    // 3. Small delay after fresh permission grant so the native provider
    //    has time to initialise (avoids the common Android race condition).
    await delay(500);

    // 4. Fetch position with retry
    const location = await getPositionWithRetry();
    const { latitude, longitude } = location.coords;

    // 5. Reverse geocode to get city name
    let city = 'Unknown';
    let country = '';
    try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
            city = address.city || address.subregion || address.region || 'Unknown';
            country = address.country || '';
        }
    } catch (e) {
        console.warn('Reverse geocoding failed:', e);
    }

    return { latitude, longitude, city, country };
}

// ─── Stale-while-revalidate refresh ──────────────────────────────────────────
// The app renders instantly from the cached `saved_location` (fast first paint
// and an offline fallback), then calls maybeRefreshLocation() to follow the user
// when they travel to a new city — without this the cache is written once and
// never updated, so prayer times / Qibla stay stuck on the old city.

// How far the device must move from the cached location before we treat the user
// as having travelled. GPS jitter is a few metres and prayer times barely change
// across a city, so 5 km cleanly separates "same place" from "travelled" without
// false positives from normal location noise.
const MOVE_THRESHOLD_METERS = 5000;

// Don't hit GPS on every screen focus. Auto-revalidate at most once per interval;
// a manual pull-to-refresh passes `force` to bypass this.
const REVALIDATE_INTERVAL_MS = 10 * 60 * 1000;
let lastRevalidateAt = 0;

/** Great-circle distance between two coordinates, in metres (Haversine). */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in metres
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check whether the user has travelled since the cached location was saved, and
 * if so persist the new location and hand it back so the caller can recompute
 * prayer times / Qibla / nearby mosques.
 *
 * Returns `null` when nothing should change — the user hasn't moved far enough,
 * the call was throttled, or GPS is unavailable (offline-safe: we keep the cached
 * location rather than surfacing an error). Never throws.
 *
 * @param current   the location currently on screen (from the cache)
 * @param opts.force bypass the throttle — used by manual pull-to-refresh
 */
export async function maybeRefreshLocation(
    current: LocationResult,
    opts: { force?: boolean } = {},
): Promise<LocationResult | null> {
    // E2E uses a fixed location; it never "moves". Stripped in production.
    if (E2E) return null;

    const now = Date.now();
    if (!opts.force && now - lastRevalidateAt < REVALIDATE_INTERVAL_MS) {
        return null;
    }
    // Stamp before the attempt so repeated failures don't hammer GPS every focus.
    lastRevalidateAt = now;

    let fresh: LocationResult;
    try {
        fresh = await getCurrentLocation();
    } catch {
        // Offline, GPS off, or permission revoked — keep the cached location.
        return null;
    }

    const moved =
        distanceMeters(current.latitude, current.longitude, fresh.latitude, fresh.longitude) >
        MOVE_THRESHOLD_METERS;
    if (!moved) return null;

    await setSavedLocation(fresh);
    return fresh;
}

/** Test seam — reset the revalidation throttle between cases. */
export function __resetLocationRevalidateThrottle(): void {
    lastRevalidateAt = 0;
}
