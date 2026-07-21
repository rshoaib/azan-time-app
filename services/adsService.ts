/**
 * Central AdMob service (banner-only).
 *
 * Owns:
 *  - SDK initialization (call initializeAds() once at app startup)
 *  - UMP (User Messaging Platform) consent flow for EEA/UK/Switzerland
 *  - Personalized vs non-personalized request decision
 *  - All ad unit IDs (one place — see AD_UNIT_IDS)
 *
 * Designed to silently no-op in Expo Go (where the native module is unavailable)
 * and on web. All public functions are safe to call in any environment.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { E2E } from './e2eConfig';

// ──────────────────────────────────────────────────────────────────────────────
// E2E interstitial observability seam (compile-time false in release builds, so
// every branch below is dead-code-eliminated and nothing ships to users).
// ──────────────────────────────────────────────────────────────────────────────
//
// A test needs to assert *whether* an interstitial fired — but a real full-screen
// ad would block the run and depend on ad fill. So under E2E, maybeShowInterstitial()
// records the decision here instead of calling the native show(). Tests read this
// count via a hidden Settings row (testID="e2e-interstitial-count") to verify the
// ad fires ONLY on genuine completions and NEVER on tab navigation / returning Home.
let e2eInterstitialShown = 0;
export function e2eGetInterstitialShown(): number {
  return e2eInterstitialShown;
}
export function e2eResetInterstitialShown(): void {
  e2eInterstitialShown = 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Ad unit IDs
// ──────────────────────────────────────────────────────────────────────────────
//
// Publisher ID: pub-3166995085202346 (both platforms).
// Test IDs from Google are substituted automatically when __DEV__ is true.
//
// Android banner unit re-created in AdMob on 2026-06-26 ("Home Banner"); the
// original was deleted during the 2026-05-05 ad cleanup. App ID ~7372137520
// (app.json) is unchanged. The iOS unit below is UNVERIFIED — confirm or
// re-create it in the AdMob console before any iOS release.

type AdUnitMap = { android: string; ios: string };

export const AD_UNIT_IDS = {
  bannerHome: {
    android: 'ca-app-pub-3166995085202346/5942887541',
    ios: 'ca-app-pub-3166995085202346/8822195777',
  } as AdUnitMap,
  // Interstitial. Android unit is live ("Interstitial", created in AdMob under
  // publisher pub-3166995085202346, 2026-07). iOS unit is still a PLACEHOLDER —
  // the per-platform guard in hasRealInterstitialUnit() keeps iOS a no-op until
  // a real iOS unit is created (iOS isn't shipped yet). Dev/emulator always uses
  // Google's official test interstitial ID regardless of platform.
  interstitialMain: {
    android: 'ca-app-pub-3166995085202346/1260065927',
    ios: 'ca-app-pub-3166995085202346/PLACEHOLDER_INTERSTITIAL',
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
// Ad unit resolution (Test IDs in development)
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
// Interstitial (frequency-capped, policy-conservative)
// ──────────────────────────────────────────────────────────────────────────────
//
// Shown only at natural transitions (returning to the Home tab) — never on
// launch, never during azan playback, and never more than the caps below. This
// keeps a steady but respectful impression stream without hurting retention or
// the app's rating. All state is in-memory and resets on cold start (which errs
// toward FEWER ads).

const INTERSTITIAL_MIN_INTERVAL_MS = 4 * 60 * 1000; // ≥ 4 min between shows
const INTERSTITIAL_MAX_PER_DAY = 5;

let interstitialAd: any = null;
let interstitialLoaded = false;
let interstitialLoading = false;
let lastInterstitialShownAt = 0;
let interstitialShownToday = 0;
let interstitialDayStamp = ''; // YYYY-MM-DD, for the daily-cap rollover

/**
 * True once a real (non-placeholder) interstitial unit ID exists for the CURRENT
 * platform. Android is live; iOS is still a placeholder, so this stays false on
 * iOS and keeps the interstitial a no-op there until an iOS unit is created.
 */
