/**
 * Runtime theme system for Azan Time.
 *
 * The app's colors live in two palettes (`lightColors` / `darkColors` in
 * constants/theme.ts). This context resolves the *active* palette from the
 * user's preference ('light' | 'dark' | 'system') and the OS color scheme,
 * persists the preference, and exposes:
 *
 *   - useTheme()        → { mode, scheme, colors, isDark, setMode }
 *   - useThemeStyles()  → build a StyleSheet from the active palette, memoized
 *                         per scheme so it only rebuilds when light↔dark flips.
 *
 * Screens migrate by turning `const styles = StyleSheet.create({ … Theme.colors })`
 * into `const makeStyles = (c) => StyleSheet.create({ … c })` and calling
 * `const styles = useThemeStyles(makeStyles)` inside the component.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './theme';
import { getThemeMode, setThemeMode, ThemeMode } from '@/services/storageService';

type Scheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: Scheme;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load the persisted preference once on mount.
  useEffect(() => {
    let active = true;
    getThemeMode().then((m) => {
      if (active) setModeState(m);
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setThemeMode(next).catch(() => {});
  };

  const scheme: Scheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, isDark: scheme === 'dark', setMode }),
    [mode, scheme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Read the active theme. Falls back to the light palette when called outside a
 * provider (e.g. in tests or a stray component) so it never throws.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: 'system',
      scheme: 'light',
      colors: lightColors,
      isDark: false,
      setMode: () => {},
    };
  }
  return ctx;
}

/**
 * Build a StyleSheet from the active palette. The factory is called with the
 * current colors and memoized per scheme, so styles only rebuild on a
 * light↔dark switch — not on every render.
 */
export function useThemeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  // colors is a stable reference per scheme (lightColors / darkColors), so it
  // is the correct (and only needed) dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors]);
}
