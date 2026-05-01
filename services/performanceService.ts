/**
 * Performance Monitoring service — Firebase Performance via @react-native-firebase.
 *
 * Most signal we care about — app start time, slow renders, and HTTP request
 * latency — is captured automatically by the SDK once it's installed. This
 * module:
 *  - Lazy-loads the native module (safe in Expo Go and on web)
 *  - Provides a `traceAsync` helper for measuring our own hot paths
 *    (location lookup, prayer-time calculation, notification scheduling)
 *
 * Why this matters for retention:
 *  First-launch latency is one of the biggest Day-1 retention killers in
 *  utility apps. If location lookup or first prayer-time calculation takes
 *  >2s, users assume the app is broken and uninstall. Custom traces tell us
 *  exactly which step is slow on which device class.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';
const isPerfAvailable = !isExpoGo && Platform.OS !== 'web';

let perfModule: any = null;

function loadPerfModule(): any | null {
  if (!isPerfAvailable) return null;
  if (perfModule) return perfModule;
  try {
    perfModule = require('@react-native-firebase/perf').default;
    return perfModule;
  } catch {
    return null;
  }
}

export function isPerfRuntimeAvailable(): boolean {
  return loadPerfModule() !== null;
}

/**
 * Bootstrap Performance Monitoring — call once at app startup. The SDK auto-
 * starts on its own; this just defensively flips the collection flag in case
 * a previous user had it disabled.
 */
export async function bootstrapPerformance(): Promise<void> {
  const perf = loadPerfModule();
  if (!perf) return;
  try {
    await perf().setPerformanceCollectionEnabled(true);
  } catch (err) {
    console.warn('[perf] bootstrap failed:', err);
  }
}

/**
 * Wrap an async operation with a custom Performance trace. The trace name
 * shows up as a custom metric in Firebase Performance with p50 / p90 / p95
 * distributions. Trace name must be <=100 chars and match [A-Za-z][A-Za-z0-9_]*.
 *
 * Usage:
 *   const prayers = await traceAsync('calc_prayer_times', () => calc(...));
 */
export async function traceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const perf = loadPerfModule();
  if (!perf) return fn();
  let trace: any = null;
  try {
    trace = await perf().startTrace(name);
  } catch {
    return fn();
  }
  try {
    return await fn();
  } finally {
    try {
      if (trace) await trace.stop();
    } catch {
      // swallow — perf tracing must never break the call site
    }
  }
}

/**
 * Same idea but for synchronous code. Returns the result; the trace duration
 * is measured by wall clock.
 */
export async function traceSync<T>(name: string, fn: () => T): Promise<T> {
  const perf = loadPerfModule();
  if (!perf) return fn();
  let trace: any = null;
  try {
    trace = await perf().startTrace(name);
  } catch {
    return fn();
  }
  try {
    return fn();
  } finally {
    try {
      if (trace) await trace.stop();
    } catch {
      // swallow
    }
  }
}
