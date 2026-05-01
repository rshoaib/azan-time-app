import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { maybeFireLocationGranted } from './analyticsService';

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
    // 1. Check / request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        throw new Error('Location permission not granted. Please allow location access in your device settings.');
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
