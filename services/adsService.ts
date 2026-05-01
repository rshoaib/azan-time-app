/**
 * Central AdMob service.
 *
 * Owns:
 *  - SDK initialization (call initializeAds() once at app startup)
 *  - UMP (User Messaging Platform) consent flow for EEA/UK
 *  - Personalized vs non-personalized request decision
 *  - All ad unit IDs (one place — see AD_UNIT_IDS)
 *  - Frequency caps for interstitial / app-open / prayer-time suppression
 *
 * Designed to silently no-op in Expo Go (where the native module is unavailable)
 * and on web. All public functions are safe to call in any environment.
 */

import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// ──────────────────────────────────────────────────────────────────────────────
// Ad unit IDs — Android and iOS units are live.
// ──────────────────────────────────────────────────────────────────────────────
//
// Publisher ID: pub-3166995085202346 (both platforms).
//
// iOS ad units are created but the iOS build is pending App Store Connect
// enrollment — they'll sit unused until the first iOS release ships.
//
// Test IDs from Google are substituted automatically when __DEV__ is true.

type AdUnitMap = { android: string; ios: string };

export const AD_UNIT_IDS = {
  bannerHome: {
    android: 'ca-app-pub-3166995085202346/9036572986',
    ios: 'ca-app-pub-3166995085202346/8822195777',
  } as AdUnitMap,
  // Currently reuses the home banner unit on both platforms. If you later
  // want per-screen analytics (eCPM/fill rate by placement), create a
  // dedicated unit in AdMob and swap the values here.
  bannerTracker: {
    android: 'ca-app-pub-3166995085202346/9036572986',
    ios: 'ca-app-pub-3166995085202346/8822195777',
  } as AdUnitMap,
  interstitialRadioPlay: {
    android: 'ca-app-pub-3166995085202346/4549590450',
    ios: 'ca-app-pub-3166995085202346/4386985105',
  } as AdUnitMap,
  appOpen: {
    android: 'ca-app-pub-3166995085202346/1923427111',
    ios: 'ca-app-pub-3166995085202346/8518943446',
  } as AdUnitMap,
} as const;

export type AdUnitKey = keyof typeof AD_UNIT_IDS;

// ──────────────────────────────────────────────────────────────────────────────
// Lazy native module loading (Expo Go safety)
// ──────────────────────────────────────────────────────────────────────────────

const isExpoGo = Constants.appOwnership === 'expo';
const isAdsAvailable = !isExpoGo && Platform.OS !== 'web';

let nativeAdsModule: any = null;

function loadAdsModule(): any | null {
  if (!isAdsAvailable) return null;
  if (nativeAdsModule) return nativeAdsModule;
  try {
    nativeAdsModule = require('react-native-google-mobile-ads');
    return nativeAdsModule;
  } catch {
    return null;
  }
}

export function getAdsModule() {
  return loadAdsModule();
}

