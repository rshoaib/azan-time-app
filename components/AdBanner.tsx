import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Theme } from '@/constants/theme';

interface AdBannerProps {
  style?: object;
}

let BannerAdComponent: React.ComponentType<any> | null = null;
let BannerAdSize: any = null;
let TestIds: any = null;

// Try to load native ads module — silently fail in Expo Go
try {
  const adsModule = require('react-native-google-mobile-ads');
  BannerAdComponent = adsModule.BannerAd;
  BannerAdSize = adsModule.BannerAdSize;
  TestIds = adsModule.TestIds;
} catch {
  // react-native-google-mobile-ads is not available in Expo Go
}

export default function AdBanner({ style }: AdBannerProps) {
  // If the native ad module isn't available, show nothing
  if (!BannerAdComponent || !BannerAdSize || !TestIds) {
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.select({
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
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
