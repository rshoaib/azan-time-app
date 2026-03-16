---
description: Check site against Google AdSense policies — ad placement, content quality, required pages, and compliance
---

# AdSense Compliance Audit

Run a full audit of the current site against Google AdSense program policies.
Produces a scored report with actionable fixes.

---

## Phase 1: Required Pages & Legal Compliance
<!-- progress: "📋 Phase 1/7: Checking required pages..." -->

1. **Privacy Policy page** — verify it exists, is linked from footer, and mentions:
   - Google AdSense / third-party ad serving
   - Use of cookies and web beacons
   - DoubleClick DART cookie opt-out link
   - Link to Google's ad privacy policy
2. **About page** — verify it exists with **200+ words** of meaningful, unique content:
   - [ ] Describes who runs the site and their mission
   - [ ] NOT generic boilerplate ("We are a team of professionals...")
   - [ ] Has a human, trustworthy tone
3. **Contact page quality** — a bare email address is NOT sufficient. Verify:
   - [ ] Has a **contact form** (name, email, subject, message) OR detailed contact info
   - [ ] Has descriptive text explaining what users can contact about
   - [ ] Has response time expectations (e.g., "within 24–48 hours")
   - [ ] Has a list of common support topics (builds page depth)
4. **Terms of Service** — check if present (recommended but not required)

