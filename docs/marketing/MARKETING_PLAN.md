# Azan Time — Zero-Budget Marketing Plan

**Prepared:** April 22, 2026
**Current state:** Live on stores, 1K–50K downloads, v1.2.0
**Budget:** $0 / purely organic
**Primary goal (next 90 days):** App Store ranking & visibility
**Target market:** Global (Muslim users worldwide)

---

## The Strategic Reality

You're in one of the most saturated app categories in the world. Muslim Pro sits on 100M+ downloads. Athan Pro, My Prayer, Muslim Assistant all have 7-figure install bases and years of reviews. **You cannot out-brand them. You must out-niche them.**

The good news: you already have a differentiated feature mix — **Prayer Tracker + Islamic Radio + Digital Tasbih + Daily Ayah sharing** under one roof, with a clean modern UI. Most competitors are bloated and ad-heavy. That's your wedge.

The three levers that will move the needle with $0:
1. **ASO (App Store Optimization)** — this is 100% free and compounds. It is your #1 priority.
2. **Review velocity** — reviews are the single biggest ranking factor after keywords.
3. **Community-led distribution** — Muslims are deeply networked. One imam sharing your app in a WhatsApp group > $500 of ads.

Everything below serves those three.

---

## Priority 1: ASO Overhaul (Week 1–2)

This is the highest-leverage work you can do. Most indie apps leave 60%+ of organic installs on the table because of weak store listings. Do this first, before anything else.

### 1a. Keyword research — free tools

Use these to find high-volume, low-competition keywords:
- **AppTweak free trial** (7 days, grab everything you can in that window)
- **Sensor Tower free account** — 3 keyword checks/day
- **AppFollow free tier** — competitor keyword snapshots
- **Google Keyword Planner** — validate search demand on web too
- **App Store / Play Store autocomplete** — type "prayer", "azan", "qibla", "muslim", "ramadan" and screenshot every suggestion. Do this from 5 different devices / geos if possible.

Target keyword buckets (aim for 3–5 per bucket):
- Primary intent: `prayer times`, `azan`, `adhan`, `salah times`, `namaz times`
- Feature: `qibla compass`, `tasbih counter`, `dua`, `dhikr counter`, `hijri calendar`
- Seasonal: `ramadan 2026`, `iftar time`, `suhoor time`, `taraweeh`, `laylatul qadr`
- Long-tail: `accurate prayer times`, `prayer reminder app`, `muslim daily app`

The long-tail and seasonal keywords are where indie apps win. Competitors can't rank for everything.

### 1b. App title + subtitle

Current: "Azan Time" — too generic, wastes the title field.

**Recommended iOS title (30 char max):**
`Azan Time: Prayer & Qibla` (25 chars)

**Recommended iOS subtitle (30 char max):**
`Salah, Adhan, Dua & Tasbih` (26 chars)

**Recommended Play Store title (30 char max):**
`Azan Time – Prayer Times & Qibla` (32 — trim to 30)
Try: `Azan Time: Prayer Times Qibla` (29 chars)

**Play Store short description (80 char max):**
`Accurate prayer times, azan alerts, qibla compass, duas & tasbih counter.` (73 chars)

### 1c. App description — rewrite completely

Play Store reads the full description for indexing. iOS uses the first 3 lines in search. Your first 252 characters matter most.

Structure:
```
🕌 Accurate prayer times for every city — with authentic azan, qibla
compass, duas, digital tasbih and daily Quran verses. Clean,
ad-light, and built for the modern Muslim.

⭐ FEATURES
• Prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) — 8 calculation
  methods including Muslim World League, ISNA, Umm al-Qura, Karachi
• Azan notifications with real adhan audio
• Qibla compass (works offline)
• Morning & evening adhkar with audio
• Digital tasbih counter with vibration
• Hijri calendar & Ramadan tools (Suhoor, Iftar countdown)
• Daily ayah — share beautiful verses with family & friends
• Islamic radio — Quran recitation, nasheeds
• Prayer tracker — build your salah streak

🌍 WORKS WORLDWIDE — automatic location, 8 madhab/calculation
methods, Hijri date everywhere.

[Keyword section — cram naturally]
Perfect for your daily salah, namaz times, adhan reminder, azaan
alarm, fajr alarm, iftar time, suhoor time, ramadan tracker,
tarawih prayer, taraweeh tracker, laylatul qadr, qibla finder,
mecca direction, tasbih counter, dhikr counter, istighfar, durood,
morning azkar, evening azkar, sunnah duas, hisnul muslim.
```

