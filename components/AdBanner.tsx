import {
  AdUnitKey,
  getAdsModule,
  getRequestNonPersonalizedAdsOnly,
  isAdsRuntimeAvailable,
  resolveAdUnitId,
} from '@/services/adsService';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AdBannerProps {
  /** Which ad unit to render (must exist in AD_UNIT_IDS). Defaults to 'bannerHome'. */
  unitKey?: AdUnitKey;
  style?: object;
  /** testID for E2E — asserts the banner strip is present and not clipped. */
  testID?: string;
}

const ads = getAdsModule();
const BannerAdComponent: React.ComponentType<any> | null = ads?.BannerAd ?? null;
const BannerAdSize: any = ads?.BannerAdSize ?? null;
const TestIds: any = ads?.TestIds ?? null;

export default function AdBanner({ unitKey = 'bannerHome', style, testID = 'ad-banner' }: AdBannerProps) {
  if (!isAdsRuntimeAvailable() || !BannerAdComponent || !BannerAdSize) {
    return null;
  }

  const adUnitId = resolveAdUnitId(unitKey, TestIds?.ADAPTIVE_BANNER);

  return (
    <View testID={testID} style={[styles.container, style]}>
      <BannerAdComponent
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          // Driven by real UMP consent, not a hard-coded value. When the user
          // has consented to personalized ads (or is outside GDPR scope) this
          // is `false` and we get full eCPM.
          requestNonPersonalizedAdsOnly: getRequestNonPersonalizedAdsOnly(),
        }}
        onAdLoaded={() => {
          if (__DEV__) console.log(`[ads] banner loaded (${unitKey})`);
        }}
        onAdFailedToLoad={(error: any) => {
          // Surface the failure code so we can spot fill problems by region.
          console.warn(
            `[ads] banner failed to load (${unitKey}):`,
            error?.code ?? 'unknown',
            error?.message ?? '',
          );
        }}
        onAdOpened={() => {
          if (__DEV__) console.log(`[ads] banner opened (${unitKey})`);
        }}
        onAdClosed={() => {
          if (__DEV__) console.log(`[ads] banner closed (${unitKey})`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent so the strip blends with both the light and dark home
    // backgrounds (the app gained dark mode after this banner was first built).
    backgroundColor: 'transparent',
    paddingVertical: 4,
    // Edge-to-edge clip guard (new arch, Expo SDK 55+): the anchored adaptive
    // banner derives its height from the window during first layout, and under
    // edgeToEdgeEnabled it can transiently resolve to 0 / get clipped before the
    // insets settle. Reserving a floor height keeps the strip stable so the ad
    // is never cut off. ANCHORED_ADAPTIVE_BANNER is ~50–60dp on phones; the
    // component returns null when ads are unavailable, so this reserves space
    // only when a banner is actually rendered (no empty strip otherwise).
    minHeight: 60,
  },
});
