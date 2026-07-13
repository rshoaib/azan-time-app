# Azan Time — UI/UX Code Review & Issues Report

**App:** Azan Time (`com.azantime.app`)
**Reviewed version:** 1.2.9 / versionCode 26
**Shipped version after this pass:** 1.3.0 / versionCode 27
**Date:** 2026-06-28
**Scope:** Full read-through of all six tab screens (`app/(tabs)/*`), root + tab layouts, shared UI components, theme system, and the services that back the UI.

Azan Time is a mature, well-architected Expo / React Native app: a reactive light/dark theme system, tokenized spacing/typography, sensible accessibility roles in most places, and careful audio/race handling on the Radio tab. The issues below are therefore mostly polish and cross-device-robustness items rather than broken functionality. **Every issue listed has been fixed in this pass.**

---

## Critical

### C1 — Headers ignore the device safe-area (status-bar / cutout overlap)
**Files:** `app/(tabs)/index.tsx`, `tracker.tsx`, `dua.tsx`, `radio.tsx`, `qibla.tsx`, `settings.tsx`
Every screen header used a hardcoded `paddingTop: 56`, and the Home screen's settings cog used a hardcoded `top: 56`. The app ships with `edgeToEdgeEnabled: true` (and Android 15 enforces edge-to-edge), so content draws *behind* a transparent status bar. On devices whose status-bar / camera-cutout height differs from the assumed ~28dp, the Bismillah glyph, the screen titles, and the Home settings cog crowd or collide with the system clock/battery.
**Fix:** Added `useSafeAreaInsets()` to each screen and pad the header by `insets.top + spacing` (and the Home cog by `insets.top`). Headers now adapt to any device. The bottom tab bar already did this correctly via `insets.bottom`.

### C2 — Settings modals can't be dismissed with Android Back or a backdrop tap
**File:** `app/(tabs)/settings.tsx`
The three bottom-sheet modals (Calculation Method, Notify Before, Adhan voice) were declared `<Modal transparent>` with **no `onRequestClose`** and a non-interactive scrim. On Android the hardware Back button was a no-op while a modal was open (RN warns in dev), and tapping the dimmed area outside the sheet did nothing — the only exit was the small ✕. This violates the platform Back convention users rely on.
**Fix:** Added `onRequestClose` to all three modals (Back now closes them) and wrapped the scrim in a `Pressable` so tapping outside the sheet dismisses it; the sheet itself swallows touches so inner taps don't close it.

---

## Major

### M1 — Active "Theme" segment fails contrast in dark mode
**File:** `app/(tabs)/settings.tsx` (Appearance segmented control)
The selected segment paints a gold (`#D4930D`) pill with `segmentTextActive: { color: c.textPrimary }`. In dark mode `textPrimary` is near-white (`#F2F4F8`) → roughly **2.5:1** on gold, below the WCAG AA 4.5:1 minimum, so the active "Light/Dark/Auto" label is hard to read.
**Fix:** The selected-segment label now uses a fixed dark ink (`#1A1D2E`) regardless of theme — the pill is always gold, so dark text gives ~5.9:1 in both modes.

### M2 — Tasbih "of N" target text is low-contrast on the gradient
**File:** `app/(tabs)/dua.tsx`
Inside the teal gradient counter circle the count uses white (`onAccent`) but the "of 33" target line used `c.textMuted` — a mid-grey that washes out on the teal gradient.
**Fix:** Switched the target line to a translucent white (`rgba(255,255,255,0.8)`), matching the established on-gradient text pattern used elsewhere (Radio "now playing", Qibla info pills).

### M3 — Radio "Connecting…" spinner doesn't spin
**File:** `app/(tabs)/radio.tsx`
While a station loaded, the main play button rendered a static FontAwesome `spinner` glyph with only an opacity pulse — it reads as a frozen icon, not a loading state.
**Fix:** Replaced it with a real `ActivityIndicator` (white) so the loading state visibly animates.

---

## Minor

### m1 — Home countdown pill flashes empty on first paint
**File:** `app/(tabs)/index.tsx`
`countdown` state initialises to `''`, and the hero "next prayer" pill renders it immediately, so the pill showed only a clock icon with no text for up to one second until the first interval tick.
**Fix:** The pill now falls back to `getTimeRemaining(nextPrayerTime)` when `countdown` is still empty, so it's correct on the first frame.

### m2 — Accessibility gaps on Dua cards
**File:** `app/(tabs)/dua.tsx`
The card's expand/collapse `Pressable` and the Listen/Stop audio button had no `accessibilityRole`/`accessibilityLabel`, so screen-reader users got an unlabeled control.
**Fix:** Added `accessibilityRole="button"`, descriptive labels, and an `accessibilityState={{ expanded }}` to the card; the audio button announces "Play/Stop dua audio".

### m3 — "Fajr & Maghrib this week" chart values are unattributable
**File:** `app/(tabs)/index.tsx`
Each day column stacked two bare times with no indication which was Fajr and which Maghrib (the legend was at the bottom only).
**Fix:** Added small Fajr/Maghrib colour dots next to each of the two time rows so every number is attributable at a glance.

### m4 — Version-string drift between `package.json` and `app.json`
`package.json` was `1.2.0` while `app.json` was `1.2.9`.
**Fix:** Aligned both to `1.3.0` in this release.

---

## New feature shipped this pass

### ⭐ Asr Juristic Method (Hanafi / Standard)
**Why:** The single most-requested setting missing from this app. The time for Asr differs between the Hanafi school (later — shadow = 2× object length) and the Shafiʿi/Maliki/Hanbali "Standard" position (shadow = 1× object length). Without it, a large share of users (the Hanafi-majority Indian subcontinent — a primary audience for this app) saw an Asr time they consider incorrect, with no way to fix it. The underlying `adhan` library already supports it, so this is high value at low risk.

**Implementation:**
- `services/prayerService.ts` — `getPrayerTimes()` gains an optional `madhab` argument (`'shafi' | 'hanafi'`, default `'shafi'` so existing behaviour and tests are unchanged) that sets `params.madhab`.
- `services/storageService.ts` — `getMadhab()` / `setMadhab()` (key `asr_madhab`, default `'shafi'`).
- `app/(tabs)/settings.tsx` — a new "Asr Calculation" segmented control under **Prayer Calculation**, with a one-line explainer; logged to analytics as `asr_madhab`.
- `app/(tabs)/index.tsx` & `services/notificationService.ts` — both read the madhab and thread it into every `getPrayerTimes()` call, so the Home list, the weekly chart, and scheduled notifications all honour the choice.

---

## Verified-healthy (no change needed)

- **Radio playback race handling** — the monotonic `playTokenRef` correctly prevents overlapping recitations on fast switching and on tab blur.
- **Theme system** — `useThemeStyles` memoises per scheme; light/dark palettes are complete and the navigation theme flips with the app theme.
- **Bottom tab bar** — already respects `insets.bottom`.
- **i18n** — locale files exist but are not yet wired into the screens; wiring full localization is out of scope for a UI/UX pass and is tracked separately.
