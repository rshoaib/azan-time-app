---
description: Comprehensive content pipeline for all sites using Google Ultra subscription
---

# Content Pipeline Workflow

<!-- 
PROGRESS INSTRUCTIONS: When executing this workflow, update the Task View status 
at each phase using the format shown in the progress comments below.
Example: "✍️ Phase 3/7: Writing article draft..."
-->

## 🎯 Model Selection Matrix

| Task Type | Model | Why |
|-----------|-------|-----|
| UI/UX design, CSS, layouts | **Gemini 3.1 Pro** | Visual-first reasoning |
| SEO keywords, meta tags, schema | **Gemini 3.1 Pro** | Web search + content |
| Blog posts, marketing copy | **Gemini 3.1 Pro** | Content generation |
| Image generation, assets | **Gemini 3.1 Pro** | Image capabilities |
| Web research, market analysis | **Gemini 3.1 Pro** | Live web access |
| Bug fixing, debugging | **Claude Opus 4.5** | Deep code tracing |
| Complex logic, algorithms | **Claude Opus 4.5** | Reasoning strength |
| Multi-file refactoring | **Claude Opus 4.5** | Large context |
| Database schema, queries | **Claude Opus 4.5** | Precision |
| Security audits, RLS | **Claude Opus 4.5** | Critical analysis |
| Unit/integration tests | **Claude Opus 4.5** | Edge case coverage |

---

## 📋 Sites Portfolio

| # | Site | Stack | Purpose | Revenue Model |
|---|------|-------|---------|---------------|
| 1 | **orderviachat.com** | Next.js + Supabase | WhatsApp ordering SaaS | SaaS subscriptions |
| 2 | **dailysmartcalc.com** | Static/Next.js | Calculator tools | AdSense |
| 3 | **onlineimageshrinker.com** | Static/Next.js | Image compression | AdSense |
| 4 | **legalpolicygen.com** | Static/Next.js | Legal policy generator | AdSense |
| 5 | **mycalcfinance.com** | Static/Next.js | Finance calculators | AdSense |
| 6 | **imrizwan.com** | Next.js | Developer blog | Portfolio | AdSense |
| 7 | **azanapp** | React Native (Expo) | Prayer times app | Free/Ads |

---

## 📁 Context Files (READ FIRST!)

Before writing ANY content, read the context files for the target site:

| File | Purpose | Location |
|------|---------|----------|
| **Brand Voice** | Tone, writing rules, formatting standards | `.agents/context/brand-voice.md` |
| **Internal Links** | All tool URLs + cross-linking rules | `.agents/context/internal-links.md` |
| **Target Keywords** | Keyword clusters, priorities, content calendar | `.agents/context/target-keywords.md` |
| **Site Context** | Combined brand/links/keywords (non-OIS sites) | `.agents/context/site-context.md` |

> **Rule:** Always read the context files before writing. Use target keywords to identify the best topic.

---

## 📅 Publishing Limits (HARD RULES)

| Rule | Limit | Applies To |
|------|-------|------------|
| 🚫 **Max per DAY** | **1 article** | Every site |
| 🚫 **Max per WEEK** | **3 articles** | Every site |

> **Week = Monday through Sunday.** These limits are HARD — no exceptions. Consistency beats volume. If a site hits its limit, suggest publishing on another site instead.

---

## 🔄 Content Pipeline Phases (8 Phases)

### Phase 0: Publishing Frequency Check
<!-- progress: "📊 Phase 0/8: Checking publishing frequency..." -->
// turbo
1. **Identify the site's blog data source** — scan the data file (e.g., `data/blog.ts`, `src/data/articles.js`) or query the database (Supabase `blog_posts` table) to get all articles with their `published_at` / `date` fields.
2. **Calculate stats** using today's date and the current Mon–Sun week:
   - 📦 Total articles ever published
   - 📅 Last published date
   - ✍️ Published today (count)
   - 📆 Published this week (count + list titles)
   - 🎯 Slots remaining today (1 − published today)
   - 🎯 Slots remaining this week (3 − published this week)
3. **Display the dashboard** — present results in this engaging format:

   ```
   ╔══════════════════════════════════════════════════════╗
   ║  📊 Content Dashboard — mycalcfinance.com           ║
   ╠══════════════════════════════════════════════════════╣
   ║  📦 Total Articles       │ 25                       ║
   ║  📅 Last Published       │ Mar 8 — Credit Card...   ║
   ╠──────────────────────────┼──────────────────────────╣
   ║  ✍️ Published Today       │ 1 of 1 ⬛               ║
   ║  📆 Published This Week  │ 2 of 3 ⬛⬛⬜            ║
   ╠──────────────────────────┼──────────────────────────╣
   ║  🟢 Today Slots Left     │ 0                        ║
   ║  🟢 Week Slots Left      │ 1                        ║
   ╠══════════════════════════════════════════════════════╣
   ║  This week's articles:                              ║
   ║  • Mar 6 — CD Calculator Guide (2026)               ║
   ║  • Mar 8 — Credit Card Payoff Guide (2026)          ║
   ╚══════════════════════════════════════════════════════╝
   ```

4. **Go / No-Go decision:**
   - ✅ **GO** — published today = 0 AND published this week < 3
   - ⚠️ **CAUTION** — published today ≥ 1 → "Already published today — try another site"
   - 🛑 **STOP** — published this week ≥ 3 → "Weekly limit reached — switch site"
5. If **STOP** or **CAUTION**, suggest which site to publish on next by checking the other sites' stats.

