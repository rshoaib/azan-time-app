# Daily Ayah social workflow

One script, two minutes a day, zero APIs.

## The workflow

Every morning (ideally after Fajr):

1. `cd marketing/social && node generate_daily_ayah.js`
2. This drops three files into `out/<today's date>.*`:
   - `.svg` — the image, 1080×1080, ready for Instagram / X / Facebook / LinkedIn
   - `.png` — same image as PNG if `sharp` is installed (recommended)
   - `.caption.txt` — long caption for Instagram / Facebook / LinkedIn
   - `.caption-short.txt` — 280-character version for X
3. Upload the PNG to each channel, paste the matching caption.
4. Optionally: batch a week at a time by running `--all` once and scheduling via Buffer (free tier covers 10 scheduled posts per network).

## Why no auto-posting?

The tradeoff is real — here's the math. A full auto-post implementation needs:

- X API v2 OAuth 1.0a (token rotation, write permission, paid tier for media attach on some limits)
- Meta Graph API (Instagram Business account + Facebook Page + App Review)
- OAuth callback URL hosting
- Credential management
- Retry + rate-limit logic

That's roughly 2–3 weeks of work and ~$0–100/month depending on tier. For a single daily post, the human-in-the-loop version — open PNG, copy caption, paste — takes about 90 seconds per channel. Buffer's free tier covers scheduling for a week at a time, which is the real ROI: do 7 posts every Sunday in ~10 minutes.

If posting volume outgrows this (e.g., multiple verticals or a team contributor), upgrade to the [Buffer API](https://buffer.com/developers) which handles all the OAuth for you for $6/month.

## Install sharp (one-time, for PNG output)

```bash
cd marketing/social
npm init -y
npm install sharp
```

Without `sharp`, the script still works — it just emits SVG, which you can open in a browser and "Save as PNG" from the right-click menu. Two extra clicks.

## Branding consistency

The SVG template uses the app's brand colors:
- Navy gradient background: `#0F1840 → #1A2C6B`
- Gold accent + border: `#D4AF37`
- White text on navy (WCAG AA compliant — contrast ratio 14.5:1)
- Bismillah at top, faint ﷽ watermark, gold border, reference in gold

Every post looks the same — which is the point. Consistent visual identity compounds over 30–90 posts.

## Posting cadence

Recommended minimum:
- **Daily** on Instagram (one post) and X (one post)
- **Weekly** on LinkedIn (the Friday ayah, paired with a short reflection)
- **Ad-hoc** on Reddit (don't spam — one post every 60 days per sub, see `03_outreach_templates.md`)

Track weekly: link clicks to `azantime.app` (use `?utm_source=instagram&utm_medium=dailyayah` on the URLs in captions).

## Future ideas (don't build yet — validate demand first)

- Day-of-Ramadan badge overlay
- Reciter voiceover audio generation
- Video reel export (Instagram favors video over static)
- Scheduled posting via Buffer / Hootsuite free tiers

## Archive mode

To generate the full 30-ayah archive once (useful for an initial catalog push):

```bash
node generate_daily_ayah.js --all
```

Pick a specific ayah by ID:

```bash
node generate_daily_ayah.js --id 15
```
