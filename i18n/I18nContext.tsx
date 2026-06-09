/**
 * React layer over the i18n runtime (./index).
 *
 * Holds the active locale in React state so the whole tree re-renders when the
 * language changes, persists the choice, and keeps the module-level locale in
 * sync (so non-React callers' t() agrees). Components call useT().
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getLanguage, setLanguage } from '@/services/storageService';
import {
  detectLocale,
  Locale,
  setLocale as setModuleLocale,
  translate,
  TranslationKey,
} from './index';

const SUPPORTED: Locale[] = ['en', 'ar', 'id', 'ur'];
function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (SUPPORTED as string[]).includes(v);
}

interface I18nValue {
  locale: Locale;
  isRTL: boolean;
  setLocale: (code: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleStateRaw] = useState<Locale>(detectLocale());

  // Apply a saved language preference (overrides device detection) once.
  useEffect(() => {
    let active = true;
    getLanguage().then((saved) => {
      if (active && isLocale(saved)) {
        setLocaleStateRaw(saved);
        setModuleLocale(saved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((code: Locale) => {
    setLocaleStateRaw(code);
    setModuleLocale(code); // keep module-level t() (services) in sync
    setLanguage(code).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      isRTL: locale === 'ar' || locale === 'ur',
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Full i18n value: locale, isRTL, setLocale, t. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback outside a provider (e.g. tests): English, no-op switcher.
    return {
      locale: 'en',
      isRTL: false,
      setLocale: () => {},
      t: (key, params) => translate('en', key, params),
    };
  }
  return ctx;
}

/** Just the translate function — the common case in screens. */
export function useT() {
  return useI18n().t;
}
