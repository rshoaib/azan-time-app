/**
 * withReleaseSigning — keeps the Play upload-signing setup alive across
 * `expo prebuild`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npx expo prebuild` clears and regenerates `android/` even without
 * `--clean`. Because `android/` is gitignored fleet-wide, everything
 * hand-added there is destroyed with no git safety net:
 *
 *   - `android/app/build.gradle`  → signingConfigs.release gone; the release
 *                                   buildType reverts to signingConfigs.debug
 *   - the working `*.jks`         → deleted (when it lives under android/)
 *   - `android/keystore.properties` / gradle.properties creds → gone
 *
 * The failure is SILENT: the build still succeeds and emits a DEBUG-signed AAB
 * that Play rejects on upload. This plugin lives outside `android/`, so it is
 * committed and survives prebuild — it re-applies all of the above on every
 * single prebuild, and throws if it could not.
 *
 * This is the config-plugin form of the fleet's `scripts/postprebuild.mjs`
 * signing block (see Games/inkrush). It runs automatically as part of prebuild
 * rather than needing a separate command, so it cannot be forgotten.
 *
 * WHAT IT DOES
 * ------------
 *   a) restores the working keystore from D:\Mobile\.keystores\ if missing
 *   b) regenerates android/keystore.properties from the gitignored, outside-
 *      the-repo secrets file (no password is ever stored in a tracked file)
 *   c) injects signingConfigs.release + the loud GradleException guard so a
 *      missing/debug key fails the release build instead of shipping.
 *
 * CONFIGURATION (app.json → expo.plugins)
 * ---------------------------------------
 *   ["./plugins/withReleaseSigning", {
 *     "slug":           "azanapp",                      // .keystores file prefix
 *     "keystoreBackup": "azanapp-upload-keystore.jks",  // file in .keystores\
 *     "storeFile":      "upload-keystore.jks"           // relative to android/
 *   }]
 *
 * SECRETS
 * -------
 * Passwords come from `D:\Mobile\.keystores\<slug>-signing.properties`, which
 * sits outside every git repo (the same folder already used for keystore
 * backups). Override the folder with EXPO_KEYSTORE_DIR. Nothing secret is read
 * from, or written to, a tracked file.
 */
const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_KEYSTORE_DIR = path.join('D:', 'Mobile', '.keystores');

const MARKER = 'UPLOAD_STORE_FILE'; // keystore.properties key the gradle block reads
const GUARD_TEXT = 'this release build would be DEBUG-signed';

// A build.gradle is considered already wired if it declares `useUploadKey` —
// the flag every variant of this signing block (plugin-injected or the older
// hand-applied ones) defines. Plain `expo prebuild` REUSES an existing android/
// tree rather than clearing it, so the mod routinely runs against a file that
// is already set up; re-injecting would duplicate the variable and break gradle.
const WIRED = /\bdef useUploadKey\b/;

function keystoreDir() {
  return process.env.EXPO_KEYSTORE_DIR || DEFAULT_KEYSTORE_DIR;
}

