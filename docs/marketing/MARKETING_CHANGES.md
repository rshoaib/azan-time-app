# Marketing fixes — summary of everything shipped

This document is the map of everything added or changed during the zero-budget marketing pass. Read this first if you want to understand what's in the repo, then dive into individual files.

## One-time setup you still need to do

Before anything here ships end-to-end, run:

```bash
npx expo install expo-store-review expo-localization expo-constants
```

- `expo-store-review` — used by `services/reviewPromptService.ts`. Without it, the code silently no-ops (safe, but review prompts never fire).
- `expo-localization` — needed the moment you wire any screen to call `t()` from `i18n/index.ts`. Without it, the i18n module fails to resolve its imports.
- `expo-constants` — used by `settings.tsx` to read the version from `app.json`. Should already be in your dependency tree but confirm.

Then:

- Replace `APP_STORE_ID = '0000000000'` in `constants/storeLinks.ts` with the real App Store ID once you have it.
- Add the domain `azantime.app` (or your chosen domain) and set GitHub Pages `CNAME` — see `marketing/website/README.md`.

## Pillar 1 — ASO (App Store Optimization)

**Goal:** every search for "prayer times", "azan", "qibla", etc. on the App Store and Play Store finds Azan Time in the top 10 results.

- [`marketing/01_store_listing_copy.md`](marketing/01_store_listing_copy.md) — copy-paste ready iOS title (25 chars), subtitle (26 chars), 100-char comma-separated keywords, Play Store title, full 4000-char description, release-notes template, keyword rotation schedule.
- [`marketing/02_screenshot_specs.md`](marketing/02_screenshot_specs.md) — 5-screenshot brief with headlines, required resolutions, Figma tool guidance, A/B testing framework, brand colors.
- [`app.json`](app.json) — added `description`, `primaryColor`, `ios.bundleIdentifier`, `ios.buildNumber`, `NSMotionUsageDescription`, `ITSAppUsesNonExemptEncryption`, `android.versionCode`. These improve store listing quality and are required for a clean App Store Connect submission.

## Pillar 2 — Review velocity

**Goal:** rating-weighted ranking. Stores favor apps that get regular, recent reviews.

- [`services/reviewPromptService.ts`](services/reviewPromptService.ts) — in-app review prompt at delight moments (third Qibla use, 7/30/100-day streak, mid-Ramadan, Eid day). Frequency-capped: 90-day minimum gap, 3 lifetime max, respects user-decline flag. Dynamic import so web builds don't crash.
- [`app/(tabs)/qibla.tsx`](app/(tabs)/qibla.tsx) — wired `recordQiblaUse()` to mount.
- [`app/(tabs)/tracker.tsx`](app/(tabs)/tracker.tsx) — wired `onStreakMilestone()` on new streak highs.
- [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) — wired `onRamadanMidpoint()` on day 15 of Ramadan.
- [`marketing/03_outreach_templates.md`](marketing/03_outreach_templates.md) — reply templates for every star count, including the specific "incorrect prayer times" complaint (common 1-star) and how to recover a 4-star rating from a 2-star reviewer.

## Pillar 3 — Viral loops

**Goal:** every share from the app carries install links.

- [`constants/storeLinks.ts`](constants/storeLinks.ts) — single source of truth for `STORE_LINKS.ios`, `STORE_LINKS.android`, `SHARE_FOOTER`. Replace the `APP_STORE_ID` placeholder once iOS is live.
- [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) — Daily Ayah share appends `SHARE_FOOTER`.
- [`app/(tabs)/tracker.tsx`](app/(tabs)/tracker.tsx) — new `shareStreak()` button with tiered 7/30/100-day messages; "don't break the chain" visualization shows last 14 days once streak ≥ 3.

## Pillar 4 — Distribution

**Goal:** get in front of Muslim audiences for free.

- [`marketing/03_outreach_templates.md`](marketing/03_outreach_templates.md) — creator DMs, masjid admin WhatsApp, imam/scholar email, Subreddit posts, Twitter templates, press outreach. Each template ≤ 120 words (short = replies).
- [`marketing/masjid_flyer.html`](marketing/masjid_flyer.html) — A4 print-ready flyer with live QR codes (generated client-side via CDN). Open in Chrome → Print → Save as PDF. Send to masjid admins.
- [`marketing/social/generate_daily_ayah.js`](marketing/social/generate_daily_ayah.js) — Node script: reads today's ayah from the app's own data file, renders a 1080×1080 SVG (+ PNG if `sharp` is installed), writes caption.txt and caption-short.txt. Human posts it; script does the 90% that's repeatable.
- [`marketing/social/README.md`](marketing/social/README.md) — workflow and cadence guide.

## Pillar 5 — SEO (organic search)

**Goal:** rank for "prayer times \[city]" queries in every major Muslim population center.

- [`marketing/website/`](marketing/website/) — complete static marketing site, zero build step.
  - `index.html` — landing page with schema.org structured data
  - `style.css` — single-file stylesheet, CSS variables for gold/navy/emerald palette
  - `404.html` — branded not-found page
  - `sitemap.xml` — submit to Google Search Console
  - `robots.txt` — allow all crawlers
  - `CNAME` — set for GitHub Pages custom domain
  - `privacy/index.html` — privacy policy (required by both app stores)
  - `blog/index.html` — blog landing (stub with 5 planned articles)
  - `prayer-times/index.html` — city directory, 22 cities
  - `prayer-times/_template.html` — parameterized template using client-side `adhan` library from unpkg (no server, times calculate fresh on every page load)
  - `prayer-times/cities.json` — list of 22 cities with lat/lng
  - `prayer-times/build.js` — regenerates all city pages from template. Run `node build.js` to add new cities.
  - `prayer-times/<slug>/index.html` — 22 pre-rendered city pages (Mecca, Medina, Jakarta, Istanbul, Cairo, Karachi, Dhaka, Dubai, Kuala Lumpur, London, New York, Toronto, Riyadh, Lahore, Doha, Kuwait City, Amman, Casablanca, Lagos, Paris, Berlin, Sydney)
  - `README.md` — full deployment instructions

