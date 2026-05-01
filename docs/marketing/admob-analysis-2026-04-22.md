# AdMob Deep Analysis — Azan Time

**App:** Azan Time: Prayer Time & Qibla (com.azantime.app, v1.2.0)
**SDK:** react-native-google-mobile-ads ^16.0.3 (Expo 55, RN 0.83, new arch enabled)
**Audited files:** `app.json`, `components/AdBanner.tsx`, `components/AdBanner.web.tsx`, all screens under `app/(tabs)/`
**Report date:** 2026-04-22

---

## Executive summary

You have AdMob *installed* but not *implemented*. There is one banner on one of five tabs, the iOS configuration is still pointing at Google's public test IDs, the SDK is never explicitly initialized, there is no UMP/consent flow (which means EEA/UK traffic is either being served at low eCPM or not at all), and you've hard-coded `requestNonPersonalizedAdsOnly: true` for every user globally — that single line is leaving an estimated 30–50% of banner revenue on the table.

The bigger story is **structural under-monetization**: a prayer app gets multiple high-intent sessions per day (5 prayer notifications + return visits), and you are showing one anchored banner. No interstitials at natural break points, no app-open ads on return-from-notification, no native ads in the long scroll lists (Dua, Radio), and no rewarded ads to monetize the most engaged users. Realistic upside from fixing the listed P0/P1 items: **3–6× current AdMob ARPDAU**, before any new traffic.

### State of monetization today

| Surface | Ad? | Notes |
|---|---|---|
| Prayers (home tab) | Anchored adaptive banner | Only ad in the app |
| Tracker | None | Long, scrollable, daily-use screen |
| Dua | None | Tabbed lists (Morning/Evening/Daily/Tasbih) — perfect for native ads |
| Radio | None | User opens, presses play, audio runs — perfect for interstitial on play |
| Qibla | None | Sensor-driven, brief sessions — natural close-screen interstitial |
| App open / resume | None | App is launched 5×/day from prayer notifications — biggest miss |

---

## P0 — Ship-blocking / revenue-bleeding (do this week)

### 1. iOS is wired to Google's test IDs in production config

In `app.json`:

```json
"iosAppId": "ca-app-pub-3940256099942544~1458002511"
```

That is Google's public sample App ID. Any iOS production build will (a) fail App Store review if Apple notices, (b) serve only Google's test creatives if it doesn't, and (c) earn $0 either way.

In `components/AdBanner.tsx`:

```ts
ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
```

Placeholder string. The banner ad unit for iOS does not exist.

**Action:** create an iOS app + banner ad unit in AdMob (publisher ID `pub-3166995085202346`), put the App ID in `app.json` and the unit ID in `AdBanner.tsx`. Even if you only ship Android right now, fix the `iosAppId` in `app.json` — it gets compiled into the iOS build manifest the moment you toggle iOS on.

### 2. SDK is never initialized

There is no `MobileAds().initialize()` call anywhere in the codebase (grepped — zero matches for `MobileAds`, `initialize`, `setRequestConfiguration`). The library auto-initializes lazily on first ad request, but that means:

- First banner request races against the SDK warm-up → first impression on every cold start often misses the auction window.
- You can't set `RequestConfiguration` (test devices, COPPA / `tagForChildDirectedTreatment`, max ad content rating, `tagForUnderAgeOfConsent`).
- You can't await mediation adapter readiness (matters as soon as you add a second network).

**Action:** add an `initializeAds()` call in `app/_layout.tsx`'s `useEffect` (after fonts load is fine). Set `maxAdContentRating: 'G'` (this is a religious app — keeps creatives appropriate and helps the brand-safety filter), and register your physical test device IDs so you don't accidentally click live ads in dev (which can get the account flagged).

### 3. Hard-coded `requestNonPersonalizedAdsOnly: true` is costing real money

```ts
requestOptions={{ requestNonPersonalizedAdsOnly: true }}
```

This is on for every user, on every request, regardless of where they live or whether they've consented. Two problems:

- For users *outside* GDPR scope (US, most of MENA, SEA — likely your majority), you're voluntarily disabling personalized ads. Industry-standard impact: **−30% to −50% eCPM** on banners, worse on interstitials.
- For users *inside* GDPR scope who would have consented, you're not even giving them the chance — the UMP flow is missing entirely.