export function isAdsRuntimeAvailable(): boolean {
  return loadAdsModule() !== null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Test IDs in development
// ──────────────────────────────────────────────────────────────────────────────

export function resolveAdUnitId(key: AdUnitKey, fallbackTestId?: string): string {
  const ads = loadAdsModule();
  if (__DEV__ && ads?.TestIds && fallbackTestId) {
    return fallbackTestId;
  }
  const map = AD_UNIT_IDS[key];
  return Platform.select({
    android: map.android,
    ios: map.ios,
    default: map.android,
  })!;
}

// ──────────────────────────────────────────────────────────────────────────────
// UMP consent state
// ──────────────────────────────────────────────────────────────────────────────

let consentResolved = false;
let canRequestPersonalizedAds = false;

/**
 * NPA flag for ad request options. Returns `true` (request non-personalized
 * only) until consent has been resolved AND the user has consented to
 * personalized ads. Conservative default: NPA on, which is policy-safe.
 */
export function getRequestNonPersonalizedAdsOnly(): boolean {
  return !canRequestPersonalizedAds;
}

export function isConsentResolved(): boolean {
  return consentResolved;
}

// ──────────────────────────────────────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────────────────────────────────────

let initPromise: Promise<void> | null = null;

/**
 * Initialize the Mobile Ads SDK and request UMP consent if needed.
 * Idempotent — safe to call multiple times. Resolves once the SDK is ready
 * (whether or not consent succeeded).
 */
export function initializeAds(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ads = loadAdsModule();
    if (!ads) return;

    try {
      const { default: mobileAds, MaxAdContentRating, AdsConsent, AdsConsentStatus } = ads;

      // Conservative request configuration appropriate for a religious app.
      try {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating?.G ?? 'G',
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
          // Add real device IDs here while testing on a physical device:
          // testDeviceIdentifiers: ['EMULATOR', 'YOUR_DEVICE_AD_ID'],
        });
      } catch (err) {
        console.warn('[ads] setRequestConfiguration failed:', err);
      }

      // UMP consent — only matters in EEA/UK/Switzerland; no-op elsewhere.
      try {
        if (AdsConsent && typeof AdsConsent.requestInfoUpdate === 'function') {
          const consentInfo = await AdsConsent.requestInfoUpdate();
          if (
            consentInfo?.isConsentFormAvailable &&
            consentInfo?.status === AdsConsentStatus?.REQUIRED
          ) {
            await AdsConsent.loadAndShowConsentFormIfRequired();
          }
          // After (potentially) showing the form, evaluate whether we can
          // request personalized ads. Different SDK versions expose this via
          // different helpers; try both.
          let allowed = false;
          if (typeof AdsConsent.getUserChoices === 'function') {
            const choices = await AdsConsent.getUserChoices();
            allowed = !!choices?.selectPersonalisedAds;
          } else if (typeof AdsConsent.canRequestAds === 'function') {
            allowed = await AdsConsent.canRequestAds();
          } else {
            // Fall back to the consent status itself: NOT_REQUIRED means
            // outside scope so personalized ads are allowed.
            allowed = consentInfo?.status === AdsConsentStatus?.NOT_REQUIRED ||
                      consentInfo?.status === AdsConsentStatus?.OBTAINED;
          }
          canRequestPersonalizedAds = allowed;
        } else {
          // No UMP API on this SDK version — assume NPA to stay policy-safe.
          canRequestPersonalizedAds = false;
        }
      } catch (err) {
        console.warn('[ads] UMP consent failed:', err);
        canRequestPersonalizedAds = false;
      } finally {
        consentResolved = true;
      }

      try {
        await mobileAds().initialize();
      } catch (err) {
        console.warn('[ads] mobileAds().initialize() failed:', err);
      }
    } catch (err) {
      console.warn('[ads] initializeAds failed:', err);
    }
  })();
  return initPromise;
}

// ──────────────────────────────────────────────────────────────────────────────
// Frequency caps (in-memory; survive within a single app session)
// ──────────────────────────────────────────────────────────────────────────────

const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;       // 3 minutes
const APP_OPEN_MIN_INTERVAL_MS = 4 * 60 * 60 * 1000;      // 4 hours
const POST_NOTIFICATION_SUPPRESS_MS = 60 * 1000;          // 60 seconds

let lastInterstitialAtMs = 0;
let lastAppOpenAtMs = 0;
let lastPrayerNotificationAtMs = 0;

export function canShowInterstitial(): boolean {
  return Date.now() - lastInterstitialAtMs >= INTERSTITIAL_MIN_INTERVAL_MS;
}
export function markInterstitialShown(): void {
  lastInterstitialAtMs = Date.now();
}

export function canShowAppOpen(): boolean {
  if (!consentResolved) return false;
  if (Date.now() - lastAppOpenAtMs < APP_OPEN_MIN_INTERVAL_MS) return false;
  if (Date.now() - lastPrayerNotificationAtMs < POST_NOTIFICATION_SUPPRESS_MS) return false;
  return true;
}
export function markAppOpenShown(): void {
  lastAppOpenAtMs = Date.now();
}

/**
 * Call this whenever a prayer-time notification is delivered or tapped, so
 * the App Open Ad doesn't fire on the user during that moment.
 */
export function markPrayerNotificationFired(): void {
  lastPrayerNotificationAtMs = Date.now();
}

