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

// Overpass mirrors, tried in order. The main instance HARD-REQUIRES a
// descriptive User-Agent — an anonymous request (React Native's default okhttp
// UA) is deprioritised and returns 504, which is why this feature was failing
// 100% in the field. A second mirror is tried if the first host errors/times out.
const OVERPASS_HOSTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_USER_AGENT =
    'AzanTime/1.3.8 (OVC Tech prayer-times app; +https://rshoaib.github.io/ovctech; segmentbi@gmail.com)';
const OVERPASS_TIMEOUT_MS = 12000;

// POST the query to each Overpass host in turn (descriptive UA + a hard client
// timeout so a stalled host can never hang the Qibla screen). Returns the parsed
// JSON from the first host that answers, or null if every host fails.
async function overpassFetch(query: string): Promise<any | null> {
    for (const host of OVERPASS_HOSTS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
        try {
            const response = await fetch(host, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': OVERPASS_USER_AGENT,
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
            });
            if (!response.ok) {
                console.warn(`Overpass ${host} → HTTP ${response.status}`);
                continue; // try the next mirror
            }
            return await response.json();
        } catch (error) {
            console.warn(`Overpass ${host} request failed:`, error);
            continue; // timeout / network error → next mirror
        } finally {
            clearTimeout(timer);
        }
    }
    return null;
}

// Fetch nearby mosques using OpenStreetMap Overpass API (free, no API key).
// Degrades gracefully to an empty list if every mirror is unreachable.
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
        const data = await overpassFetch(query);
        if (!data || !Array.isArray(data.elements)) {
            return [];
        }

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
