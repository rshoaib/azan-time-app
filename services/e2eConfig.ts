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

// Fixed "now" for deterministic time-based UI (next prayer + countdown). Returns
// the real clock in normal/production builds, so behavior there is unchanged.
const E2E_NOW_ISO = '2026-05-29T10:00:00.000Z';
export function e2eNow(): Date {
  return E2E ? new Date(E2E_NOW_ISO) : new Date();
}

// One-shot error trigger: a test arms it (via a hidden Settings control), and the
// next home load consumes it and throws — driving the error/Retry screen on demand.
let _forceError = false;
export function e2eSetForceError(): void {
  _forceError = true;
}
export function e2eConsumeForceError(): boolean {
  const v = _forceError;
  _forceError = false;
  return v;
}