// ──────────────────────────────────────────────────────────────────────────────
// Interstitial helper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook that preloads a single interstitial for a given ad unit and exposes a
 * `tryShow` function. `tryShow(onDone)` calls `onDone()` either after the ad
 * closes OR immediately if the ad isn't ready / frequency-capped — never
 * blocks the user.
 *
 * Safe in Expo Go and on web (no-ops). Reloads after each show.
 */
export function useInterstitialAd(unitKey: AdUnitKey) {
  const adRef = useRef<any>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const ads = loadAdsModule();
    if (!ads) return;
    const { InterstitialAd, AdEventType, TestIds } = ads;
    if (!InterstitialAd || !AdEventType) return;

    const unitId = __DEV__ && TestIds?.INTERSTITIAL
      ? TestIds.INTERSTITIAL
      : resolveAdUnitId(unitKey);

    const ad = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: getRequestNonPersonalizedAdsOnly(),
    });

    const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
      if (__DEV__) console.log(`[ads] interstitial loaded (${unitKey})`);
    });
    const offError = ad.addAdEventListener(AdEventType.ERROR, (err: any) => {
      loadedRef.current = false;
      console.warn(`[ads] interstitial failed (${unitKey}):`, err?.code ?? '', err?.message ?? '');
    });

    adRef.current = ad;
    try { ad.load(); } catch {}

    return () => {
      try { offLoaded?.(); offError?.(); } catch {}
      adRef.current = null;
      loadedRef.current = false;
    };
  }, [unitKey]);

  const tryShow = (onDone: () => void) => {
    const ads = loadAdsModule();
    const ad = adRef.current;
    if (!ads || !ad || !loadedRef.current || !canShowInterstitial()) {
      onDone();
      return;
    }
    const { AdEventType } = ads;
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      try { offClosed?.(); } catch {}
      loadedRef.current = false;
      markInterstitialShown();
      // Preload the next one for the following invocation.
      try { ad.load(); } catch {}
      onDone();
    });
    try {
      ad.show();
    } catch (err) {
      console.warn(`[ads] interstitial show failed (${unitKey}):`, err);
      try { offClosed?.(); } catch {}
      onDone();
    }
  };

  return { tryShow };
}

// ──────────────────────────────────────────────────────────────────────────────
// App Open Ad
// ──────────────────────────────────────────────────────────────────────────────

let appOpenAdInstance: any = null;
let appOpenLoaded = false;

function ensureAppOpenLoaded(): void {
  const ads = loadAdsModule();
  if (!ads) return;
  const { AppOpenAd, AdEventType, TestIds } = ads;
  if (!AppOpenAd || !AdEventType) return;

  if (appOpenAdInstance && appOpenLoaded) return;

  const unitId = __DEV__ && TestIds?.APP_OPEN
    ? TestIds.APP_OPEN
    : resolveAdUnitId('appOpen');

  appOpenAdInstance = AppOpenAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: getRequestNonPersonalizedAdsOnly(),
  });

  appOpenAdInstance.addAdEventListener(AdEventType.LOADED, () => {
    appOpenLoaded = true;
  });
  appOpenAdInstance.addAdEventListener(AdEventType.ERROR, (err: any) => {
    appOpenLoaded = false;
    console.warn('[ads] app-open failed:', err?.code ?? '', err?.message ?? '');
  });
  appOpenAdInstance.addAdEventListener(AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    markAppOpenShown();
    // Pre-load the next one.
    try { appOpenAdInstance.load(); } catch {}
  });

  try { appOpenAdInstance.load(); } catch {}
}

/**
 * Show an App Open Ad on foreground, respecting frequency caps and the
 * post-prayer-notification suppression window.
 */
export function maybeShowAppOpenAd(): void {
  const ads = loadAdsModule();
  if (!ads) return;
  ensureAppOpenLoaded();
  if (!appOpenAdInstance || !appOpenLoaded) return;
  if (!canShowAppOpen()) return;
  try {
    appOpenAdInstance.show();
  } catch (err) {
    console.warn('[ads] app-open show failed:', err);
  }
}