**Action:** implement Google's UMP SDK (`react-native-google-mobile-ads` ships it; the `AdsConsent` API is in the same package). Show the consent form once on first launch in EEA/UK/Switzerland, store the result, and pass `requestNonPersonalizedAdsOnly` based on the actual consent status — not as a hard-coded `true`.

### 4. No UMP / consent flow at all

Linked to #3 but worth calling out separately. As of late 2024, Google enforces "consent required" for EEA/UK traffic — without UMP you risk **ads not serving at all** in those regions, plus regulatory exposure under DMA/GDPR. The `react-native-google-mobile-ads` package exposes `AdsConsent.requestInfoUpdate()` and `AdsConsent.loadAndShowConsentFormIfRequired()`. This is a one-time integration, ~30 lines.

### 5. Privacy policy + AdMob disclosure

`privacy-policy.html` is present in the repo — verify it discloses (i) that you use AdMob, (ii) the data Google may collect (advertising ID, IP, etc.), (iii) a link to Google's policies, and (iv) opt-out instructions. Required by both Play Store Data Safety and Apple's Privacy Nutrition Labels. If this is missing, the next Play Console review can pull the listing.

---

## P1 — High-leverage revenue gains (do in the next 2 weeks)

### 6. Add an interstitial at a single, natural break point

The cleanest first interstitial in your app: **after the user taps a radio station to start playback**, *before* the audio actually starts. Listeners are settling in for a long session, the ad doesn't interrupt anything they're consuming, and AdMob interstitial eCPM is roughly 5–10× banner eCPM.

Implementation outline (in `app/(tabs)/radio.tsx`):

```ts
// Preload one ahead of time on screen mount
const interstitial = InterstitialAd.createForAdRequest(unitId);
interstitial.load();

// On station press:
if (interstitial.loaded) {
  interstitial.show();
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    startPlayback(station);
    // reload for next time
    interstitial.load();
  });
} else {
  startPlayback(station); // never block the user
}
```

Cap at **1 interstitial per 3 minutes per user** (frequency cap, configured in AdMob console *and* in code as a backup). Showing more than that on a religious app will trigger uninstalls and 1-star reviews — the upside is asymmetric on the downside.

### 7. App Open Ad on resume from prayer notification

Your app is uniquely structured to benefit from App Open Ads: prayer-time notifications bring users back to the app **5 times per day**, far more than a typical utility. Each of those resumes is a perfect AOA slot.

The pattern:

```ts
const appOpenAd = AppOpenAd.createForAdRequest(unitId);
appOpenAd.load();

// In the root layout, on AppState 'active' from 'background':
if (appOpenAd.loaded && timeSinceLastShow > 4 * 60 * 60 * 1000) {
  appOpenAd.show();
}
```

Cold-start AOA is also worth it but lower-priority than warm resume here — warm resume is your high-frequency event. Frequency cap **1 per 4 hours** to avoid annoying daily users.

### 8. Native ads in Dua and Radio lists

Both `dua.tsx` and `radio.tsx` render long scrollable lists of items styled with your design system. Native ads (`NativeAd` from react-native-google-mobile-ads) let you render the ad with your card styling — same border radius, same typography — so it feels like content. Industry data: native ads in feed-style lists earn **3–4× the eCPM of banners** with materially lower complaint rates.

Place one native ad after every 6th list item. The Radio category list is the highest-value slot because the audience is intent-engaged (browsing for content to consume).

### 9. Per-screen ad unit IDs

Right now you have one banner unit ID. As soon as you add a second placement, give each placement its own AdMob unit ID. Reason: AdMob reports by ad unit, not by screen — without per-screen units you can't see which placements are paying for themselves and which are dragging your overall eCPM down. Recommended structure:

