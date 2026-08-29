# Fleet check — find silently dead ad units

**Status:** not started.
**Origin:** the Azan Time interstitial bug, 2026-08-28.

## The failure mode

Azan Time served ZERO interstitials for four releases (v1.3.5 → v1.3.12) because
`AD_UNIT_IDS.interstitialMain.android` had one wrong digit
(`...1260065927` shipped; the real unit is `...1266065927`).

**A request against a non-existent ad unit fails client-side, before it reaches
AdMob.** It therefore logs *no error* and produces *no failed request* — it
produces nothing at all. There is no crash, no console warning, and no red
number on any dashboard. Azan's banner ID was correct and kept serving the whole
time, so every top-line metric looked healthy.

This is invisible to code review and to testing (a test ad unit is used in dev).
The only way to detect it is from the AdMob side: **a live unit with zero
requests.**

## The check, per app

For each app in the fleet with a configured ad unit:

1. AdMob → **Apps** → *the app* → **Ad units**. Note each unit's ID.
2. AdMob → **Reports**, and build a report with:
   - Dimension: **Ad unit** (add **App version** if you want to pin the regression
     to a release boundary, which is what identified the Azan bug)
   - Metric: **Requests**
   - Date range: **last 30 days**
3. **Any ad unit that exists and is live but shows 0 requests is suspect.**
   Confirm by diffing the console ID against the string in that app's
   `services/adsService.ts`, character by character.

A unit with requests but zero impressions is a *different* (fill/mediation)
problem, not this one.

## Apps and their configured units (verified 2026-08-28)

| App | Banner | Interstitial |
|---|---|---|
| `admob-earnings`   | `9386278268` | — |
| `azanapp`          | `5942887541` | `1266065927` ✅ verified in console |
| `fasting-buddy`    | `5447033250` | `4291151689` |
| `gsc-dashboard`    | `7833523441` | `8342645552` |
| `hala-app`         | `4225177543` | `7721569425` |
| `mentalism-app`    | `3078487846` | `7544569205` |
| `silent-mode-app`  | `6111845294` | — |
| `social-stats-app` | `2941266757` | — |
| `speakup-app`      | `4255838145` | `9631676499` |

All under publisher `ca-app-pub-3166995085202346`. No ID is shared between two
apps, so the Azan typo was NOT copy-pasted — each of the above still needs its
own console comparison.

## Prevention

Azan now carries a unit-ID assertion test (`__tests__/adsInterstitialGuards.test.ts`)
that pins the exact string, plus a source comment saying to copy IDs from the
console rather than retyping them. Worth replicating wherever a unit is wired.
