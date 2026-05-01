/**
 * Crashlytics service — Firebase Crashlytics via @react-native-firebase.
 *
 * Owns:
 *  - Lazy native-module loading (safe in Expo Go and on web — silently no-ops)
 *  - Bootstrap that enables collection at startup
 *  - Helpers to attach user/context keys, log breadcrumbs, and record non-fatal
 *    JS errors so we get stack traces in the Firebase console
 *
 * Why this exists:
 *  Azan Time is at 549 DAU and growing fast. A single ANR or crash on a popular
 *  Android OEM (Samsung One UI 6, Xiaomi MIUI, etc.) can silently tank Day-1
 *  retention without us noticing. Crashlytics gives us per-issue user counts,
 *  device breakdowns, and stack traces so we can fix regressions before they
 *  spread.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';
const isCrashlyticsAvailable = !isExpoGo && Platform.OS !== 'web';

let crashlyticsModule: any = null;

function loadCrashlyticsModule(): any | null {
  if (!isCrashlyticsAvailable) return null;
  if (crashlyticsModule) return crashlyticsModule;
  try {
    crashlyticsModule = require('@react-native-firebase/crashlytics').default;
    return crashlyticsModule;
  } catch {
    return null;
  }
}

export function isCrashlyticsRuntimeAvailable(): boolean {
  return loadCrashlyticsModule() !== null;
}

/**
 * Bootstrap Crashlytics — call once at app startup. Enables collection (it is
 * already on by default but we set it defensively) and emits a sentinel
 * breadcrumb so we can confirm the pipeline is alive in the console.
 */
export async function bootstrapCrashlytics(): Promise<void> {
  const cl = loadCrashlyticsModule();
  if (!cl) return;
  try {
    await cl().setCrashlyticsCollectionEnabled(true);
    cl().log('app_started');
  } catch (err) {
    console.warn('[crashlytics] bootstrap failed:', err);
  }
}

/**
 * Add a free-form breadcrumb to the crash report. Cheap — accumulates in a
 * ring buffer and is only sent if a crash actually fires.
 */
export function logBreadcrumb(message: string): void {
  const cl = loadCrashlyticsModule();
  if (!cl) return;
  try {
    cl().log(message);
  } catch {
    // swallow — crash reporting must never throw
  }
}

/**
 * Record a non-fatal JS error so it shows up in Crashlytics with a JS stack
 * trace. Use inside catch() blocks where the user experience continues but
 * we want visibility.
 */
export function recordNonFatal(err: unknown, context?: Record<string, string | number | boolean>): void {
  const cl = loadCrashlyticsModule();
  if (!cl) return;
  try {
    if (context) {
      const inst = cl();
      Object.entries(context).forEach(([k, v]) => {
        if (typeof v === 'boolean') inst.setAttribute(k, v ? 'true' : 'false');
        else inst.setAttribute(k, String(v));
      });
    }
    const error = err instanceof Error ? err : new Error(String(err));
    cl().recordError(error);
  } catch {
    // swallow
  }
}

/**
 * Attach a stable per-install identifier or other tag to the crash report.
 * Avoid PII — use anonymous IDs or feature flags.
 */
export function setUserId(id: string): void {
  const cl = loadCrashlyticsModule();
  if (!cl) return;
  try {
    cl().setUserId(id);
  } catch {
    // swallow
  }
}
