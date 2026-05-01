/**
 * Central analytics service — Firebase Analytics via @react-native-firebase.
 *
 * Owns:
 *  - Lazy native-module loading (safe in Expo Go and on web — silently no-ops)
 *  - One-time and retention event helpers
 *  - Minimal wrapper so callers don't need to import @react-native-firebase directly
 *
 * The two events we care about for Google Ads UAC bid optimization:
 *   1. `app_open_day_2`       — retention proxy (day-2 return, fires once)
 *   2. `first_adhan_heard`    — engagement proxy (fires once per install when
 *                               the first prayer-time adhan is delivered)
 *
 * Both events are marked as conversions in Firebase and imported into Google
 * Ads so the "In-app actions (Target CPA)" bid strategy has real quality signal
 * to optimize against — instead of just buying the cheapest installs.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ──────────────────────────────────────────────────────────────────────────────
// Storage keys — sentinel flags + install date
// ──────────────────────────────────────────────────────────────────────────────

const KEYS = {
  FIRST_INSTALL_DATE: 'analytics_first_install_date', // ISO yyyy-mm-dd
  DAY2_FIRED: 'analytics_day2_fired',                  // '1' once sent
  FIRST_ADHAN_FIRED: 'analytics_first_adhan_fired',    // '1' once sent
  // Day-1 retention funnel sentinels — each fires at most once per install.
  // Funnel: first_open (auto) → location_granted → notification_granted →
  // first_prayer_alarm. Stuck-at-step counts in GA4 reveal which gate is
  // killing retention.
  LOCATION_GRANTED_FIRED: 'analytics_location_granted_fired',
  NOTIFICATION_GRANTED_FIRED: 'analytics_notification_granted_fired',
  FIRST_PRAYER_ALARM_FIRED: 'analytics_first_prayer_alarm_fired',
};

// ──────────────────────────────────────────────────────────────────────────────
// Lazy native module loading — same shape as adsService
// ──────────────────────────────────────────────────────────────────────────────

const isExpoGo = Constants.appOwnership === 'expo';
const isAnalyticsAvailable = !isExpoGo && Platform.OS !== 'web';

let analyticsModule: any = null;

function loadAnalyticsModule(): any | null {
  if (!isAnalyticsAvailable) return null;
  if (analyticsModule) return analyticsModule;
  try {
    // @react-native-firebase/analytics exports a default factory that returns
    // the analytics instance when called: `analytics()`.
    analyticsModule = require('@react-native-firebase/analytics').default;
    return analyticsModule;
  } catch {
    return null;
  }
}

export function isAnalyticsRuntimeAvailable(): boolean {
  return loadAnalyticsModule() !== null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core logEvent wrapper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Log a custom event. Safe to call in any environment — silently no-ops in
 * Expo Go and on web. Event names must be alphanumeric + underscores and ≤40
 * chars per Firebase's rules; enforce that at the call site.
 */
export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const analytics = loadAnalyticsModule();
  if (!analytics) return;
  try {
    await analytics().logEvent(name, params);
    if (__DEV__) console.log(`[analytics] logEvent ${name}`, params ?? '');
  } catch (err) {
    console.warn(`[analytics] logEvent failed (${name}):`, err);
  }
}

/**
 * Set a persistent user property (e.g., selected calculation method, chosen
 * reciter). Useful for Firebase audiences but not required for ad conversions.
 */