## Pillar 6 — Localization (ASO multiplier)

**Goal:** every store listing localization roughly doubles qualified installs from that market.

- [`i18n/index.ts`](i18n/index.ts) — lightweight i18n with `detectLocale()`, `setLocale()`, `isRTL()`, `t()`. No i18next, no heavy framework.
- [`i18n/locales/en.ts`](i18n/locales/en.ts) — source-of-truth (52 keys).
- [`i18n/locales/ar.ts`](i18n/locales/ar.ts) — Arabic RTL (typed `: typeof en`).
- [`i18n/locales/id.ts`](i18n/locales/id.ts) — Indonesian.
- [`i18n/locales/ur.ts`](i18n/locales/ur.ts) — Urdu RTL.
- [`i18n/README.md`](i18n/README.md) — usage guide with RTL handling.

Note: the locale files exist and are type-safe, but no screen yet calls `t()`. This is intentional — wiring `t()` across screens is a larger refactor best done in its own pass.

## Pillar 7 — Retention (multi-reciter)

**Goal:** let users pick their preferred adhan reciter, a differentiator that drives 5-star reviews.

- [`constants/reciters.ts`](constants/reciters.ts) — `RECITERS` array + `getReciter(id)` lookup. Default reciter active; 5 more commented out pending MP3 assets.
- [`services/audioService.ts`](services/audioService.ts) — now reads selected reciter from storage.
- [`services/storageService.ts`](services/storageService.ts) — added `AZAN_RECITER` key, `getAzanReciter()`, `setAzanReciter()`.
- [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx) — reciter picker modal (auto-hidden when only one reciter exists).

## Pillar 8 — Version and infra hygiene

- [`package.json`](package.json) — version bumped `1.0.0` → `1.2.0`, added `description`.
- [`app.json`](app.json) — version stays `1.2.0`, `android.versionCode: 3`, `ios.buildNumber: "1"`, added motion-sensor permission string and App Store encryption exemption declaration.
- [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx) — version string now reads from `Constants.expoConfig.version` instead of hardcoded "1.1.0". One place to update, forever.

## Files in one table

| Purpose | Path | New/Edited |
|---|---|---|
| Master plan | `MARKETING_PLAN.md` | New |
| Store copy | `marketing/01_store_listing_copy.md` | New |
| Screenshots brief | `marketing/02_screenshot_specs.md` | New |
| Outreach templates | `marketing/03_outreach_templates.md` | New |
| Masjid flyer | `marketing/masjid_flyer.html` | New |
| Daily ayah generator | `marketing/social/generate_daily_ayah.js` | New |
| Static site | `marketing/website/**` | New |
| i18n | `i18n/**` | New |
| Reciters | `constants/reciters.ts` | New |
| Store links | `constants/storeLinks.ts` | New |
| Review prompt | `services/reviewPromptService.ts` | New |
| Audio service | `services/audioService.ts` | Edited |
| Storage service | `services/storageService.ts` | Edited |
| Home screen | `app/(tabs)/index.tsx` | Edited |
| Tracker screen | `app/(tabs)/tracker.tsx` | Edited |
| Qibla screen | `app/(tabs)/qibla.tsx` | Edited |
| Settings screen | `app/(tabs)/settings.tsx` | Edited |
| App manifest | `app.json` | Edited |
| Package manifest | `package.json` | Edited |

## What was intentionally NOT built

- **Auto-posting to X / Instagram** — API overhead > hand-posting for a single daily post. Use Buffer free tier instead.
- **Screen-by-screen i18n wiring** — scaffolded but not threaded through every screen. Do this once you decide which languages to actually localize in the store.
- **Reciter MP3 files** — only the "default" reciter is active; others are commented out in `reciters.ts` pending royalty-free audio.
- **Analytics / funnel tracking** — you have no paid marketing spend, so nothing to optimize a funnel against yet. Add PostHog (free tier) or Amplitude later.
- **A/B testing infra** — premature. Ship the screenshots, measure conversion in App Store Connect Analytics, iterate.

## 30-day launch sequence

1. **Week 1** — Update store listing copy (ASO copy file), ship new screenshots (2-3 days of design work).
2. **Week 1** — Deploy `marketing/website/` to GitHub Pages. Submit sitemap to Google Search Console.
3. **Week 2** — Run the daily ayah script every morning. Schedule a week at a time via Buffer.
4. **Week 2** — Send 10 creator DMs, 10 masjid WhatsApp messages, 5 imam emails. Track replies in a spreadsheet.
5. **Week 3** — Post one thread on r/islam and one on r/MuslimLounge. Build karma first.
6. **Week 3** — Ship the next version with expo-store-review wired — review prompts start firing at delight moments.
7. **Week 4** — Add 5 more cities to the static site. Review performance in Search Console.
8. **Ongoing** — Reply to every store review within 72 hours. This single habit moves rankings more than any other.

May Allah accept the effort.
