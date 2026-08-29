# Fleet work item — port the interstitial AppState guard

**Status:** not started. Scoped out of the Azan v1.3.13 fix deliberately.
**Origin:** audit during the Azan Time interstitial investigation, 2026-08-28.

## Why

Azan Time's ad placement was hardened in `160f6e0` after its measured
accidental-click history (v1.2.0 CTRs: 9.8% banner, 21.6% interstitial,
43.8% app-open, against a 1-3% norm — the invalid-traffic signature that
likely triggered the earlier suspension warning).

Two guards were added to `services/adsService.ts`:

1. `AppState.currentState !== 'active'` → refuse to show.
2. A tap quiet window (`noteUserTap()` + `INTERSTITIAL_TAP_QUIET_MS`).

**Guard 1 is missing from every other interstitial app in the fleet.** Those
apps can render an interstitial while backgrounded — an impression the user
cannot see and may dismiss with a blind tap. That is the same invalid-traffic
pattern that burned Azan.

## Apps needing the port

Verified 2026-08-28 — all have `interstitialMain` wired and **no** `AppState` import:

| App | Interstitial trigger site |
|---|---|
| `Utility/fasting-buddy`  | `app/fast-summary.tsx:49` |
| `Utility/gsc-dashboard`  | `app/(tabs)/index.tsx:250` |
| `Utility/hala-app`       | `app/practice.tsx:245` |
| `Utility/mentalism-app`  | `app/daily-challenge.tsx:85` |
| `Utility/speakup-app`    | `app/results.tsx:96` |

Not affected (banner only, no interstitial unit): `admob-earnings`,
`silent-mode-app`, `social-stats-app`.

## Exactly what to port

In each app's `services/adsService.ts`:

1. Add `AppState` to the react-native import:
   `import { AppState, Platform } from 'react-native';`
2. In `maybeShowInterstitial()`, after the existing cap checks and before the
   show/E2E branch, add:
   ```ts
   // Never render over the lock screen, a notification shade, or another app —
   // an ad the user cannot see is an impression they may dismiss by tapping blind.
   if (AppState.currentState !== 'active') return false;
   ```
3. In that app's ads test file, add `AppState: { currentState: 'active' }` to the
   `jest.mock('react-native', ...)` factory, or its suite will throw on the new read.

**Guard 2 (the tap quiet window) is NOT a blanket port.** It exists because
Azan's tracker row cycles status on repeated taps. Only port it to a screen
where the ad trigger fires from a control the user taps repeatedly. Of the five,
`mentalism-app/daily-challenge.tsx` is the one worth checking first.

## Verification per app

- `npx jest` green.
- Grep confirms exactly one `AppState.currentState !== 'active'` in
  `maybeShowInterstitial()`.
- The guard only ever *reduces* exposure — no cap or trigger changes.
