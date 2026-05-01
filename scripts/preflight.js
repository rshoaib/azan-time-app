#!/usr/bin/env node
/**
 * preflight.js — checks for unresolved pre-submission TODOs before a build.
 *
 * Run manually or wire into a CI job / EAS build hook:
 *   node scripts/preflight.js
 *
 * Exits non-zero if any placeholder is found, so it can gate a release build.
 * Intentionally grep-based — simple and self-explanatory.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// [filePath (relative to project root), regex, what to do about it]
const CHECKS = [
    [
        'constants/storeLinks.ts',
        /APP_STORE_ID = '0000000000'/,
        'Replace APP_STORE_ID with the real numeric iOS App Store ID from App Store Connect.',
    ],
    [
        'app.json',
        /ca-app-pub-3166995085202346~0000000000/,
        'Replace the iosAppId placeholder in app.json > plugins > react-native-google-mobile-ads with the real AdMob app ID.',
    ],
    [
        'marketing/website/index.html',
        /id0000000000/,
        'Replace id0000000000 in marketing/website/index.html with the real App Store ID.',
    ],
];

let hits = 0;

for (const [relPath, pattern, remedy] of CHECKS) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) continue;
    const contents = fs.readFileSync(abs, 'utf8');
    if (pattern.test(contents)) {
        console.error(`  ✗ ${relPath}`);
        console.error(`    ${remedy}\n`);
        hits++;
    } else {
        console.log(`  ✓ ${relPath}`);
    }
}

if (hits > 0) {
    console.error(`\n${hits} pre-submission TODO${hits > 1 ? 's' : ''} still open. Fix them before shipping.`);
    process.exit(1);
} else {
    console.log('\n✓ No pre-submission placeholders found. Safe to build.');
}