Write the full long description with ~2,000 characters, keyword-dense but human. Repeat core keywords (`prayer times`, `azan`, `qibla`) 4–6 times naturally.

### 1d. Screenshots — the biggest conversion lever

App Store research consistently shows the first 2–3 screenshots drive 80% of install decisions. Most prayer apps have ugly, cluttered screenshots.

Design rules:
- **Screenshot 1:** Big value prop headline + hero screen. Example headline: "Never miss a prayer." Show the hero card with next-prayer countdown.
- **Screenshot 2:** Feature differentiator — Qibla compass. Headline: "Find the Qibla anywhere."
- **Screenshot 3:** Emotional feature — Daily ayah / tracker. Headline: "Build your salah streak."
- **Screenshot 4:** Ramadan tools. Headline: "Ramadan, simplified."
- **Screenshot 5:** Tasbih + duas. Headline: "1000+ authentic duas."

Use Figma (free) with a template like Previewed or AppMockUp (both have free tiers). Text on screenshots must be **big and readable at thumbnail size** — this is where every indie app fails.

Localize screenshots for top 5 markets (see 1e below). Translated screenshots alone can lift conversion 15–25%.

### 1e. Localization — free ranking multiplier

Every localization = a new search index. For $0, you get localization via careful use of human-reviewed AI translation + community volunteers.

**Priority languages (order):**
1. Arabic (ar) — massive market, most competitors have poor Arabic
2. Indonesian (id) — largest Muslim population on Earth
3. Urdu (ur) — Pakistan + diaspora
4. Turkish (tr) — strong paying market
5. Malay (ms) — Malaysia
6. French (fr) — Morocco, Algeria, Tunisia, diaspora
7. Bengali (bn) — Bangladesh
8. Hindi (hi) — India's 200M Muslims

