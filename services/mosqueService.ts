import { Linking, Platform } from 'react-native';

export interface Mosque {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    distance: number; // meters
    address?: string;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Format distance for display
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

// Fetch nearby mosques using OpenStreetMap Overpass API (free, no API key)
export async function findNearbyMosques(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000
): Promise<Mosque[]> {
    const query = `
        [out:json][timeout:10];
        (
            node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
            way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
        );
        out center;
    `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data = await response.json();

        const mosques: Mosque[] = data.elements
            .map((el: any) => {
                const lat = el.lat || el.center?.lat;
                const lon = el.lon || el.center?.lon;
                if (!lat || !lon) return null;

                const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ar'] || 'Mosque';
                const address = el.tags?.['addr:full'] || el.tags?.['addr:street'] || '';

                return {
                    id: String(el.id),
                    name,
                    latitude: lat,
                    longitude: lon,
                    distance: haversineDistance(latitude, longitude, lat, lon),
                    address: address || undefined,
                };
            })
            .filter(Boolean) as Mosque[];

        // Sort by distance
        mosques.sort((a, b) => a.distance - b.distance);

        return mosques;
    } catch (error) {
        console.warn('Failed to fetch mosques:', error);
        return [];
    }
}

// Open navigation to a mosque
export function navigateToMosque(latitude: number, longitude: number, name: string): void {
    const encodedName = encodeURIComponent(name);
    const url = Platform.select({
        android: `google.navigation:q=${latitude},${longitude}&label=${encodedName}`,
        ios: `maps://app?daddr=${latitude},${longitude}&dirflg=w`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });

    if (url) {
        Linking.openURL(url).catch(() => {
            // Fallback to Google Maps web
            Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
            );
        });
    }
}
