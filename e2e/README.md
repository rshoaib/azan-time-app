# Detox E2E — reusable template

End-to-end tests that drive the **real app on a real device/emulator**. This is
the OVC Tech template: copy `.detoxrc.js`, `e2e/`, and the `*:detox` scripts into
any D:\Mobile app and adjust the app-specific selectors.

Unit tests (`npm test`, Jest + ts-jest over `__tests__/`) and the existing Maestro
smoke suite (`npm run test:e2e`) are unchanged and still run in the ship pipeline.
Detox is additive.

## What's covered

| Spec | Guards |
| --- | --- |
| `ad-trigger.test.js` | **Regression lock for the ad-placement fix.** Return-to-Home fires **no** interstitial; completing the day fires **exactly one**; the pinned banner is present and **not clipped**. |
| `core-function.test.js` | Prayer times load (deterministic under the E2E clock), tracker logs a prayer, every primary tab renders. |
| `onboarding-permissions.test.js` | App reaches its main screen whether notifications are granted or denied. |
| `safe-area.test.js` | Edge-to-edge: tab bar reachable, banner clear of the nav bar on every tab, header not under the status bar. Run on a real gesture-nav device. |

## The E2E seam

Specs depend on `EXPO_PUBLIC_E2E=1` (inlined at bundle time — dead-code-eliminated
in production). It freezes the clock/location (London, fixed instant) and exposes
hidden status rows on **Settings**:

- `e2e-interstitial-count` — how many interstitials have fired this session. Under
  E2E the ads service **records the decision instead of showing a real full-screen
  ad**, so the ad-trigger test is deterministic and never blocks on ad fill
  (`services/adsService.ts` → `maybeShowInterstitial`).
- `e2e-azan-state`, `e2e-scheduled-count`, `e2e-fire-azan`, `e2e-force-error`.

Selectors used by the specs: tab labels (`Prayers/Tracker/Dua/Tilawat/Qibla/Settings`),
`tracker-prayer-<name>`, `ad-banner`, and the `e2e-*` rows above.

## One-time setup

1. **Install the tooling** (versions must match the Expo SDK — resolve with latest):
   ```powershell
   npm install --save-dev detox@latest "@config-plugins/detox@latest"
   ```
2. **Wire the native androidTest deps.** This is a bare workflow (committed
   `android/`), so either:
   - add `"@config-plugins/detox"` to `expo.plugins` in `app.json` and re-run
     `npx expo prebuild -p android --clean`, **or**
   - add the Detox instrumentation deps + `testInstrumentationRunner` to
     `android/app/build.gradle` manually (see the config-plugin's README for the
     exact block).
3. **Emulator config:** set your AVD name in `.detoxrc.js` (`devices.emulator.avdName`).
   Real device needs no name — `attached` grabs the first `adb devices` entry.

## Running

Fix the shell PATH first (this machine's `$env:Path` starts with `;`, which breaks
`gradlew`'s cmd shell-out):

```powershell
$env:Path = (($env:Path -split ';' | Where-Object { $_ -ne '' }) -join ';')
```

**Debug (Metro-served) against the connected S25 Ultra:**
```powershell
adb connect 192.168.1.12:38287        # if using TCP
npm run start:e2e                      # terminal 1 — Metro with the E2E seam
npm run build:e2e:detox                # terminal 2 — builds app + androidTest APKs
npm run test:e2e:detox                 # runs the specs on the attached device
```

**Emulator:** swap the configuration, e.g.
`detox test --configuration android.emu.debug`.

**Release-style run** (self-contained bundle, seam inlined — see `.detoxrc.js`
`android.release`): `detox build/test --configuration android.att.release`.

## Notes

- `maxWorkers: 1` — one device, serial specs.
- Specs relaunch with fresh state (`launchFresh`) so counters/tracker start clean.
- If a spec can't find a tab, confirm the labels in `app/(tabs)/_layout.tsx` still
  match `helpers.js` `TAB`.
