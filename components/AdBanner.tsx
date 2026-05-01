import { Theme } from '@/constants/theme';
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
}

const ads = getAdsModule();
const BannerAdComponent: React.ComponentType<any> | null = ads?.BannerAd ?? null;
const BannerAdSize: any = ads?.BannerAdSize ?? null;
const TestIds: any = ads?.TestIds ?? null;

export default function AdBanner({ unitKey = 'bannerHome', style }: AdBannerProps) {
  if (!isAdsRuntimeAvailable() || !BannerAdComponent || !BannerAdSize) {
    return null;
  }

  const adUnitId = resolveAdUnitId(unitKey, TestIds?.ADAPTIVE_BANNER);

  return (
    <View style={[styles.container, style]}>
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
    backgroundColor: Theme.colors.background,
    paddingVertical: 4,
  },
});
