#!/usr/bin/env node
/**
 * generate_daily_ayah.js
 *
 * Generates a 1080x1080 SVG + PNG of today's ayah, ready to post to Instagram,
 * X (Twitter), Facebook, or LinkedIn. Also writes a `post.txt` with pre-written
 * caption, hashtags, and store links.
 *
 * Why SVG+PNG and not Canva/Figma automation?
 *   - Zero dependencies (SVG is just a string). No Figma API key, no rate limits.
 *   - Identical output every day → brand consistency without effort.
 *   - The PNG conversion uses Node's built-in `sharp` IF installed; otherwise we
 *     emit the SVG only and tell the user to open it in a browser and "Save as PNG".
 *
 * Usage:
 *   cd marketing/social
 *   node generate_daily_ayah.js            # uses today's ayah
 *   node generate_daily_ayah.js --id 15    # pick a specific ayah by id
 *   node generate_daily_ayah.js --all      # generate all 30 as an archive (once-off)
 *
 * Output:
 *   out/YYYY-MM-DD.svg
 *   out/YYYY-MM-DD.png        (if sharp is installed)
 *   out/YYYY-MM-DD.caption.txt
 *
 * Auto-posting: this script intentionally does NOT post for you. Why?
 *   - X API v2 free tier is 1500 posts/month — plenty, but auth is painful.
 *   - Instagram requires a Business account + Graph API. Manual copy-paste is faster.
 *   - Meta review cycles for auto-post apps take weeks.
 *
 *   Instead: run this once each morning, and use Buffer/Hootsuite free tier
 *   (10 scheduled posts per network) to queue a week at a time. The human is
 *   in the loop for 60 seconds a day. That beats a 2-week OAuth build.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the SAME ayah list the app uses. This is critical — the social
// post must match what a user sees in the app on the same day. We parse
// the TS file with a light regex rather than compiling it, to avoid a
// tsc / ts-node dependency.
// ---------------------------------------------------------------------------

const TS_PATH = path.join(__dirname, '..', '..', 'data', 'dailyAyah.ts');
const ts = fs.readFileSync(TS_PATH, 'utf8');

// Pull each `{ id: N, arabic: '...', translation: '...', reference: '...' }`
// into a structured object. This is an intentionally simple parser — the
// source file is machine-generated-ish, so regex is fine.
const AYAH_RE = /\{\s*id:\s*(\d+),\s*arabic:\s*'([^']+)',\s*translation:\s*'((?:[^'\\]|\\.)*)',\s*reference:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
const AYAHS = [];
let match;
while ((match = AYAH_RE.exec(ts)) !== null) {
    AYAHS.push({
        id: parseInt(match[1], 10),
        arabic: match[2],
        translation: match[3].replace(/\\'/g, "'"),
        reference: match[4].replace(/\\'/g, "'"),
    });
}

if (AYAHS.length === 0) {
    console.error('Failed to parse any ayahs from', TS_PATH);
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Pick the ayah to render — same algorithm as data/dailyAyah.ts#getDailyAyah
// ---------------------------------------------------------------------------

function getTodaysAyah() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return AYAHS[dayOfYear % AYAHS.length];
}

function ayahById(id) {
    return AYAHS.find(a => a.id === id);
}

// ---------------------------------------------------------------------------
// SVG renderer — 1080x1080, matches app brand colors (navy gradient, gold)
// ---------------------------------------------------------------------------

function escapeXml(s) {
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
}

// Wrap long translations onto multiple SVG <tspan> lines.
// Tuned for a ~900px content width with 32px font at 2-line-height.
function wrapText(text, maxCharsPerLine = 58) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
        if ((line + ' ' + w).trim().length > maxCharsPerLine && line) {
            lines.push(line);
            line = w;
        } else {
            line = (line + ' ' + w).trim();
        }
    }
    if (line) lines.push(line);
    return lines;
}

function renderSvg(ayah) {
    const arabicEsc = escapeXml(ayah.arabic);
    const translationLines = wrapText(ayah.translation);
    const refEsc = escapeXml(ayah.reference);

    // Vertical center the whole block. Rough math:
    //   - 90px margin top
    //   - ~120px for arabic
    //   - 40px gap
    //   - N*48px for translation lines
    //   - 40px gap
    //   - 30px reference
    //   - 90px bottom (logo)
    const translationStartY = 420;
    const translationLineHeight = 52;
    const refY = translationStartY + translationLines.length * translationLineHeight + 60;

    const translationTspans = translationLines
        .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : translationLineHeight}">${escapeXml(line)}</tspan>`)
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0F1840"/>
            <stop offset="1" stop-color="#1A2C6B"/>
        </linearGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="12" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>

    <!-- Background -->
    <rect width="1080" height="1080" fill="url(#bg)"/>

    <!-- Faint calligraphy watermark ﷽ -->
    <text x="540" y="720" text-anchor="middle"
          font-family="Amiri, Arial, serif" font-size="520"
          fill="#D4AF37" opacity="0.05">﷽</text>

    <!-- Decorative border -->
    <rect x="40" y="40" width="1000" height="1000" fill="none"
          stroke="#D4AF37" stroke-width="2" rx="24"/>
    <rect x="56" y="56" width="968" height="968" fill="none"
          stroke="#D4AF37" stroke-width="0.5" rx="20"/>

    <!-- Header: Bismillah -->
    <text x="540" y="200" text-anchor="middle"
          font-family="Amiri, Arial, serif" font-size="60"
          fill="#D4AF37">﷽</text>

    <!-- Arabic text -->
    <text x="540" y="340" text-anchor="middle"
          font-family="Amiri, 'Traditional Arabic', Arial, serif"
          font-size="52" fill="#FFFFFF" direction="rtl">${arabicEsc}</text>

    <!-- Translation -->
    <text x="540" y="${translationStartY}" text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="30" fill="rgba(255,255,255,0.92)"
          font-style="italic">${translationTspans}</text>

    <!-- Reference -->
    <text x="540" y="${refY}" text-anchor="middle"
          font-family="Georgia, serif" font-size="24"
          fill="#D4AF37" font-weight="700">— ${refEsc}</text>

    <!-- Bottom: logo and handle -->
    <text x="540" y="980" text-anchor="middle"
          font-family="-apple-system, Arial, sans-serif"
          font-size="22" fill="rgba(255,255,255,0.6)">
        🕌 Azan Time  ·  azantime.app
    </text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Caption / post text templates. Human can copy-paste directly.
// ---------------------------------------------------------------------------

function renderCaption(ayah) {
    return `${ayah.arabic}

${ayah.translation}

— ${ayah.reference}

Free prayer times, adhan, Qibla & duas:
📱 iOS: https://apps.apple.com/app/azan-time/id0000000000
🤖 Android: https://play.google.com/store/apps/details?id=com.azantime.app

#Islam #Muslim #Quran #DailyAyah #Dua #Ramadan #Salah #Prayer`;
}

function renderCaptionShort(ayah) {
    // For X/Twitter — under 280 characters including hashtags
    const stem = `"${ayah.translation}" — ${ayah.reference}`;
    const tags = ' #Islam #Quran #DailyAyah';
    const link = '\n📱 azantime.app';
    return stem + tags + link;
}

// ---------------------------------------------------------------------------
// Optional PNG conversion. Uses `sharp` if installed, otherwise skips.
// Install once: npm install sharp
// ---------------------------------------------------------------------------

async function tryRenderPng(svg, outPath) {
    try {
        const sharp = require('sharp');
        await sharp(Buffer.from(svg)).png().toFile(outPath);
        return true;
    } catch (err) {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function renderOne(ayah, dateStamp) {
    const outDir = path.join(__dirname, 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const base = dateStamp || `ayah-${String(ayah.id).padStart(2, '0')}`;
    const svgPath = path.join(outDir, `${base}.svg`);
    const pngPath = path.join(outDir, `${base}.png`);
    const txtPath = path.join(outDir, `${base}.caption.txt`);
    const txtShortPath = path.join(outDir, `${base}.caption-short.txt`);

    const svg = renderSvg(ayah);
    fs.writeFileSync(svgPath, svg, 'utf8');
    fs.writeFileSync(txtPath, renderCaption(ayah), 'utf8');
    fs.writeFileSync(txtShortPath, renderCaptionShort(ayah), 'utf8');

    const pngOk = await tryRenderPng(svg, pngPath);

    console.log(`  Ayah #${ayah.id} — "${ayah.translation.slice(0, 50)}..."`);
    console.log(`    SVG:          ${svgPath}`);
    if (pngOk) console.log(`    PNG:          ${pngPath}`);
    console.log(`    Caption (IG): ${txtPath}`);
    console.log(`    Caption (X):  ${txtShortPath}`);

    if (!pngOk && dateStamp) {
        console.log(`    (Install 'sharp' with: npm install sharp — to auto-render PNG)`);
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--all')) {
        console.log(`Rendering all ${AYAHS.length} ayahs...\n`);
        for (const a of AYAHS) {
            await renderOne(a);
        }
        return;
    }

    const idArg = args.indexOf('--id');
    if (idArg !== -1 && args[idArg + 1]) {
        const id = parseInt(args[idArg + 1], 10);
        const ayah = ayahById(id);
        if (!ayah) {
            console.error(`No ayah with id=${id}`);
            process.exit(1);
        }
        await renderOne(ayah);
        return;
    }

    // Default: today's ayah
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ayah = getTodaysAyah();
    console.log(`Today's ayah (${today}):`);
    await renderOne(ayah, today);
    console.log(`\n✓ Ready to post. Open the PNG, paste the caption, ship it.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
