# Google Ads Fixes — Completed Log

**Date:** 2026-04-22
**Campaign:** Azan Time - App Installs (ID 23747765200)
**Account:** 386-147-4447 (segmentbi@gmail.com)

## What was fixed in-account today

### 1. Geo targeting tightened (was: All countries → now: 17 countries)

Locations restricted to:
Algeria, Bahrain, Bangladesh, Egypt, Indonesia, Iraq, Jordan, Kuwait, Malaysia, Morocco, Oman, Pakistan, Qatar, Saudi Arabia, Tunisia, Turkey, United Arab Emirates.

Impact: stops global long-tail bleed; all impressions now land in Muslim-majority or large Muslim-diaspora-free markets that match the app's purpose.

### 2. View-through conversion optimization turned OFF (was: On → now: Off)

Google Ads will no longer count an install as attributed to the campaign if the user merely *saw* an ad without clicking. Only click-through installs now count.

Impact: removes a common fraud-friendly attribution path. Reported install numbers may drop, but the drop represents VT-only installs that likely weren't really driven by your ads.

### 3. "Starter" ad group renamed to "Prayer Time - Core"

Cosmetic but useful: signals intentional structure and sets up a naming convention for future themed ad groups (e.g., "Qibla Compass", "Adhan Notifications").

---

## What YOU still need to do

These two items are blockers that I can't do from the ad console — you need to handle them yourself.

### A. Complete advertiser identity verification (DEADLINE: 2026-05-22)

**Already done in-console (by me, today):**
1. "Answer a few questions about your organization" — done.
   - Legal name for ad disclosure: Another organization's legal name (so your real legal name "Rizwan Shoaib" gets captured when you upload your documents — Google's auto-filled "Rizwan Segmentbi" would have been wrong).
   - Country: Qatar.
   - Advertises own or others' products: Own products/services.
   - Industry: People & Society.
2. "Confirm if you plan to run EU political ads" — answered No.
3. "Answer a question about who pays for your client's ads" — answered "Rizwan Segmentbi pays for Rizwan Segmentbi's ads" (your own account pays for your own ads).

**What's still left for you to do (I cannot upload ID documents):**
1. Go to Billing → Advertiser verification (or click "Get started" in the top banner).
2. Click "Start task" on **Submit your agency's documents** and upload:
   - Your government ID (Qatar Residence Card or Pakistan passport) showing your legal name "Rizwan Shoaib".
   - Any business registration docs you have (optional if you're operating as an individual).
3. Click "Start task" on **Submit client documents** and upload the same documents — since you're a solo developer, you're both the "agency" (account manager) and the "client" (advertiser). The real legal name "Rizwan Shoaib" gets captured here and will then replace "Rizwan Segmentbi" in the ad disclosure.
4. Submit and wait for Google's review (1-10 business days per Google's own estimate).

**Why I can't do this:** uploading personal ID documents is off-limits for me. If this isn't done by May 22, the campaign will be paused entirely.

**Note on the "agency/client" framing:** Google's verification flow uses agency/client terminology even for solo developers. When you selected "Another organization's legal name" in the questionnaire, Google routed you into the agency flow, which asks for two document submissions. For a solo developer, just upload the same personal ID in both steps — the real legal name you enter on those docs is what replaces the placeholder "Rizwan Segmentbi" that's currently shown on your ad disclosure.

### B. Wire up Firebase SDK + define in-app events (DEV WORK)

This is app-side engineering work, not an ads console change. Without this, the bid algorithm has no quality signal and will keep buying the cheapest possible installs regardless of other fixes.

Minimum to implement in the Android app:
1. Add/verify the Firebase Analytics SDK is integrated.
2. Log at minimum these two custom events:
   - `app_open_day_2` — fire once when a user opens the app on the day after their install (retention proxy).
   - A product-meaningful event such as `first_adhan_notification_ack`, `first_qibla_use`, `settings_configured`, or a rollup like `session_count_3plus`.
3. In Firebase console: mark both events as conversions.
4. Link Firebase project to this Google Ads account (Tools → Measurement → Conversions → Google Analytics 4 (Firebase)).
5. Import the two events into Google Ads as conversion actions.

**Why this order matters:** once the in-app event has accrued ~30 conversions in 7 days, you switch the bid strategy to "In-app actions (Target CPA)" with a starting tCPA of $0.60–$1.00. That's when CPI should rise (healthy sign) and engaged-user rate should rise much more.

---

## Still-pending changes after verification + Firebase are done

Hold off on these until the two blockers above are resolved:

1. Switch bidding from "Install volume (All users)" to "In-app actions (Target CPA)".
2. Raise daily budget from $15 → $50–$100/day once quality stabilizes.
3. Add a second ad group (e.g., "Qibla Compass / Direction") with its own themed asset set.
4. Review the placement report in Insights and reports → exclude junk apps/sites.

---

## Current campaign state snapshot

| Setting | Value |
|---|---|
| Locations | 17 countries (MENA + Muslim-majority Asia) |
| Languages | English and Arabic |
| View-through conv. optimization | Turned off |
| Bidding | Install volume (All users) — UNCHANGED, waiting on events |
| Budget | $15/day — UNCHANGED, waiting on quality inflection |
| Ad groups | 1 ("Prayer Time - Core") |
| Conversion actions | 1 (app install — Play Store first open) |
| Policy status | Eligible (Limited) — still pending identity verification |
| Optimization score | 81.3% (will rise once above is addressed) |
| Verification questionnaire | Completed 2026-04-22 |
| EU political ads confirmation | Completed 2026-04-22 (No) |
| "Who pays" disclosure | Completed 2026-04-22 |
| Pending: Submit agency documents | You must upload ID |
| Pending: Submit client documents | You must upload ID |
| New verification deadline | 2026-05-22 (extended by 6 days) |