function parseProperties(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

/* ── (a) + (b) restore the keystore and its credentials ───────────────────── */

function restoreSigningMaterial(androidRoot, opts, log) {
  const dir = keystoreDir();

  // (a) working keystore. storeFile is resolved by gradle with
  // rootProject.file(), and rootProject is android/, so resolve it the same way.
  const working = path.resolve(androidRoot, opts.storeFile);
  if (fs.existsSync(working)) {
    log(`· keystore already present (${opts.storeFile})`);
  } else {
    const backup = path.join(dir, opts.keystoreBackup);
    if (!fs.existsSync(backup)) {
      throw new Error(
        `[withReleaseSigning] ${opts.slug}: keystore missing at ${working} and no backup at ` +
          `${backup}. Restore one before building a release, or the guard will fail the build.`,
      );
    }
    fs.mkdirSync(path.dirname(working), { recursive: true });
    fs.copyFileSync(backup, working);
    log(`✓ restored ${opts.storeFile} from ${opts.keystoreBackup}`);
  }

  // (b) keystore.properties, rebuilt from the out-of-repo secrets file.
  const propsPath = path.join(androidRoot, 'keystore.properties');
  if (fs.existsSync(propsPath)) {
    const existing = parseProperties(fs.readFileSync(propsPath, 'utf8'));
    if (existing.UPLOAD_STORE_FILE && existing.UPLOAD_STORE_PASSWORD) {
      log('· keystore.properties already present');
      return;
    }
  }

  const secretsPath = path.join(dir, `${opts.slug}-signing.properties`);
  if (!fs.existsSync(secretsPath)) {
    throw new Error(
      `[withReleaseSigning] ${opts.slug}: android/keystore.properties is missing and the secrets ` +
        `file ${secretsPath} was not found, so the password cannot be recovered. ` +
        `Recreate it with UPLOAD_STORE_PASSWORD / UPLOAD_KEY_ALIAS / UPLOAD_KEY_PASSWORD.`,
    );
  }
  const secrets = parseProperties(fs.readFileSync(secretsPath, 'utf8'));
  for (const key of ['UPLOAD_STORE_PASSWORD', 'UPLOAD_KEY_ALIAS', 'UPLOAD_KEY_PASSWORD']) {
    if (!secrets[key]) {
      throw new Error(`[withReleaseSigning] ${opts.slug}: ${secretsPath} has no ${key}.`);
    }
  }

  fs.writeFileSync(
    propsPath,
    [
      `# Generated by plugins/withReleaseSigning.js on every prebuild. Gitignored.`,
      `# Secrets come from ${secretsPath} — never from a tracked file.`,
      `UPLOAD_STORE_FILE=${opts.storeFile}`,
      `UPLOAD_STORE_PASSWORD=${secrets.UPLOAD_STORE_PASSWORD}`,
      `UPLOAD_KEY_ALIAS=${secrets.UPLOAD_KEY_ALIAS}`,
      `UPLOAD_KEY_PASSWORD=${secrets.UPLOAD_KEY_PASSWORD}`,
      '',
    ].join('\n'),
    'utf8',
  );
  log('✓ regenerated keystore.properties from the secrets file');
}

/* ── (c) inject the signing config + the loud guard ───────────────────────── */

function injectLoader(src, slug) {
  if (src.includes('keystorePropertiesFile')) return src;
  const block =
    `// Upload-key wiring for Play. Injected by plugins/withReleaseSigning.js so it\n` +
    `// survives \`expo prebuild\`, which regenerates this gitignored tree.\n` +
    `def keystorePropertiesFile = rootProject.file("keystore.properties")\n` +
    `def keystoreProperties = new Properties()\n` +
    `if (keystorePropertiesFile.exists()) {\n` +
    `    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n` +
    `}\n` +
    `def useUploadKey = keystoreProperties['${MARKER}'] != null &&\n` +
    `    rootProject.file(keystoreProperties['${MARKER}']).exists()\n\n`;
  // Anchor on the `android {` block opening at the start of a line.
  const idx = src.search(/^android \{/m);
  if (idx === -1) {
    throw new Error(`[withReleaseSigning] ${slug}: could not find the \`android {\` block.`);
  }
  return src.slice(0, idx) + block + src.slice(idx);
}

function injectSigningConfig(src, slug) {
  if (/release\s*\{[^}]*useUploadKey/.test(src)) return src;
  const sc = src.indexOf('signingConfigs {');
  if (sc === -1) {
    throw new Error(`[withReleaseSigning] ${slug}: could not find \`signingConfigs {\`.`);
  }
  // Close of the debug { ... } block inside signingConfigs.
  const debugIdx = src.indexOf('debug {', sc);
  if (debugIdx === -1) {
    throw new Error(`[withReleaseSigning] ${slug}: could not find the debug signingConfig.`);
  }
  let depth = 0;
  let i = src.indexOf('{', debugIdx);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const insertAt = i + 1; // just after the debug block's closing brace
  const block =
    `\n        release {\n` +
    `            // Credentials come from android/keystore.properties, regenerated on\n` +
    `            // every prebuild by plugins/withReleaseSigning.js. Left empty when the\n` +
    `            // key is absent; the guard below stops any release task in that case.\n` +
    `            if (useUploadKey) {\n` +
    `                storeFile rootProject.file(keystoreProperties['${MARKER}'])\n` +
    `                storePassword keystoreProperties['UPLOAD_STORE_PASSWORD']\n` +
    `                keyAlias keystoreProperties['UPLOAD_KEY_ALIAS']\n` +
    `                keyPassword keystoreProperties['UPLOAD_KEY_PASSWORD']\n` +
    `            }\n` +
    `        }`;
  return src.slice(0, insertAt) + block + src.slice(insertAt);
}

function injectGuard(src, slug, opts) {
  if (src.includes(GUARD_TEXT)) return src;
  const bt = src.indexOf('buildTypes {');
  if (bt === -1) throw new Error(`[withReleaseSigning] ${slug}: could not find \`buildTypes {\`.`);
  const rel = src.indexOf('release {', bt);
  if (rel === -1) {
    throw new Error(`[withReleaseSigning] ${slug}: could not find the release buildType.`);
  }
  // First signingConfig assignment inside the release buildType.
  const target = /\n(\s*)signingConfig signingConfigs\.(debug|release)/.exec(src.slice(rel));
  if (!target) {
    throw new Error(
      `[withReleaseSigning] ${slug}: could not find the release buildType's signingConfig line.`,
    );
  }
  const at = rel + target.index;
  const indent = target[1];
  const backup = opts.keystoreBackup.replace(/\\/g, '\\\\');
  const replacement =
    `\n${indent}// Fail LOUDLY if the release keystore isn't wired up. A silently\n` +
    `${indent}// debug-signed release AAB is rejected by Play and is the recurring\n` +
    `${indent}// OVC failure mode: prebuild regenerates this gitignored folder and\n` +
    `${indent}// the signing config disappears without the build ever failing.\n` +
    `${indent}if (!useUploadKey &&\n` +
    `${indent}    gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {\n` +
    `${indent}    throw new GradleException(\n` +
    `${indent}        "Upload keystore not wired up — this release build would be DEBUG-signed. " +\n` +
    `${indent}        "Run \`npx expo prebuild -p android\` to let plugins/withReleaseSigning.js restore it " +\n` +
    `${indent}        "(backup: D:\\\\Mobile\\\\.keystores\\\\${backup}).")\n` +
    `${indent}}\n` +
    `${indent}signingConfig useUploadKey ? signingConfigs.release : signingConfigs.debug`;
  return src.slice(0, at) + replacement + src.slice(at + target[0].length);
}

/* ── plugin ───────────────────────────────────────────────────────────────── */

const withReleaseSigning = (config, options) => {
  const opts = options || {};
  for (const key of ['slug', 'keystoreBackup', 'storeFile']) {
    if (!opts[key]) {
      throw new Error(`[withReleaseSigning] missing required option "${key}" in app.json.`);
    }
  }

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const notes = [];
      restoreSigningMaterial(cfg.modRequest.platformProjectRoot, opts, (m) => notes.push(m));
      for (const n of notes) console.log(`[withReleaseSigning] ${n}`);
      return cfg;
    },
  ]);

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withReleaseSigning] expected a Groovy app/build.gradle.');
    }
    let src = cfg.modResults.contents;
    if (WIRED.test(src)) {
      console.log('[withReleaseSigning] · signing config already wired — left as-is');
    } else {
      src = injectLoader(src, opts.slug);
      src = injectSigningConfig(src, opts.slug);
      src = injectGuard(src, opts.slug, opts);
      console.log('[withReleaseSigning] ✓ signing config + release guard injected');
    }

    // Never let a prebuild finish with the protection silently absent — whether
    // this run injected it or found it already there.
    const hasRelease = /signingConfigs\.release/.test(src);
    const hasGuard = /throw new GradleException/.test(src) && /taskNames/.test(src);
    if (!hasRelease || !hasGuard) {
      throw new Error(
        `[withReleaseSigning] ${opts.slug}: the release signing guard is NOT present in ` +
          `android/app/build.gradle (signingConfigs.release=${hasRelease}, guard=${hasGuard}). ` +
          `Do NOT build a release from this tree.`,
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
};

module.exports = withReleaseSigning;