**Free tactic:** post on r/islam, r/muslim, and on Muslim Twitter/X asking for native speakers to volunteer for a free Pro-like credit (even if you don't have Pro tier, credit them by name in the app). You'll get 20+ volunteers in a week.

### 1f. App icon A/B test

Play Console supports free icon experiments. Test:
- Current icon
- Variant with a mosque silhouette + crescent
- Variant with a minimalist Arabic calligraphy mark

Even a 5% lift in icon CTR compounds massively with search impressions.

---

## Priority 2: Review Velocity (Ongoing)

Reviews are the #2 ranking factor after keywords. 4.5+ stars with recent momentum beats 4.8 stars that are stale.

### 2a. In-app review prompt — build it now

Apple's `SKStoreReviewController` and Google's in-app review API are both free. Trigger the prompt at a **moment of delight**, not on launch:
- After user completes their 7th prayer in the tracker
- After the user uses Qibla compass 3+ times
- On Eid day (you already have Hijri calendar — use it)
- After a successful Ramadan streak milestone

Never prompt on first launch. Never prompt if app errored. Never prompt more than once per 90 days per user.

Expected lift: **3–5x review velocity** from where you are now.

### 2b. Reply to every review

Every single one. Thanked-for-5-star reviews get shared on social. Angry reviewers who get a real response often update to 4–5 stars. Google and Apple both factor response rate into rankings.

Template for negative review:
> JazakAllah khair for the feedback. This is exactly what we need to improve. [Specific response to their issue]. If you email me at [email], I'll personally make sure this is fixed — and I'll let you know when the next update ships.

Template for positive review:
> Alhamdulillah. Thank you for using Azan Time — and for taking the time to review. May Allah reward you. If there's anything you'd love to see added, we're listening.

### 2c. Review-velocity playbook

Post on Twitter/X, Reddit, and Muslim forums twice a year (Ramadan + Hajj): "If the app has helped your salah, please leave a review — it helps us reach more people insha'Allah." This is fair-play; don't ask for 5 stars specifically.

---

## Priority 3: Community-Led Distribution (Month 1–3)

Muslims trust their community recommendations more than ads. You need ambassadors, not impressions.

### 3a. Reddit — where it actually works

Active, relevant subreddits (as of 2026):
- r/islam (~300k members)
- r/MuslimLounge
- r/Quran
- r/progressive_islam
- r/muslimtech
- r/exmuslim — do NOT post here (different audience, will backfire)
- Country-specific: r/pakistan, r/bangladesh, r/indonesia, r/saudiarabia, r/morocco

**Rules for posting:**
- Don't post and dash. Comment on other threads first. Earn karma before self-promoting.
- Lead with a question or observation, not the app. Example: "I built a prayer app to track my streak because I kept missing Fajr — does anyone else struggle with this?"
- Honestly mention it's your app. Moderators ban hidden promotion instantly.
- Post once per sub, every 60–90 days max.

### 3b. WhatsApp & Telegram — the real distribution layer in Muslim markets

In South Asia, MENA, and Indonesia, Muslim community WhatsApp groups are the killer distribution channel. You cannot spam them. You can:
- Reach out to **masjid admins** who run WhatsApp announcement groups. Offer the app free, ask if they'd share it.
- Find Islamic Telegram channels (search "Islamic reminders", "Daily Hadith"): ask to sponsor a post with a freebie or just a genuine pitch. Many will share for free if the app is clean and ad-respectful.
- Create a **"Share today's ayah" deep link** in your Daily Ayah share feature — which you already have. Make sure the share text includes an App Store + Play Store link. Every share is a free install impression.

### 3c. Imams, scholars, and content creators

Cold-email 50 mid-tier (10k–500k follower) Muslim creators across:
- Instagram (reminders, Arabic calligraphy, Quran recitation)
- TikTok (Muslim lifestyle, revert stories, Ramadan content)
- YouTube (khutbah clips, Quran tafsir, daily reminders)

The pitch (keep it short):
> Assalamu alaikum [Name], I built Azan Time — a simple prayer app with [differentiator]. No paid ask, just hoping you'd try it. If it helps your ibadah, I'd be honored if you mentioned it. Here's a free [credit / shoutout in-app / custom feature]. Either way, JazakAllah khair for your content.

Response rate: ~5–10%. Of those, maybe 20% post about it. That's 1–3 creator shoutouts per 50 emails. At ~50k followers each, that's **30,000+ qualified impressions for free**.

### 3d. Masjid flyers (yes, offline)

Free printable PDF: single-page, QR code to both App Store and Play Store. Ask 5 masjids in your city / country if they'll pin it on the noticeboard or add the QR to Friday khutbah screens. No CAC, infinite ROI.

---

## Priority 4: Content Engine (Month 1–3)

You have infinite free content angles baked into the app itself. Use them.

### 4a. Daily ayah Twitter/X + Instagram account

You already pull a daily ayah. Auto-generate a beautiful image of it and post every day at Fajr time (scheduled). Use:
- Canva (free) — template once, swap text daily
- Buffer free tier — 10 scheduled posts per channel
- A simple Node script posting via X API free tier

After 6 months: 1 post/day × 180 posts = a discoverable account with real follower growth. Put app link in bio.

### 4b. Short-form video — the cheapest growth channel in 2026

TikTok and Instagram Reels still hand out organic reach to niche faith content. Post 2x/week:
- 30-second "Did you know?" Islamic facts (Ramadan, Qibla direction, duas)
- Screen recordings of the app's nicest features (Qibla compass spinning, tasbih counter, Ramadan countdown)
- User testimonials (DM your best reviewers and ask for a 15-sec clip)

You don't need to show your face. Text-over-video + Quran recitation audio works and avoids ego/fitna concerns that deter some Muslim creators.

### 4c. SEO blog (for Play Store indexing + Google)

Google Play indexes your website if you have one. Spin up a simple site (GitHub Pages, free) at `azantime.app` or `.com`:
- Article: "Prayer times in [big city]" — one per top 50 Muslim-population cities. Pulls your own data. Auto-generated + lightly edited. These rank.
- Article: "What is the Qibla and how to find it"
- Article: "Ramadan 2026 dates — Suhoor and Iftar times by city"

This alone can drive 5K–50K monthly visits within 6 months if done consistently. Embed app install CTAs.

---

## Priority 5: Retention → Ranking Flywheel

App Store and Play Store heavily factor retention into rankings. Ship features that create habits.

**Low-effort, high-retention additions (ordered by ROI):**

1. **Prayer streak gamification** — you have a tracker already. Add streak fire icons, weekly goals, and a "don't break the chain" visual. Habit apps see 40%+ D30 retention lift from streaks.
2. **Widget** — iOS and Android home-screen widget showing next prayer + countdown. Widgets re-engage users every time they unlock their phone. Huge retention signal to stores.
3. **Apple Watch / Wear OS complication** — even a minimal version. Tiny dev cost, massive differentiator in reviews.
4. **Share cards that drive virality** — when someone completes a Ramadan day in the tracker, offer a beautiful share card with their streak. Built-in viral loop.
5. **Azan customization** — let users pick from 5 different reciters for the adhan. Classic retention lever; users love personalization.

Every one of these increases your D7 and D30 numbers, which both stores reward with higher rankings.

---

## 90-Day Execution Calendar

### Weeks 1–2: Foundation (the "non-negotiables")
- [ ] Rewrite App Store + Play Store title, subtitle, description with keyword research
- [ ] Design new screenshots (5 per platform) with big headlines
- [ ] Launch in-app review prompt at delight moments
- [ ] Reply to every past review (yes, all of them)
- [ ] Set up @AzanTimeApp on X, Instagram, TikTok (lock handles before someone else does)

### Weeks 3–4: Localization + content seeds
- [ ] Post on r/islam, r/muslim asking for volunteer translators
- [ ] Localize store listing to Arabic, Indonesian, Urdu (priority 3)
- [ ] Publish 5 daily ayah posts on IG/X to seed the account
- [ ] Record first 4 TikTok/Reel videos (screen-record app features)
- [ ] Set up free GitHub Pages site with 5 city prayer time pages

### Weeks 5–8: Outreach wave
- [ ] Cold-email 50 mid-tier Muslim creators
- [ ] DM 30 masjid admins in top cities; send PDF flyer with QR code
- [ ] Post (once) in 4 country-specific subreddits with genuine story
- [ ] Submit to Product Hunt as "a prayer app that respects your attention"
- [ ] Add 10 more cities to SEO blog

### Weeks 9–12: Double-down + Ramadan prep
- [ ] Ship prayer streak gamification + home widget (biggest retention wins)
- [ ] Ship 3 more localizations (Turkish, Malay, French)
- [ ] Run Play Store icon A/B test
- [ ] Build Ramadan landing page; start pre-seeding ranking for "Ramadan 2027" terms
- [ ] Review what worked: which channel drove most installs? Double down for next quarter.

---

## Metrics to Track (Weekly)

You can't improve what you don't measure. Free tools:
- **Play Console / App Store Connect** — built-in, all the install/keyword data you need
- **Apple Search Ads free account** — gives keyword popularity scores even without spending
- **Firebase free tier** — retention, DAU/MAU, crash-free rate

**Track weekly:**
- Store impressions, product page views, install conversion %
- Keyword rankings for your top 20 keywords
- Review volume + average rating (last 30 days)
- D1 / D7 / D30 retention
- Daily active users

**North-star metric for next 90 days:** Number of keywords where you rank Top 50 in any country. Start = probably <20. Target after 90 days = 150+.

---

## What NOT to Do (common indie-app time-wasters)

- **Don't buy paid ads yet.** With $0 budget and weak retention mechanics, you'll just subsidize churn. Fix ASO + retention first. In 6 months, if you want to spend, $1 of Apple Search Ads on your own branded keywords is still the best first paid spend.
- **Don't build a subscription tier right now.** Your app runs on AdMob. Free + ads is the right monetization for your current download range. Launch Pro only after 100K+ users.
- **Don't chase Facebook/Meta organic.** Algorithm has crushed organic reach. Save the energy for TikTok/Reels/Shorts.
- **Don't redesign the app.** Design is good. Ship features and ASO instead.
- **Don't ignore Ramadan.** Pre-Ramadan (1 month prior) is when 70% of annual prayer-app installs happen. In 2027, Ramadan starts ~Feb 17. By December 2026, you should have everything polished for that surge.

---

## The One Thing to Do First

If you only do one thing this week: **rewrite your store listing** (title, subtitle, description, screenshots) using the keyword strategy above. This alone, on an app with 1K–50K installs, typically lifts organic installs 2–4x within 30 days. Everything else compounds on top of that foundation.

Bismillah — and may Allah make it easy.
