/**
 * Detox configuration — REUSABLE TEMPLATE for OVC Tech Expo/React-Native apps.
 *
 * This file, the `e2e/` specs, and the `test:e2e:detox` / `build:e2e:detox`
 * scripts are designed to be copied verbatim into any D:\Mobile app; only the
 * `avdName` (emulator) and the app-specific bits of the specs change.
 *
 * Two device targets:
 *   • `attached`  → the first device on `adb devices` (the real S25 Ultra we
 *                   connect over TCP with `adb connect <ip:port>`). Real-device runs.
 *   • `emulator`  → a named AVD for CI / local headless runs.
 *
 * Debug vs release apps:
 *   • android.debug  → app-debug.apk + Metro. Start Metro with the E2E seam on
 *                      (`npm run start:e2e`, i.e. EXPO_PUBLIC_E2E=1) so the tests
 *                      can read the hidden e2e-* rows and drive deterministic state.
 *   • android.release→ a self-contained bundle; build it with EXPO_PUBLIC_E2E=1
 *                      so the seam is inlined (see build command below).
 *
 * The androidTest (Espresso instrumentation) APK requires the Detox test deps in
 * android/app/build.gradle. Add them once via the `@config-plugins/detox` Expo
 * config plugin (see e2e/README.md) — that keeps the native wiring out of this
 * template and regenerable with `expo prebuild`.
 *
 * @type {Detox.DetoxConfig}
 */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 240000, // dev-client + Metro bundle can take a while on first launch
    },
  },

  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath:
        'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      // gradlew.bat for Windows/PowerShell. Strip the leading empty PATH entry
      // in the shell first (see e2e/README.md) or the cmd shell-out fails.
      build:
        'cd android && gradlew.bat app:assembleDebug app:assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081], // adb reverse so a real device reaches Metro on the host
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath:
        'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      // Inline the E2E seam into the release bundle so the hidden test rows exist.
      build:
        'cd android && set EXPO_PUBLIC_E2E=1&& gradlew.bat app:assembleRelease app:assembleAndroidTest -DtestBuildType=release',
    },
  },

  devices: {
    attached: {
      type: 'android.attached',
      device: { adbName: '.*' }, // first attached device (the connected S25 Ultra)
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' }, // change per machine
    },
  },

  configurations: {
    'android.att.debug': { device: 'attached', app: 'android.debug' },
    'android.att.release': { device: 'attached', app: 'android.release' },
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
    'android.emu.release': { device: 'emulator', app: 'android.release' },
  },
};
