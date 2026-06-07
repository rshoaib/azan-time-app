// Expo config plugin: exact-alarm permissions so prayer azan fires ON TIME.
//
// expo-notifications schedules via AlarmManager and only uses
// setExactAndAllowWhileIdle() when AlarmManager.canScheduleExactAlarms() is true.
// On Android 12+ (API 31+) that requires an exact-alarm permission — without it,
// notifications fall back to setAndAllowWhileIdle() (inexact), so the azan can be
// delayed by minutes under Doze/batching. For a prayer app that's unacceptable.
//
// We declare:
//   - USE_EXACT_ALARM     (API 33+): auto-granted, non-revocable, intended for
//     alarm/clock/reminder apps whose core function is exact alarms — prayer
//     times qualify. No runtime prompt, best UX.
//   - SCHEDULE_EXACT_ALARM (scoped to maxSdkVersion 32 = Android 12 only): granted
//     by default on Android 12. Scoping it to ≤32 keeps Google Play review clean
//     on 13+ (where USE_EXACT_ALARM is the sanctioned permission).
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withExactAlarmPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const perms = manifest['uses-permission'];

    const upsert = (name, maxSdkVersion) => {
      const existing = perms.findIndex((p) => p.$ && p.$['android:name'] === name);
      if (existing !== -1) perms.splice(existing, 1);
      const attrs = { 'android:name': name };
      if (maxSdkVersion) attrs['android:maxSdkVersion'] = String(maxSdkVersion);
      perms.push({ $: attrs });
    };

    upsert('android.permission.USE_EXACT_ALARM');           // Android 13+
    upsert('android.permission.SCHEDULE_EXACT_ALARM', 32);  // Android 12 only

    return cfg;
  });
};
