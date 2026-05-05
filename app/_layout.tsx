import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { bootstrapAnalytics } from '@/services/analyticsService';
import { bootstrapCrashlytics, recordNonFatal } from '@/services/crashlyticsService';
import { bootstrapPerformance } from '@/services/performanceService';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Custom light theme matching our Islamic light palette
const AzanLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F5F6FA',
    card: '#FFFFFF',
    text: '#1A1D2E',
    border: '#E2E5F0',
    primary: '#0D9488',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Bootstrap Firebase Analytics — records the install date on first run and
  // fires `app_open_day_2` on the day-after-install return. Safe to call in
  // Expo Go / web (silently no-ops).
  useEffect(() => {
    bootstrapAnalytics();
  }, []);

  // Bootstrap Crashlytics + Performance Monitoring. Both are no-ops in Expo Go
  // and on web. Crashlytics is enabled defensively; Performance auto-captures
  // app-start, screen-render, and HTTP request metrics with no further wiring.
  useEffect(() => {
    bootstrapCrashlytics();
    bootstrapPerformance();
  }, []);

  // Capture uncaught JS errors as Crashlytics non-fatals so stack traces
  // surface in the Firebase console instead of dying silently. Chains the
  // previous handler (React Native's red-box in dev) so DX is unchanged.
  useEffect(() => {
    const ErrorUtils = (global as any).ErrorUtils;
    if (!ErrorUtils?.setGlobalHandler || !ErrorUtils?.getGlobalHandler) return;
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((err: unknown, isFatal?: boolean) => {
      try {
        recordNonFatal(err, { source: 'global_error', is_fatal: !!isFatal });
      } catch {
        // never let logging break the original handler chain
      }
      if (previous) previous(err, isFatal);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={AzanLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
