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
