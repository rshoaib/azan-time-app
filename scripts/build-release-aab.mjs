#!/usr/bin/env node
// Guarded release-AAB builder for Azan Time.
//
// Ported from mycash/trace (originally silent-mode-app, after a release AAB
// shipped from an uncommitted tree there — missing a fix that was actually in
// the repo — and got rejected by Google). Producing a release artifact must be
// reproducible from a known commit and provably release-signed, so this refuses
// to build unless:
//   1. the git working tree is clean (nothing uncommitted / untracked),
//   2. app.json and android/app/build.gradle agree on version + versionCode,
//   3. HEAD is unchanged across the whole build, and
//   4. the resulting AAB is signed with the release key, NOT the debug key.
//
// On success it writes BUILD_PROVENANCE.json next to the AAB (commit + version +
// signer) so fastlane's preflight_release can re-verify the artifact came from
// this exact commit before uploading. Any failed check aborts non-zero.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AAB = join(ROOT, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const isWin = process.platform === 'win32';

function die(msg) {
    console.error(`\n✗ build-release-aab: ${msg}\n`);
    process.exit(1);
}
function ok(msg) { console.log(`✓ ${msg}`); }

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// 1. Clean working tree — a release must be reproducible from a commit.
function assertCleanTree() {
    const dirty = git(['status', '--porcelain']);
    if (dirty) {
        die('working tree is dirty — commit or stash before building a release AAB.\n'
            + 'Uncommitted changes:\n' + dirty);
    }
    ok('working tree clean');
}

// 2. Version sources agree (guards the "skipped/mismatched versionCode" class of bug).
function assertVersionSync() {
    const appJson = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    const version = appJson.expo?.version;
    const versionCode = appJson.expo?.android?.versionCode;
    const gradle = readFileSync(join(ROOT, 'android', 'app', 'build.gradle'), 'utf8');
    const gCode = Number((gradle.match(/versionCode\s+(\d+)/) || [])[1]);
    const gName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
    if (version !== gName || versionCode !== gCode) {
        die(`version mismatch between app.json and build.gradle — `
            + `app.json=${version}/${versionCode}, build.gradle=${gName}/${gCode}. `
            + `Bump both and commit.`);
    }
    ok(`version ${version} (versionCode ${versionCode}) consistent across app.json + build.gradle`);
    return { version, versionCode };
}

// 4. The AAB must be release-signed. keytool prints an "Owner:" line per signer;
// the Android debug keystore signs as "CN=Android Debug, O=Android, C=US".
function assertReleaseSigned() {
    let out;
    try {
        out = execFileSync('keytool', ['-printcert', '-jarfile', AAB], { encoding: 'utf8' });
    } catch (e) {
        die(`keytool could not read the AAB signature (${e.message}). Is the JDK on PATH?`);
    }
    const owners = [...out.matchAll(/Owner:\s*(.+)/g)].map((m) => m[1].trim());
    if (owners.length === 0) die('AAB appears unsigned (no certificate owner found).');
    const debug = owners.find((o) => /CN=Android Debug/i.test(o));
    if (debug) die(`AAB is DEBUG-signed (${debug}) — release builds must use the upload key.`);
    ok(`release-signed by: ${owners[0]}`);
    return owners[0];
}

function build() {
    // Strip the leading empty PATH entry this machine injects, or gradlew's
    // autolinking fails at settings.gradle when cmd can't resolve `node`.
    const env = { ...process.env };
    const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
    env[pathKey] = (env[pathKey] || '').split(delimiter).filter(Boolean).join(delimiter);
    // Never bake a test/demo data seam into a release binary.
    delete env.EXPO_PUBLIC_E2E;
    delete env.EXPO_PUBLIC_DEMO;

    const gradlew = isWin ? join(ROOT, 'android', 'gradlew.bat') : './gradlew';
    console.log(`\n▶ ${gradlew} bundleRelease\n`);
    const r = spawnSync(gradlew, ['bundleRelease'], {
        cwd: join(ROOT, 'android'),
        env,
        stdio: 'inherit',
        shell: isWin, // resolve the .bat through the shell on Windows
    });
    if (r.status !== 0) die(`gradlew bundleRelease failed (exit ${r.status}).`);
    if (!existsSync(AAB)) die(`build reported success but ${AAB} is missing.`);
    ok('bundleRelease produced app-release.aab');
}

// --- run ---
console.log('Guarded release build\n=====================');
assertCleanTree();
const head = git(['rev-parse', 'HEAD']);
console.log(`  HEAD ${head}`);
const { version, versionCode } = assertVersionSync();

build();

const signer = assertReleaseSigned();

// 3. Nothing snuck a commit/checkout in mid-build.
const headAfter = git(['rev-parse', 'HEAD']);
if (headAfter !== head) die(`HEAD changed during the build (${head} → ${headAfter}). Rebuild from a stable commit.`);
assertCleanTree(); // and no files were written into the tree by the build

const provenance = {
    commit: head,
    version,
    versionCode,
    signer,
    aab: 'android/app/build/outputs/bundle/release/app-release.aab',
    builtBy: 'scripts/build-release-aab.mjs',
};
writeFileSync(join(dirname(AAB), 'BUILD_PROVENANCE.json'), JSON.stringify(provenance, null, 2));
ok('wrote BUILD_PROVENANCE.json');

console.log(`\n✓ Release AAB ready — ${version} (versionCode ${versionCode}), commit ${head.slice(0, 10)}, ${signer}\n`);
