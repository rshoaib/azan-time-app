// E2E test seams — active ONLY when Metro is started with EXPO_PUBLIC_E2E=1
// (e.g. `npm run start:e2e`). EXPO_PUBLIC_* values are inlined at bundle time,
// so in a normal/production build `E2E` is a compile-time `false` and every
// branch guarded by it is dead-code-eliminated. Nothing here ships to users.
export const E2E = process.env.EXPO_PUBLIC_E2E === '1';

// Fixed device location for deterministic test runs: makes prayer times, the
// Qibla bearing, and the city label stable and removes GPS dependency/flakiness.
export const E2E_LOCATION = {
  latitude: 51.5074,
  longitude: -0.1278,
  city: 'London',
  country: 'United Kingdom',
};
