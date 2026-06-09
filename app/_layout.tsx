import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/constants/ThemeContext';
import { I18nProvider } from '@/i18n/I18nContext';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { LogBox } from 'react-native';
import { bootstrapAnalytics, logScreenView } from '@/services/analyticsService';
import { bootstrapCrashlytics, recordNonFatal } from '@/services/crashlyticsService';
import { bootstrapPerformance } from '@/services/performanceService';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// React Native Firebase v22 logs a deprecation warning on every namespaced-API
// call (analytics/crashlytics/perf). They're harmless migration nags, but in dev
// they raise a warning overlay anchored at the bottom of the screen whose touch
// layer covers the tab bar and swallows taps (manual use + Maestro E2E). This is
// RNFirebase's official opt-out — it stops the warnings at the source.
(globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// In a dev build, every console.warn/error raises a notification overlay whose
// touch layer covers the bottom tab bar and silently swallows taps — which breaks
// Maestro E2E navigation (the app legitimately warns on network failures, optional
// audio, geocoding retries, etc.). Disable the overlay ONLY during E2E runs: start
// Metro with EXPO_PUBLIC_E2E=1 (the value is inlined at bundle time). Normal dev
// keeps its red/yellow error boxes. LogBox is dev-only, so this is a no-op in
// release builds regardless.
if (process.env.EXPO_PUBLIC_E2E === '1') {
  LogBox.ignoreAllLogs(true);
}

SplashScreen.preventAutoHideAsync();

// React Navigation themes matching our Islamic light/dark palettes.
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

const AzanDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0E1117',
    card: '#10151E',
    text: '#F2F4F8',
    border: '#222A38',
    primary: '#2DD4BF',
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

  // Fire a Firebase `screen_view` event whenever the route changes. expo-router
  // does NOT do this automatically — without this hook, Firebase reports the
  // Android Activity name (BrowserProxyActivity etc.) as the "screen", which
  // makes the Pages & Screens report useless for understanding in-app behavior.
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    // Normalize: '/' -> 'home'; otherwise take the last path segment so
    // group/parent layout names don't pollute the report.
    const segment =
      pathname === '/' ? 'home' : pathname.split('/').filter(Boolean).pop() ?? pathname;
    logScreenView(segment);
  }, [pathname]);

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
    <I18nProvider>
      <AppThemeProvider>
        <RootNavigation />
      </AppThemeProvider>
    </I18nProvider>
  );
}

// Consumes the app theme (inside AppThemeProvider) so the navigation theme and
// status bar flip together with light/dark.
function RootNavigation() {
  const { scheme } = useTheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? AzanDarkTheme : AzanLightTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