export async function setUserProperty(
  name: string,
  value: string | null,
): Promise<void> {
  const analytics = loadAnalyticsModule();
  if (!analytics) return;
  try {
    await analytics().setUserProperty(name, value);
  } catch (err) {
    console.warn(`[analytics] setUserProperty failed (${name}):`, err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Bootstrap — called once at app startup
// ──────────────────────────────────────────────────────────────────────────────

function isoDate(d: Date = new Date()): string {
  // yyyy-mm-dd in local time — day-granularity is what we need for "day 2"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00');
  const b = new Date(bIso + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Run once at app start. Persists first_install_date on the very first launch,
 * then fires `app_open_day_2` exactly once when the user opens the app on the
 * calendar day after install.
 *
 * Idempotent and resilient to clock changes (it uses a stored sentinel, so a
 * user with a wonky clock won't fire the event repeatedly).
 */
export async function bootstrapAnalytics(): Promise<void> {
  try {
    // Explicitly turn on Analytics collection. RNFirebase v22+ enables this by
    // default on Android, but we set it defensively to survive any future
    // default changes and to document the intent. Safe to call every launch.
    const analytics = loadAnalyticsModule();
    if (analytics) {
      try {
        await analytics().setAnalyticsCollectionEnabled(true);
      } catch (err) {
        console.warn('[analytics] setAnalyticsCollectionEnabled failed:', err);
      }
      // Diagnostic probe — fires on every launch so we can confirm the
      // native pipeline is alive in Realtime / DebugView even before the
      // day-2 event becomes eligible. Cheap and low-cardinality.
      await logEvent('debug_bootstrap_probe', {
        platform: Platform.OS,
      });
    }

    const today = isoDate();

    // Record first-install date if missing
    let installDate = await AsyncStorage.getItem(KEYS.FIRST_INSTALL_DATE);
    if (!installDate) {
      installDate = today;
      await AsyncStorage.setItem(KEYS.FIRST_INSTALL_DATE, installDate);
    }

    // Day-2 retention event — fire if today is >=1 day after install and not
    // yet fired. Using >=1 instead of ==1 covers the case where a user opens
    // the app on day 3 without ever opening on day 2 — we still want the
    // "retained" signal for the ad algorithm.
    const alreadyFired = await AsyncStorage.getItem(KEYS.DAY2_FIRED);
    if (!alreadyFired) {
      const delta = daysBetween(installDate, today);
      if (delta >= 1) {
        await logEvent('app_open_day_2', {
          days_since_install: delta,
        });
        await AsyncStorage.setItem(KEYS.DAY2_FIRED, '1');
      }
    }
  } catch (err) {
    console.warn('[analytics] bootstrapAnalytics failed:', err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// One-time event: first adhan heard
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fires `first_adhan_heard` at most once per install. Call from the
 * notification-received listener (app in foreground) and the notification-
 * response listener (user tapped the notification) — either way, the user
 * has just been "delivered" an adhan, which is the core product moment.
 */
export async function maybeFireFirstAdhanHeard(
  trigger: 'foreground' | 'notification_tap' | 'manual',
): Promise<void> {
  try {
    const fired = await AsyncStorage.getItem(KEYS.FIRST_ADHAN_FIRED);
    if (fired) return;
    await logEvent('first_adhan_heard', { trigger });
    await AsyncStorage.setItem(KEYS.FIRST_ADHAN_FIRED, '1');
  } catch (err) {
    console.warn('[analytics] maybeFireFirstAdhanHeard failed:', err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Day-1 retention funnel — three fire-once events
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generic fire-once helper backed by AsyncStorage. Fires `eventName` exactly
 * once per install regardless of how many times this is called.
 */
async function fireOnce(
  storageKey: string,
  eventName: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const fired = await AsyncStorage.getItem(storageKey);
    if (fired) return;
    await logEvent(eventName, params);
    await AsyncStorage.setItem(storageKey, '1');
  } catch (err) {
    console.warn(`[analytics] fireOnce failed (${eventName}):`, err);
  }
}

/**
 * Fires `location_granted` the first time the user grants foreground location
 * permission. Step 2 of the Day-1 retention funnel.
 */
export async function maybeFireLocationGranted(): Promise<void> {
  await fireOnce(KEYS.LOCATION_GRANTED_FIRED, 'location_granted');
}

/**
 * Fires `notification_granted` the first time the user grants notification
 * permission. Step 3 of the Day-1 retention funnel.
 */
export async function maybeFireNotificationGranted(): Promise<void> {
  await fireOnce(KEYS.NOTIFICATION_GRANTED_FIRED, 'notification_granted');
}

/**
 * Fires `first_prayer_alarm` the first time we successfully schedule at least
 * one prayer notification for the user. Step 4 of the Day-1 retention funnel —
 * this is the moment Azan Time's core promise (an adhan will reach you) is
 * actually delivered.
 */
export async function maybeFireFirstPrayerAlarm(scheduledCount: number): Promise<void> {
  if (scheduledCount <= 0) return;
  await fireOnce(KEYS.FIRST_PRAYER_ALARM_FIRED, 'first_prayer_alarm', {
    scheduled_count: scheduledCount,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Test helper — reset sentinels so the one-time events can fire again. Only
// intended for manual QA on a dev build; not exported through any public UI.
// ──────────────────────────────────────────────────────────────────────────────

export async function __resetAnalyticsSentinels(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.multiRemove([
    KEYS.FIRST_INSTALL_DATE,
    KEYS.DAY2_FIRED,
    KEYS.FIRST_ADHAN_FIRED,
    KEYS.LOCATION_GRANTED_FIRED,
    KEYS.NOTIFICATION_GRANTED_FIRED,
    KEYS.FIRST_PRAYER_ALARM_FIRED,
  ]);
}
