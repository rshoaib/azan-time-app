import { Theme } from '@/constants/theme';
import Constants from 'expo-constants';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

interface AdBannerProps {
  style?: object;
}

// Detect Expo Go — native ad modules are NOT supported in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

let BannerAdComponent: React.ComponentType<any> | null = null;
let BannerAdSize: any = null;
let TestIds: any = null;

// Only load ads in dev builds (not Expo Go)
if (!isExpoGo) {
  try {
    const adsModule = require('react-native-google-mobile-ads');
    BannerAdComponent = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
    TestIds = adsModule.TestIds;
  } catch {
    // Module not available
  }
}

export default function AdBanner({ style }: AdBannerProps) {
  if (!BannerAdComponent || !BannerAdSize || !TestIds) {
    return null;
  }

  // TODO: Replace with real AdMob unit IDs before production release
  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.select({
        android: 'ca-app-pub-3166995085202346/9036572986',
        // TODO: Insert your real iOS ad unit ID below
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        default: TestIds.ADAPTIVE_BANNER,
      }) || TestIds.ADAPTIVE_BANNER;

  return (
    <View style={[styles.container, style]}>
      <BannerAdComponent
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
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