> **Policy ref:** [AdSense Program Policies — Required Content](https://support.google.com/adsense/answer/48182)
> **Lesson learned:** Google rejected legalpolicygen.com for "Low value content" partly because the contact page was just a single email address with no form or context.

---

## Phase 2: Ad Placement Rules
<!-- progress: "📐 Phase 2/7: Auditing ad placement in code..." -->

5. **Scan all `<AdSlot>` usages** across every page component:
   ```
   grep -rn "AdSlot" src/pages/ src/components/
   ```
6. For each ad placement, check:
   - [ ] Ad is NOT directly adjacent to a `<button>`, `<a>`, or `<input>` (min visual gap required)
   - [ ] Ad is NOT inside a modal, popup, or overlay
   - [ ] Ad is NOT floating or sticky (no fixed-position ads)
   - [ ] Ad is NOT placed where it could be accidentally clicked (e.g., below a "Calculate" button with no spacing)
   - [ ] Ad has a clear "Advertisement" label via `aria-label` or visible text
7. **Count ads per page** — Google recommends no more than 3 ad units per page on content-light pages. Verify:
   - [ ] Calculator pages: max 3 ad slots (leaderboard + sidebar rectangle + mobile banner)
   - [ ] Blog pages: max 3-4 ad slots
   - [ ] Homepage: max 2 ad slots
8. **Ad density check** — ads should NOT outweigh content area. Verify the content-to-ad ratio is reasonable (content should be the primary focus).
9. **Mobile ad placement** — verify:
   - [ ] No 300×250 ad above the fold on mobile (Google policy violation)
   - [ ] Mobile banner (320×50) is used instead
   - [ ] `ad-slot-rectangle` is hidden on mobile via CSS media query

---

## Phase 3: Content Value & Pre-Approval Readiness
<!-- progress: "📝 Phase 3/7: Evaluating content value (CRITICAL for approval)..." -->

> **⚠️ This is the #1 reason for AdSense rejection.** Google reviewers manually check content depth. Tool-heavy sites with minimal text are consistently rejected for "Low value content."

### 3a. Homepage Content Depth
10. **Homepage must have 500+ words** of informational text content — NOT just navigation buttons/links. Verify presence of:
    - [ ] "How It Works" or explainer section (3+ steps with descriptions)
    - [ ] Educational/informational section explaining WHY the tool matters
    - [ ] Trust signals / social proof (stats, user counts, feature highlights)
    - [ ] FAQ section with **5+ real questions and detailed answers**
    - [ ] FAQ JSON-LD structured data (`@type: FAQPage`) for rich results
    - [ ] The tool/action buttons should NOT be the only content on the page

### 3b. Tool / Utility / Calculator Page Depth
11. **Every tool/utility page must have 200+ words** of educational context. Verify each page has:
    - [ ] An intro paragraph explaining what the tool does and why it's useful
    - [ ] Context about the problem it solves (regulations, standards, formulas)
    - [ ] NOT just a form/input with no surrounding text
    - [ ] Unique `<h1>`, `<title>`, and meta description (not duplicated across pages)

### 3c. Blog & Article Depth
12. **Blog posts must have 800+ words** for AdSense-readiness:
    - [ ] Top 10 posts by traffic are 1000+ words each
    - [ ] No posts under 500 words (thin content risk)
    - [ ] Each post has a unique hero image (not stock repeated)
    - [ ] Posts have structured headings (H2/H3 hierarchy)

### 3d. Minimum Site Depth
13. **Site must have 10+ substantial pages** (excluding legal/boilerplate):
    - [ ] Count: homepage + tool pages + blog posts + about ≥ 10
    - [ ] Each page has unique, non-duplicated content
    - [ ] No "coming soon" or empty placeholder pages

### 3e. Original Content & Compliance
14. **Original content** — verify:
    - [ ] Content sections are unique per page (not copy-pasted between tools)
    - [ ] No AI-generated content without human editing/review
    - [ ] No scraped or aggregated content from other sites
15. **No prohibited content** — quick scan for:
    - [ ] No misleading advice presented as fact (tools have disclaimers)
    - [ ] Disclaimer text exists in footer or relevant pages
    - [ ] No "guaranteed" or unrealistic claims
16. **User value test** — verify each main page:
    - [ ] Has working interactive functionality (not just text)
    - [ ] Produces meaningful results (not blank/broken)
    - [ ] Provides genuine value a user would bookmark or share

---

## Phase 4: Technical Compliance
<!-- progress: "⚙️ Phase 4/7: Checking technical compliance..." -->

14. **ads.txt** — verify `public/ads.txt` exists with correct publisher ID:
    ```
    google.com, pub-XXXXXXXXXX, DIRECT, f08c47fec0942fa0
    ```
15. **Ad code implementation** — verify AdSlot component:
    - [ ] Uses standard ad unit sizes (728×90, 300×250, 320×50)
    - [ ] Has proper `aria-label="Advertisement"` for accessibility
    - [ ] Does not programmatically click or refresh ads
    - [ ] Does not modify ad code or behavior
16. **Page load performance** — ads should not block content:
    - [ ] Ad scripts are loaded asynchronously
    - [ ] Core Web Vitals are not degraded by ad placement (CLS < 0.1)
    - [ ] Ad slots have fixed dimensions (no layout shift when ads load)
17. **No navigation interference** — verify:
    - [ ] Ads don't appear during page transitions
    - [ ] No interstitial/popup ads
    - [ ] Back button works normally (no ad-triggered redirects)

---

## Phase 5: Behavioral Compliance
<!-- progress: "🔒 Phase 5/7: Checking behavioral policies..." -->

18. **No incentivized clicks** — verify:
    - [ ] No text like "click our ads" or "support us by clicking"
    - [ ] No arrows or visual cues pointing to ads
    - [ ] No rewards for interacting with ads
19. **No artificial traffic** — verify:
    - [ ] No auto-refresh on pages with ads
    - [ ] No meta refresh tags
    - [ ] No suspicious redirects to ad-heavy pages
20. **Stateless design** — verify:
    - [ ] No login required to use calculators
    - [ ] No user data stored server-side
    - [ ] All calculations run client-side in the browser

---

## Phase 6: Site Approval Readiness Check
<!-- progress: "🎯 Phase 6/7: Pre-approval readiness assessment..." -->

> **Run this phase BEFORE applying or re-applying for AdSense.**

21. **Google reviewer simulation** — visit the live site as a first-time user and answer:
    - [ ] Does the homepage clearly explain what this site does within 5 seconds?
    - [ ] Can you find substantial text content without clicking away from the homepage?
    - [ ] Does scrolling the homepage reveal educational value beyond just buttons/tools?
    - [ ] Is there a clear About page that explains who runs this site?
    - [ ] Is there a functional Contact page (not just a bare email address)?
    - [ ] Are there at least 5 blog posts with real, substantial content?
    - [ ] Does the site feel like a legitimate, trustworthy resource?

22. **Content word count audit** — measure actual text content (excluding code/markup):
    - [ ] Homepage: **500+ words** → Pass / ❌ Fail (____ words)
    - [ ] Each tool page: **200+ words** → Pass / ❌ Fail
    - [ ] Blog posts average: **800+ words** → Pass / ❌ Fail
    - [ ] About page: **200+ words** → Pass / ❌ Fail
    - [ ] Contact page: **100+ words** (form + descriptive text) → Pass / ❌ Fail

---

## Phase 7: Generate Report
<!-- progress: "📊 Phase 7/7: Generating compliance report..." -->

23. **Score the site** on a scale per category:

| Category | Weight | Score (0-10) |
|----------|--------|--------------|
| Required Pages & Legal | 15% | |
| Ad Placement | 20% | |
| **Content Value & Depth** | **30%** | |
| Technical Compliance | 10% | |
| Behavioral Compliance | 10% | |
| **Approval Readiness** | **15%** | |
| **Overall** | 100% | |

24. **Approval decision** based on overall score:
    - **8.0+** → ✅ Safe to apply / re-apply for AdSense
    - **6.0–7.9** → 🟡 Fix warnings first, then apply
    - **Below 6.0** → 🔴 Do NOT apply — fix critical issues first

25. **List all findings** in priority order:
    - 🔴 **Critical** — must fix before applying / to avoid suspension
    - 🟡 **Warning** — should fix soon, risk of policy flag
    - 🟢 **Pass** — compliant
    - 💡 **Recommendation** — not required but improves compliance

26. **Action items** — for each critical/warning finding, provide:
    - What the issue is
    - Which file(s) to change
    - Exact fix (code diff or content change)
    - Which AdSense policy it violates (with link)

---

## Quick Command
```
/adsense-audit
Site: [site-name]  (optional — defaults to current project)
```