function hasRealInterstitialUnit(): boolean {
  const map = AD_UNIT_IDS.interstitialMain;
  const id = Platform.select({ android: map.android, ios: map.ios, default: map.android })!;
  return !id.includes('PLACEHOLDER');
}

/**
 * Resolve the interstitial unit ID. Uses Google's test ID in dev; in a release
 * build returns null (no-op) until a real unit ID is pasted into AD_UNIT_IDS —
 * so we never fire invalid requests against a placeholder in production.
 */
function interstitialUnitId(): string | null {
  const ads = loadAdsModule();
  if (!ads) return null;
  if (__DEV__ && ads.TestIds?.INTERSTITIAL) return ads.TestIds.INTERSTITIAL;
  if (!hasRealInterstitialUnit()) return null;
  const map = AD_UNIT_IDS.interstitialMain;
  return Platform.select({ android: map.android, ios: map.ios, default: map.android })!;
}

/**
 * Preload an interstitial so a later show() is instant. Safe/idempotent; no-ops
 * until the SDK + consent are ready and a usable unit ID exists. Auto-reloads
 * the next one after each close.
 */
export function preloadInterstitial(): void {
  const ads = loadAdsModule();
  if (!ads || !consentResolved) return;
  if (interstitialLoaded || interstitialLoading) return;
  const unitId = interstitialUnitId();
  if (!unitId) return;

  const { InterstitialAd, AdEventType } = ads;
  if (!InterstitialAd || !AdEventType) return;

  try {
    interstitialLoading = true;
    const ad = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: getRequestNonPersonalizedAdsOnly(),
    });
    ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
      interstitialLoading = false;
    });
    ad.addAdEventListener(AdEventType.ERROR, (err: any) => {
      interstitialLoading = false;
      interstitialLoaded = false;
      interstitialAd = null;
      console.warn('[ads] interstitial load error:', err?.message ?? err);
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      interstitialAd = null;
      preloadInterstitial(); // warm the next one for later
    });
    interstitialAd = ad;
    ad.load();
  } catch (err) {
    interstitialLoading = false;
    console.warn('[ads] preloadInterstitial failed:', err);
  }
}

/**
 * Show a frequency-capped interstitial if one is ready and all guards pass.
 * Returns true only if an ad was actually shown. Caller supplies an optional
 * `isBusy` predicate (e.g. azan playing) to suppress at sensitive moments.
 */
export function maybeShowInterstitial(opts?: { isBusy?: () => boolean }): boolean {
  const ads = loadAdsModule();
  // In E2E we still evaluate the caps below even if the native module is absent,
  // so tests can verify the trigger wiring without a real ads runtime.
  if (!ads && !E2E) return false;

  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  if (day !== interstitialDayStamp) {
    interstitialDayStamp = day;
    interstitialShownToday = 0;
  }

  if (interstitialShownToday >= INTERSTITIAL_MAX_PER_DAY) return false;
  if (now - lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS) return false;
  if (opts?.isBusy?.()) return false;

  if (E2E) {
    // Deterministic, non-blocking test path: honor the same frequency caps as
    // production, but record the decision instead of popping a real ad. This is
    // what the ad-trigger regression test observes.
    lastInterstitialShownAt = now;
    interstitialShownToday += 1;
    e2eInterstitialShown += 1;
    return true;
  }

  if (!interstitialLoaded || !interstitialAd) {
    preloadInterstitial(); // not ready yet — warm one for next time
    return false;
  }

  try {
    interstitialAd.show();
    lastInterstitialShownAt = now;
    interstitialShownToday += 1;
    return true;
  } catch (err) {
    console.warn('[ads] interstitial show failed:', err);
    interstitialLoaded = false;
    interstitialAd = null;
    return false;
  }
}
