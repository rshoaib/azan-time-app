// Expo config plugin: build for BOTH arm64-v8a and armeabi-v7a.
//
// The CNG default for this app was arm64-v8a ONLY, which drops 32-bit ARM. Many
// budget Android devices run apps in a 32-bit process even on 64-bit hardware —
// with no armeabi-v7a lib they crash on launch with
//   com.facebook.soloader.SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so
// (seen in Crashlytics, MainApplication.onCreate, ~9 users on v1.2.0–1.2.5).
//
// Setting this via a config plugin (instead of editing android/gradle.properties
// directly) means it survives `expo prebuild` — including `prebuild --clean`,
// which would otherwise reset gradle.properties to the template default.
//
// Play delivers per-ABI splits from the AAB, so users still download only their
// own architecture — this just stops excluding 32-bit ARM devices.
const { withGradleProperties } = require('expo/config-plugins');

const ARCHITECTURES = 'arm64-v8a,armeabi-v7a';

module.exports = function withReactNativeArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find(
      (p) => p.type === 'property' && p.key === 'reactNativeArchitectures',
    );
    if (existing) {
      existing.value = ARCHITECTURES;
    } else {
      props.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: ARCHITECTURES,
      });
    }
    return cfg;
  });
};
