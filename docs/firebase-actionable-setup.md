# Firebase actionable setup — Crashlytics, Performance, Day-1 funnel

This document describes the three high-priority changes wired into Azan Time on
2026-05-01, plus the manual steps needed in the Firebase console to make them
fully operational.

## 1. Crashlytics

### What was wired
- `@react-native-firebase/crashlytics` ^24.0.0 added to `package.json`.
- `@react-native-firebase/crashlytics` Expo plugin added to `app.json`.
- `services/crashlyticsService.ts` — lazy-loaded module exposing
  `bootstrapCrashlytics`, `logBreadcrumb`, `recordNonFatal`, `setUserId`.
- `app/_layout.tsx` calls `bootstrapCrashlytics()` at startup and installs a
  global `ErrorUtils` handler so uncaught JS errors land in Crashlytics with
  stack traces (chained — React Native's dev red-box still works).

### Console steps
1. Build a new EAS production app-bundle (no Crashlytics-specific console
   action is required to enable it — the dashboard activates as soon as the
   first crash report arrives).
2. After the build is on Play Store, force a test crash on a debug build with
   `crashlytics().crash()` once to confirm the pipeline.
3. In the Firebase console, set "Crash-free users" alerts: Crashlytics →
   Velocity alerts → enable thresholds (recommended: 99.5% threshold).

## 2. Performance Monitoring

### What was wired
- `@react-native-firebase/perf` ^24.0.0 added to `package.json`.
- `@react-native-firebase/perf` Expo plugin added to `app.json`.
- `services/performanceService.ts` — `bootstrapPerformance`, `traceAsync`,
  `traceSync` for custom traces.
- `app/_layout.tsx` calls `bootstrapPerformance()` at startup.

### Auto-captured metrics
App start time, screen render durations, and HTTP request latency are captured
without any further code changes once the SDK is in the build.

### Optional — wrap hot paths
Use `traceAsync` to measure custom durations:

```ts
import { traceAsync } from '@/services/performanceService';

const loc = await traceAsync('first_location_lookup', () => getCurrentLocation());
const prayers = await traceAsync('calc_prayer_times', () =>
  Promise.resolve(getPrayerTimes(loc.latitude, loc.longitude, new Date(), method)),
);
```

These show up in Firebase Performance → Custom traces with p50/p90/p95
distributions split by device class. Wrap whatever you suspect is slow on
first launch (the candidates: location lookup, reverse geocode, prayer-time
calculation, notification scheduling).

## 3. Day-1 retention funnel

### What was wired
Three new fire-once events in `services/analyticsService.ts`:

| Event                  | Fires when                                              | Hook                                                       |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `location_granted`     | User grants foreground location permission              | `locationService.requestLocationPermission()` after grant  |
| `notification_granted` | User grants notification permission                     | `notificationService.requestNotificationPermission()`      |
| `first_prayer_alarm`   | First time we successfully schedule >=1 prayer alarm    | `notificationService.schedulePrayerNotifications()` end    |

Each is gated by an AsyncStorage sentinel — fires at most once per install.

### GA4 funnel — manual setup

1. Open the linked GA4 property (Firebase console → Analytics → "View more in
   Google Analytics").
2. **Mark the new events as conversions:** GA4 → Admin → Events → toggle "Mark
   as conversion" on `location_granted`, `notification_granted`, and
   `first_prayer_alarm`. (You already have `app_open_day_2` and
   `first_adhan_heard` marked.)
3. **Build the funnel exploration:** Explore → "Funnel exploration" → Steps:
   1. Step 1 — `first_open` (auto-collected)
   2. Step 2 — `location_granted`
   3. Step 3 — `notification_granted`
   4. Step 4 — `first_prayer_alarm`
4. Set "Time between steps" to 1 day to align with Day-1 retention.
5. Add "Country" as a breakdown so you can see where the funnel leaks
   (suspect: Bangladesh has the most users but possibly the lowest pass-through
   rate due to default-deny notification policies on Xiaomi/Realme firmwares).
6. Save the exploration as **"D1 retention funnel"** and share to the property.

### What to look for after 7 days of data

- `first_open → location_granted` drop-off: if >40%, the location-permission
  prompt copy or timing is the problem. Try delaying the prompt until after the
  user sees a value-prop screen.
- `location_granted → notification_granted` drop-off: if >30%, the notification
  prompt is the culprit (Android 13+ POST_NOTIFICATIONS is the usual offender).
  Try a soft pre-prompt screen explaining "we need this to deliver the adhan".
- `notification_granted → first_prayer_alarm` drop-off: this should be near
  zero. Anything above 5% means scheduling is silently failing — check
  Crashlytics for related non-fatals and battery-optimization whitelisting.

## Build + deploy

```bash
# Install the new deps
npm install

# Build a production Android bundle (this is what surfaces SDK data)
npx eas build --platform android --profile production

# After upload + rollout, watch Firebase console:
#   Crashlytics → "Issues" populates within ~1 hour of first install
#   Performance → "Dashboard" populates within ~12 hours
#   Analytics → DebugView shows the funnel events in real time on debug builds
```

## Rollback

Each change is additive and gated by `loadXxxModule()` returning null in Expo
Go / web. To temporarily disable any service, comment out the corresponding
`bootstrapXxx()` call in `app/_layout.tsx` — the helpers will silently no-op.
