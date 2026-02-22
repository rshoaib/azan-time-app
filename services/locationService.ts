import * as Location from 'expo-location';

export interface LocationResult {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
}

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationResult> {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    // Reverse geocode to get city name
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
