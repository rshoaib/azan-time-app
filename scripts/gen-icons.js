// Generates the app icon set (gold mosque + crescent on deep navy) into
// assets/images. Run: node scripts/gen-icons.js  (needs `sharp` in node_modules)
const sharp = require('sharp');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'images');
const f = (n) => Number(n).toFixed(1);

// Onion dome: base center (cx,by), half-width hw, height h, rising to a point.
const dome = (cx, by, hw, h) =>
  `M ${f(cx - hw)},${f(by)} C ${f(cx - hw)},${f(by - h * 0.58)} ${f(cx - hw * 0.42)},${f(by - h)} ${f(cx)},${f(by - h)} ` +
  `C ${f(cx + hw * 0.42)},${f(by - h)} ${f(cx + hw)},${f(by - h * 0.58)} ${f(cx + hw)},${f(by)} Z`;

// Finial (thin neck + ball) rising from (cx, topY).
const finial = (cx, topY, len, ball) =>
  `<rect x="${f(cx - len * 0.11)}" y="${f(topY - len)}" width="${f(len * 0.22)}" height="${f(len)}" rx="${f(len * 0.11)}" fill="url(#gold)"/>` +
  `<circle cx="${f(cx)}" cy="${f(topY - len - ball * 0.5)}" r="${f(ball)}" fill="url(#gold)"/>`;

// Minaret: rounded shaft + small dome cap + finial, centered cx, baseY down, shaftTopY up.
const minaret = (cx, baseY, shaftTopY) => {
  const w = 52;
  return `<rect x="${f(cx - w / 2)}" y="${f(shaftTopY)}" width="${f(w)}" height="${f(baseY - shaftTopY)}" rx="${f(w / 2)}" fill="url(#gold)"/>` +
    `<path d="${dome(cx, shaftTopY + 8, 34, 60)}" fill="url(#gold)"/>` +
    finial(cx, shaftTopY + 8 - 60, 34, 9);
};

// Crescent moon via a circle masked by an offset circle.
const moon = (cx, cy, r, ox, oy) => `
  <mask id="moon">
    <rect width="1024" height="1024" fill="black"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
    <circle cx="${cx + ox}" cy="${cy + oy}" r="${r * 0.84}" fill="black"/>
  </mask>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gold)" mask="url(#moon)"/>`;

const defs = `
  <linearGradient id="gold" x1="0" y1="0" x2="0.2" y2="1">
    <stop offset="0" stop-color="#F7CB55"/><stop offset="1" stop-color="#CF9213"/>
  </linearGradient>
  <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1B2D66"/><stop offset="1" stop-color="#0A1330"/>
  </linearGradient>`;

const mark = `
  ${moon(742, 268, 96, 50, -36)}
  <rect x="232" y="740" width="560" height="66" rx="20" fill="url(#gold)"/>
  ${minaret(298, 740, 476)}
  ${minaret(726, 740, 476)}
  <rect x="396" y="606" width="232" height="138" rx="10" fill="url(#gold)"/>
  <path d="${dome(512, 606, 138, 208)}" fill="url(#gold)"/>
  ${finial(512, 398, 48, 13)}
`;

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}</defs>${inner}</svg>`;

const fullbleed = svg(`<rect width="1024" height="1024" fill="url(#navy)"/>${mark}`);
const adaptive = svg(`<g transform="translate(102,102) scale(0.8)">${mark}</g>`);
const splash = svg(
  `<rect x="152" y="152" width="720" height="720" rx="168" fill="url(#navy)"/>` +
  `<g transform="translate(286,286) scale(0.44)">${mark}</g>`
);

const render = (s, file, size) =>
  sharp(Buffer.from(s)).resize(size, size).png().toFile(path.join(OUT, file));

// Android launcher icons (WebP, per density) — regenerated directly so we don't
// have to re-run `expo prebuild` (which would wipe the signing config).
const ANDROID = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const renderWebp = (s, dir, file, size) =>
  sharp(Buffer.from(s)).resize(size, size).webp({ quality: 95 }).toFile(path.join(ANDROID, dir, file));
const LEGACY = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const FG = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 };

(async () => {
  await render(fullbleed, 'icon.png', 1024);
  await render(adaptive, 'adaptive-icon.png', 1024);
  await render(splash, 'splash-icon.png', 1024);
  await render(fullbleed, 'favicon.png', 196);
  for (const [dir, size] of Object.entries(LEGACY)) {
    await renderWebp(fullbleed, dir, 'ic_launcher.webp', size);
    await renderWebp(fullbleed, dir, 'ic_launcher_round.webp', size);
  }
  for (const [dir, size] of Object.entries(FG)) {
    await renderWebp(adaptive, dir, 'ic_launcher_foreground.webp', size);
  }
  console.log('icons generated OK (assets + android launcher)');
})().catch((e) => { console.error(e); process.exit(1); });