| Unit | Format | Screen |
|---|---|---|
| `banner_home` | Banner | Prayers tab |
| `banner_tracker` | Banner | Tracker (if added) |
| `native_dua_list` | Native | Dua list |
| `native_radio_list` | Native | Radio list |
| `interstitial_radio_play` | Interstitial | Radio play tap |
| `app_open` | App Open | Resume from background |
| `rewarded_unlock` | Rewarded | (see #10) |

### 10. Rewarded ad for "remove banner ads for 24h" or premium reciter

Optional but high-value for power users: offer rewarded video to unlock something they care about. Two natural rewards in your app:

- "Watch a short video to remove banner ads for 24 hours."
- "Watch a short video to unlock the Mishary Rashid recitation set for today."

Rewarded eCPM is consistently the highest of any AdMob format ($15–$40 in many markets). The "remove ads for 24h" framing also acts as a soft IAP gauge — if a meaningful share of users opt in repeatedly, you have validated demand for a paid ad-free tier.

---

## P2 — Code-quality issues that will bite you later

### 11. AdBanner has zero error handling and zero telemetry

```tsx
<BannerAdComponent unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} ... />
```

No `onAdLoaded`, no `onAdFailedToLoad`, no `onAdOpened`. You can't tell from inside the app whether your banner is filling or failing. Add the four standard listeners and pipe failures (with `error.code`) into whatever crash/analytics tool you use. Without this, when fill rate tanks for a region you'll only find out from the AdMob dashboard a day later.

### 12. The `require()` indirection runs in production

The dynamic-load dance at the top of `AdBanner.tsx`:

```ts
if (!isExpoGo) {
  try {
    const adsModule = require('react-native-google-mobile-ads');
    ...
  } catch { ... }
}
```

…is correct for Expo Go DX, but in a production build the module always exists. The `require` still runs, the try/catch still wraps it, and Metro can't tree-shake. Cleaner: split into two files (`AdBanner.tsx` for native and `AdBanner.expogo.tsx` if you need a stub) and use a Metro/Babel resolver for the Expo Go variant. Minor, but worth doing once you depend on more ad code paths.

### 13. Banner is wrapped in `paddingVertical: 4` — fine, but verify on small devices

Adaptive banner sizing is height-variable. On smaller phones the 4px padding plus tab bar plus banner can crowd the prayer-times card. Take a screenshot on a 5.5" device after the banner loads and confirm.

### 14. `__DEV__` guard is correct — keep it

Good: you fall back to `TestIds.ADAPTIVE_BANNER` in dev. Keep that. **Add your real device's `Settings -> About` advertising ID to the SDK's test device list** so live ads are also treated as test impressions on your phone — clicking your own live ads is the #1 way to get an AdMob account suspended, and a suspension on a publisher with a single Android app is usually permanent.

### 15. Notifications + ads interaction

Your prayer notifications run in the background and, when tapped, foreground the app. Make sure the App Open Ad (when you add it) does not show *during* the moment-of-prayer transition — UX-wise, showing an ad when the user opened the app to confirm Maghrib started is a bad look. Suppress AOA for 60 seconds after a prayer-time notification fires.

---

## Suggested implementation order

| Week | Task | Effort | Expected lift |
|---|---|---|---|
| 1 | P0 #1, #2, #3, #4, #5 | 1–2 days | Stops bleeding; restores EEA traffic; +30–50% banner eCPM |
| 1 | P1 #6 (interstitial on radio play) | 0.5 day | +largest single revenue jump |
| 2 | P1 #7 (App Open on resume) | 1 day | +second-largest jump (5×/day surface) |
| 2 | P1 #8 (native in lists) | 1–2 days | +higher eCPM in long sessions |
| 3 | P1 #9 (per-screen unit IDs) | 0.5 day | Unblocks reporting/optimization |
| 3 | P1 #10 (rewarded) | 1 day | High eCPM + IAP signal |
| 4 | P2 cleanup | 0.5 day | Reliability, future-proofing |

---

## What I did *not* check

- Actual AdMob console settings (mediation, ad unit configuration, payment, tax info, Play Store linking, Firebase linking). Worth a separate review.
- Privacy policy content (file is present but I did not parse it).
- Whether Family Policy / Designed-for-Families flag is set in Play Console (matters because the app could plausibly be browsed by kids).
- App Tracking Transparency (ATT) prompt on iOS — required as soon as you ship iOS *and* personalized ads, separate from UMP.
