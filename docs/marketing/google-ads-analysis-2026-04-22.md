# Google Ads Deep Analysis — Azan Time App Installs

**Account:** 386-147-4447 (segmentbi@gmail.com)
**Campaign:** Azan Time - App Installs (UAC / App campaign, Android only)
**App:** Azan Time: Prayer Time & Qibla — OVC Tech
**Analysis window:** Last 30 days (Mar 23 – Apr 21, 2026)
**Report date:** 2026-04-22
**Analyst:** Claude

---

## Executive summary

The campaign is technically delivering volume — **3,699 installs for $136.68 at $0.04 CPI** — but almost every structural signal says those installs are **near-worthless**. You have zero in-app events being measured, no geo restriction, the weakest possible bid strategy, view-through optimization turned on, and a target CPA that is 5× above the realized CPI (meaning Google is racing to the bottom of the quality pool). Before pouring more budget in, the account needs a **foundation rebuild**, not volume scaling.

### Headline numbers (last 30 days)

| Metric | Value |
|---|---|
| Spend | $136.68 |
| Clicks | 14,900 |
| Impressions | 241,000 |
| Avg. CPC | $0.01 |
| Installs (conversions) | 3,699 |
| Cost / Install | $0.04 |
| View-through conversions | 13 |
| **In-app actions** | **0** |
| Conv. rate (click → install) | 24.73% |
| Target CPA | $0.21 |
| Budget | $15 / day |
| Status | Eligible (Limited) — budget-limited AND policy-limited |
| Optimization score | 81.3% |
| Missed conversions (per Google) | ~2,950 due to budget cap |

---

## The ten red flags

### 1. Zero in-app events tracked — the single biggest issue

Only one conversion action is configured: **"Azan Time: Prayer Time & Qibla (Android) installs"**, a Google Play first-open event created on **April 10, 2026** (12 days ago). There is no event for app open after day 1, no prayer-time notification interaction, no settings change, no retention — nothing. That means the bidding algorithm has no downstream quality signal, so it optimizes for the cheapest possible "first open" it can find, anywhere in the world.

**Why it matters:** UAC without in-app events is like hiring a salesperson and only paying them for the first handshake, with no bonus for closed deals. You get lots of handshakes from the wrong people.

### 2. Cost per install 5× below target CPA

Target CPA is $0.21, actual CPI is $0.04. Healthy UAC campaigns trend **toward** the target from slightly below. A 5× undershoot in a market with any real competition is essentially impossible from legitimate user acquisition — it's the algorithm picking up ultra-cheap, ultra-low-intent clicks from the display/AdMob long tail.

### 3. Click-to-install rate of 24.73%

Industry benchmarks for UAC: 2–10%. A 25% conversion rate from click to install is characteristic of either (a) accidental-click traffic, (b) incentivized-install networks, or (c) fraud/emulator farms. Real humans don't install apps at that rate.

### 4. Global targeting with no exclusions

"Locations: All countries and territories" with zero exclusions. For a prayer-time app with a GMT+03:00 timezone (suggesting a Middle East/MENA focus), advertising in countries where the user won't engage with Islamic content is pure waste. It also opens the door wide to cheap-impression geographies where click/install fraud is common.

### 5. View-through conversion optimization is ON

VT conversion crediting in App campaigns inflates reported installs by attributing installs that happen after a user merely *saw* (not clicked) an ad — often on display/in-app inventory of dubious quality. Combined with no in-app event tracking, this artificially boosts numbers in Google Ads while you can't measure whether those users do anything.

### 6. Bidding set to "Install volume (All users)"

This is the lowest-quality bid strategy available. Your options are:

- Install volume (All users) ← **current** — maximize raw installs, no quality control
- Install volume (Target cost per install) — cap CPI
- **In-app actions (Target CPA)** — optimize for an in-app event you actually care about
- **In-app actions (Return on ad spend)** — for monetized apps

You should be on "In-app actions" as soon as you have an event tracking ~30 conversions/week.

### 7. Policy limitation + identity verification pending

The campaign status is **"Eligible (Limited) — All ad groups limited by policy"** and the account banner says you must **complete advertiser verification by 2026-05-16**. This is almost certainly why ad groups are policy-limited. Failing to verify by the deadline will pause the campaign entirely.

### 8. One ad group named "Starter"

That's the default name Google gives when you create an ad group and never touch it. It signals the campaign was stood up quickly without thoughtful structure. UAC benefits from multiple ad groups with themed asset sets (text angles + image sets + videos) so the algorithm can learn which creative resonates with which audience.

### 9. Budget set at $15/day and limited by budget

Google reports you missed ~2.95K additional conversions in the last week alone because of the budget cap. Under current settings, scaling budget just buys more of the same low-quality installs — but once the quality issues are fixed, this tells you there's real inventory available to scale into.

### 10. Campaign only 12 days old