### Phase 1: Research & Plan (Gemini 3.1 Pro)
<!-- progress: "🔍 Phase 1/8: Researching keywords & reading context files..." -->
// turbo
1. **Read context files** — target keywords for content calendar, brand voice for tone
2. Research trending keywords for the target site (web search)
3. Cross-check target keywords for content gaps and priorities
4. Identify the highest-impact topic (search volume × relevance × ease)
5. Validate AdSense compliance for ad placement

### Phase 2: Competitor Scan (Gemini 3.1 Pro)
<!-- progress: "📊 Phase 2/8: Scanning top 3 competitors for [keyword]..." -->
6. **Search Google for the target keyword** and read the top 3 ranking articles
7. Note what each competitor covers — headings, depth, examples, media
8. Identify **gaps they missed** — angles, tools, data, or sections you can add
9. Identify **unique value** your article can offer (e.g., link to your free tool, include comparison tables they lack)
10. Document your content angle: "Cover everything they cover + add [X unique thing]"

> **Goal:** Never publish a weaker article than what already ranks. Your article must be equal or better in depth AND offer something unique (usually your tool).

### Phase 3: Content Creation (Gemini 3.1 Pro)
<!-- progress: "✍️ Phase 3/8: Writing article — [title]..." -->
11. **Read brand voice** — apply tone, sentence length, and formatting rules
12. Generate blog post draft with SEO-optimized headings
13. **Read internal links map** — add 3-6 internal links using natural anchor text
14. Create meta descriptions (under 155 chars) and Open Graph tags
15. Write structured data (`Article`/`BlogPosting` schema AND `FAQPage` schema)
16. Create a short, keyword-dense **URL slug** (remove stop words like 'and', 'the', 'what')
17. End the article with a clear CTA linking to the most relevant tool
18. **Generate a hero image** using the `generate_image` tool — a custom illustration that matches the article topic. Save to the site's `/public/images/blog/` directory. Ensure the image reference includes a descriptive, SEO-optimized `alt` tag.

### Phase 4: Quality Check (before code)
<!-- progress: "✅ Phase 4/8: Running quality checks (readability, links, SEO)..." -->
18. **Readability check** — verify:
    - Average sentence length < 25 words
    - No paragraph longer than 4 lines
    - Uses subheadings every 200-300 words
    - Tables for all comparisons
    - Bold on key takeaways
19. **Internal link audit** — verify:
    - At least 3 tool links per article
    - At least 1 cross-link to another blog post (if relevant)
    - No broken URLs (check against internal links map)
    - Descriptive anchor text (never "click here")
20. **SEO checklist**:
    - [ ] Title tag includes primary keyword + year AND is under 60 characters
    - [ ] H1 matches title tag
    - [ ] Meta description < 155 chars with keyword + "free"
    - [ ] FAQ section with 3-5 questions and JSON-LD
    - [ ] CTA at end linking to relevant tool
    - [ ] Article length 800-2000 words
    - [ ] Hero image generated and referenced with descriptive `alt` text
    - [ ] URL slug is short and keyword-dense

### Phase 5: Code Implementation (Claude Opus 4.5)
<!-- progress: "💻 Phase 5/8: Adding article to codebase..." -->
21. Add article to site's data file or database (e.g., `articles.js` or Supabase `blog_posts` table)
22. **⚠️ CRITICAL — Supabase Insert Scripts**: Always use the **service_role key** (NOT the anon key) in seed/insert scripts. The anon key is blocked by RLS on INSERT (returns `401 / 42501`). Look for `"role":"service_role"` in the base64 JWT payload from existing working scripts.
23. Reference the hero image in the article metadata (if supported)
24. Verify icon is imported in BlogList component
25. Add programmatic SEO pages if applicable

### Phase 6: Build & Deployment (Claude Opus 4.5)
<!-- progress: "🚀 Phase 6/8: Building & deploying to production..." -->
// turbo-all
26. `npm run build` — Verify production build
27. `git add -A` — Stage all changes
28. `git commit -m "content: descriptive message"` — Commit
29. `git push origin master` — Push to production

### Phase 7: Verify & Index (Gemini 3.1 Pro)
<!-- progress: "🎯 Phase 7/8: Verifying on production & requesting indexing..." -->
30. Open the article URL in browser and verify rendering
31. Verify hero image loads correctly
32. Submit new URL to Google Search Console
33. Request indexing for the new page
34. **Update target keywords** — mark topic as ✅ published

---

## 🚀 Quick Commands

### New Blog Post
```
/content-pipeline
Site: [site-name]
Type: blog-post
Topic: [topic]
Keywords: [keyword1, keyword2]
```

### New Feature
```
/content-pipeline
Site: [site-name]
Type: feature
Description: [what to build]
```

### SEO Audit
```
/content-pipeline
Site: [site-name]
Type: seo-audit
Focus: [keywords/technical/speed]
```

### Bug Fix
```
/content-pipeline
Site: [site-name]
Type: bug-fix
Issue: [describe the bug]
```

### Content Refresh
```
/content-pipeline
Site: [site-name]
Type: content-refresh
Target URL: [path/to/old/post]
Focus: [Add FAQ / Update Data / Improve CTR]
```

---

## ⚡ Turbo Deployment Checklist
// turbo-all
1. `npm run build` — Verify production build
2. `git add -A` — Stage all changes
3. `git commit -m "descriptive message"` — Commit
4. `git push origin master` — Push to production

---

## 📊 AdSense Rules (All Sites)
- Standard ad units: 728x90 (leaderboard) or 300x250 (medium rectangle)
- Ads must NOT be too close to buttons or interactive elements
- No hidden or obscured ad units
- Stateless (no-login, no-database) for zero hosting costs
- Always verify Policy Center after changes
