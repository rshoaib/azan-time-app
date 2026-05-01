/**
 * Lightweight i18n for Azan Time.
 *
 * Why no external lib: we ship a dozen screens and ~150 strings. Pulling
 * in i18next adds 40kB+ for something we can do in 40 lines. Swap later if
 * you add plural rules or runtime language switching at scale.
 *
 * Adding a new locale:
 *   1. Create locales/<lang>.ts (copy en.ts as a template)
 *   2. Register it in the `translations` map below
 *   3. Add the language to App Store Connect / Play Console listings
 *
 * Strings that stay in Arabic regardless of locale:
 *   - بسم الله (Bismillah)
 *   - ﷽ glyph
 *   - Quran/Dua Arabic text
 *   - Prayer names (Fajr, Dhuhr, etc.) — these are proper nouns
 */

import { getLocales } from 'expo-localization';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { id } from './locales/id';
import { ur } from './locales/ur';

export type Locale = 'en' | 'ar' | 'id' | 'ur';
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, Record<TranslationKey, string>> = { en, ar, id, ur };

const SUPPORTED_LOCALES: Locale[] = ['en', 'ar', 'id', 'ur'];

/**
 * Detect the user's locale from the device. Falls back to English for any
 * locale we don't have translations for.
 */
export function detectLocale(): Locale {
    try {
        const locales = getLocales();
        const primary = locales[0]?.languageCode?.toLowerCase();
        if (primary && SUPPORTED_LOCALES.includes(primary as Locale)) {
            return primary as Locale;
        }
    } catch {
        // getLocales may throw on web / some Expo Go contexts
    }
    return 'en';
}

let currentLocale: Locale = detectLocale();

export function getCurrentLocale(): Locale {
    return currentLocale;
}

export function setLocale(locale: Locale): void {
    currentLocale = locale;
}

/**
 * Check whether the current locale is right-to-left.
 * Used to flip certain UI elements (e.g. share icons, chevrons).
 */
export function isRTL(): boolean {
    return currentLocale === 'ar' || currentLocale === 'ur';
}

/**
 * Translate a key. Falls back to English if the current locale is missing
 * the key — never crashes, always returns a string.
 */
export function t(key: TranslationKey): string {
    return translations[currentLocale]?.[key] ?? translations.en[key] ?? String(key);
}