The campaign (and the conversion action) both started on **April 10, 2026**. UAC campaigns need roughly 14–21 days to exit the learning phase, and you should not make bid-strategy or asset changes during learning. The learning-phase status should be checked — if still learning, defer the structural changes by a week or two and just fix the big leaks (geo, identity verification) first.

---

## Action plan (prioritized)

### This week — unblocks everything else

1. **Complete advertiser verification** at the link in the account banner. Deadline is 2026-05-16; do it now so the policy limitation lifts and you see true performance. *Impact: removes throttling.*

2. **Restrict geo targeting** to the countries that actually have Muslim populations and Arabic/English speakers that match your app. Start tight — e.g., Saudi Arabia, UAE, Egypt, Pakistan, Indonesia, Malaysia, Turkey, plus Muslim diaspora markets like US/UK/Canada/France/Germany if English copy is strong. Exclude everything else. *Impact: stops global long-tail bleed.*

3. **Turn OFF view-through conversion optimization** in campaign settings. Force the algorithm to earn installs through clicks only. *Impact: removes fraud-friendly signal.*

4. **Wire up Firebase SDK** (if not already) and define at minimum two in-app events:
   - `app_open_day_2` (user opens the app the day after install — retention proxy)
   - A product-meaningful event (first prayer-time alert acknowledged, first Qibla use, first settings change, or `session_start` count >= 3)

   Import those events into Google Ads as conversion actions. Without this, nothing else you do will matter.

### Weeks 2–3 — after verification is live and events are flowing

5. **Switch bidding from "Install volume (All users)" to "In-app actions (Target CPA)"** once the new in-app event has ≥30 conversions in the past 7 days. Start with a target CPA 3–5× your current $0.21 (e.g., $0.60–$1.00) because the algorithm needs room to find quality users. You will pay more per install but get vastly more engaged ones. *Impact: quality inflection.*

6. **Raise daily budget** to 10× your target CPA (Google's own recommendation — so $6–$10/day per $1 tCPA, meaning $15–$30 initially is fine, but plan to scale to $50–$100/day once quality stabilizes). Budget caps shouldn't be binding on a real tCPA bid.

7. **Rename the "Starter" ad group** and add a second ad group. Split creatives by angle:
   - Ad group A: "Prayer Time Accuracy" (focus on adhan schedule precision)
   - Ad group B: "Qibla Compass / Direction" (focus on the compass feature)

   Each ad group needs its own asset set — 5+ headlines, 5+ descriptions, 4+ portrait images, 4+ landscape images, 1–2 vertical videos (9:16) and 1–2 horizontal videos (16:9). UAC cannot run well on thin assets.

### Week 4+ — once quality data exists

8. **Review geo/device performance** with 14 days of post-fix data and further tighten targeting. App campaigns do not let you exclude networks, but you CAN exclude specific apps via the "Placement exclusions" list — add known junk placements once you can see them in the placement report.

9. **Create a retention-based conversion action** (e.g., user active on day 7) and test switching bidding to that event once you have volume. This is where real ROI lives.

10. **Set up a non-Google Ads MMP or at minimum Firebase → GA4 funnel** so you can independently verify that installs are real humans with real sessions. If you're seeing 3,699 installs in Google Ads but only a small fraction show up as active users in Firebase/GA4, you have proof of fraud and should escalate to Google via a credit request.

### Ongoing guardrails

- **Don't scale budget until CPI moves toward target CPA.** A healthy sign that quality is improving is your CPI rising to ~50–70% of your target CPA with your new in-app event metric showing downstream activity.
- **Check the Recommendations tab weekly** but apply only the recommendations that align with the plan above. Google will constantly push "+10% budget" — ignore it until quality is fixed.
- **Re-enter learning phase gracefully.** Every major change (bid strategy, target CPA >20%, geo overhaul) resets the learning period. Batch changes together rather than tweaking daily.

---

## What I could NOT see in this session (and why it matters)

- **Firebase / MMP data** — I could not verify whether any of those 3,699 installs produced day-1 retention, sessions, or any in-app event outside Google Ads' own reporting. This is the most important missing signal. If you have Firebase or appsflyer/adjust, pull retention numbers and we'll cross-reference.
- **Asset-level performance** — Didn't open the asset report. Worth a look to see which headlines/videos are getting the most impressions; strong asset ratings correlate with better install quality.
- **Placement report** — UAC's placement report (within Insights and reports) would show the top apps/sites serving your ads. Almost always you'll find 3–5 placements eating 30% of budget with zero engagement — those are prime exclusion candidates.

Happy to do any of those in a follow-up.

---

## TL;DR for a PM / stakeholder

> The campaign looks great on paper (3,699 installs at $0.04 each) but is configured to buy the cheapest possible installs globally with no quality signal. Before scaling budget, the team needs to: (1) complete Google's identity verification, (2) restrict geo to Muslim-majority and diaspora markets, (3) turn off view-through conversions, (4) wire up Firebase in-app events and switch bidding to optimize for those events. Expected outcome: CPI will rise 5–10× but engaged users / $ spent will improve far more than that.
