---
description: Run the COMPLETE SEO suite — audit, GSC analysis, rich results test, Bing setup, and GA4 setup — all in one command
---

# Full SEO Suite

<!--
PROGRESS INSTRUCTIONS: When executing this workflow, update the Task View status
at each sprint using the format shown in the progress comments below.
Example: "🔍 Sprint 1/5: Running 79-checkpoint SEO audit..."
-->

One command to run **everything**: site inventory, 79-checkpoint code audit, Google Search Console analysis, Rich Results validation, Bing Webmaster setup, and GA4 setup.

*Note: You must have already run `@[/gsc-setup]` on Day 1 to create the property and submit the initial sitemap before running this audit suite.*

## How to Use
Say: `/full-seo https://your-site.com`

---

## Sprint 0: Site Inventory & Context
<!-- progress: "📋 Sprint 0/5: Building site inventory & reading context files..." -->
Before auditing anything, get a full picture of the site:
1. **Read the sitemap** — fetch `https://your-site.com/sitemap.xml` and count total URLs
2. **Categorize pages** — group by type (tool pages, blog posts, landing pages, static pages)
3. **Read context files** — `.agents/context/` for brand voice, internal links map, and target keywords
4. **Check robots.txt** — verify no important pages are blocked
5. **Note the tech stack** — framework (Vite/Next.js), hosting (Vercel), analytics (GA4/none)

**Output:** Site inventory table:
| Page Type | Count | Example URL |
|-----------|-------|-------------|
| Tool pages | X | /tool/compress |
| Blog posts | X | /blog/how-to... |
| Landing pages | X | /compress-jpeg |
| Static pages | X | /about, /contact |
| **Total** | **X** | |

---

## Sprint 1: SEO Audit (79 Checkpoints)
<!-- progress: "🔍 Sprint 1/5: Running 79-checkpoint SEO audit across 12 categories..." -->
Run the full `/seo-audit` workflow. See [seo-audit.md](./seo-audit.md) for the complete 79-checkpoint list across 12 categories:
- On-Page SEO, Technical SEO, Structured Data (JSON-LD)
- GEO, AEO, E-E-A-T
- International SEO, Social/OG Tags
- Content Quality, Performance, Security, AdSense

**Output:** Scorecard table with /10 rating per category + fixes applied.

---

## Sprint 2: Google Search Console Audit
<!-- progress: "📊 Sprint 2/5: Deep GSC analysis — performance, indexing, quick wins..." -->
Run the full `/gsc-audit` workflow. See [gsc-audit.md](./gsc-audit.md):
- Performance metrics (clicks, impressions, CTR, position)
- Top queries and top pages
- Indexing status (indexed vs not indexed)
- Sitemap submission/resubmission
- Manual URL inspection for top pages
- Core Web Vitals (real user data)
- Security & Manual Actions check
- **Deep Analysis:** Quick wins, CTR optimization, content gaps, cannibalization, declining queries
- **Actionable Report:** Prioritized recommendations with impact estimates

**Output:** GSC report with metrics table, screenshots, and prioritized action items.

---

## Sprint 3: Rich Results Validation
<!-- progress: "✅ Sprint 3/5: Validating structured data & JSON-LD schemas..." -->
Run the full `/rich-results-test` workflow. See [rich-results-test.md](./rich-results-test.md):
- Identify all JSON-LD schemas in codebase
- Test homepage, blog post, tool page, about page via Google Rich Results Test
- Validate via Schema Markup Validator
- Fix any errors/warnings

**Output:** Schema validation table with pass/fail per page type.

---

## Sprint 4: Bing Webmaster Tools Setup
<!-- progress: "🔗 Sprint 4/5: Setting up Bing Webmaster Tools & submitting sitemap..." -->
Run the full `/bing-setup` workflow. See [bing-setup.md](./bing-setup.md):
- Create Bing Webmaster account (or import from GSC)
- Verify domain
- Submit sitemap
- Configure crawl settings

**Output:** Bing dashboard screenshot + confirmation.

---

## Sprint 5: Google Analytics 4 Setup
<!-- progress: "📈 Sprint 5/5: Setting up GA4 tracking & verifying events..." -->
Run the full `/ga4-setup` workflow. See [ga4-setup.md](./ga4-setup.md):
- Create GA4 property + data stream
- Add gtag.js or React component
- Configure custom events (tool_used, file_processed, download)
- AdSense compliance check
- Verify realtime tracking

**Output:** GA4 realtime screenshot + confirmation.

---

## Final Deliverable
<!-- progress: "📝 Complete! Generating Master SEO Report..." -->

After all 6 sprints, produce a **Master SEO Report**:

| Sprint | Name | Status | Key Metric |
|--------|------|--------|------------|
| 0 | Site Inventory | ✅/⚠️ | Total pages, page types |
| 1 | SEO Audit | ✅/⚠️ | Overall score /10 |
| 2 | GSC Audit | ✅/⚠️ | Indexed pages, impressions |
| 3 | Rich Results | ✅/⚠️ | Schemas validated |
| 4 | Bing Setup | ✅/⚠️ | Sitemap submitted |
| 5 | GA4 Setup | ✅/⚠️ | Tracking confirmed |

Plus a prioritized list of remaining action items.
