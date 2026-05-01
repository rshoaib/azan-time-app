# i18n — Internationalization

Azan Time ships with 4 locales:
- **English (en)** — source of truth
- **Arabic (ar)** — RTL
- **Indonesian (id)**
- **Urdu (ur)** — RTL

## Setup (one-time)

This module uses `expo-localization` to detect the device locale. Install it if not already:

```bash
npx expo install expo-localization
```

## Using translations in a component

```tsx
import { t } from '@/i18n';

<Text>{t('next_prayer')}</Text>
```

## Adding a new locale

1. Copy `locales/en.ts` → `locales/<lang>.ts`
2. Translate every value (keys stay English)
3. Import and register it in `i18n/index.ts`
4. Add the locale to `SUPPORTED_LOCALES`
5. Add the language to your App Store Connect + Play Console listings (each adds a new keyword-search index)

## Adding a new string

1. Add the key + English value to `locales/en.ts`
2. Add a translation for every other locale
3. Use `t('new_key')` in components

## RTL handling

`isRTL()` returns `true` for Arabic and Urdu. Use it to flip icons, chevrons, and share buttons:

```tsx
import { isRTL } from '@/i18n';

<FontAwesome
  name={isRTL() ? 'chevron-left' : 'chevron-right'}
  size={14}
/>
```

For global app-level RTL layout (which flips flex rows, margins, etc.), you need:

```tsx
import { I18nManager } from 'react-native';
import { isRTL } from '@/i18n';

// In app/_layout.tsx, before rendering the tabs:
I18nManager.forceRTL(isRTL());
```

Note: `forceRTL` requires an app restart on first change. Show a "Restart to apply" dialog when a user changes to/from an RTL language in settings.

## Translation review

Machine translation is fine as a first pass, but before shipping each locale:
- **Arabic**: ask a native speaker on r/islam or a hired translator ($50 on Fiverr)
- **Urdu**: ask a Pakistani/Indian Muslim community member — common Nastaliq phrasing matters
- **Indonesian**: similar; ask on r/indonesia

## Why not i18next / react-intl?

These libraries bundle 40–60kB of runtime (plural rules, ICU, caches) for features we don't need. Our strings are static, we have no pluralization beyond `{count} days`, and we have <200 keys. Lightweight custom impl is the right call. Swap in a real lib only when we exceed ~500 keys or need runtime plural/ICU.
