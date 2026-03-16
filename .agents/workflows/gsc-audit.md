---
description: Run a Google Search Console audit — indexing, performance, sitemap, and manual URL inspection
---

# Google Search Console Audit

Run this workflow to analyze a site's GSC data, find growth opportunities, and produce actionable recommendations.

## How to Use

// turbo-all

Say: `/gsc-audit` for current project, or `/gsc-audit all` for all sites.

---

## Option A: Automated CLI (Preferred — Fast & Easy)

The GSC Audit CLI tool at `C:\Projects\gsc-audit-tool` automates Phases 2-5, 8-9 via the Search Console API.

### For the CURRENT project site:
1. Determine the site URL from the current project (e.g., onlineimageshrinker.com)
// turbo
2. Run the audit:
```bash
node C:\Projects\gsc-audit-tool\audit.js --site https://<domain>/
```
// turbo
3. Open the generated report from `C:\Projects\gsc-audit-tool\reports\<domain>_<date>.md`
4. Read the report and apply the fixes (see "How to Act on Results" below)

### For ALL sites at once:
// turbo
1. Run: `node C:\Projects\gsc-audit-tool\audit.js`
2. Reports for every site appear in `C:\Projects\gsc-audit-tool\reports\`
3. Review each report and prioritize fixes across sites

### CLI Options:
```
--site <url>       Audit a specific site
--no-inspect       Skip URL inspection (faster)
--months <n>       Months of data to analyze (default: 3)
--top <n>          Number of top pages to inspect (default: 5)
```

---

## Option B: Manual Browser Audit (Fallback)

Use this only for checks the API cannot do (Core Web Vitals, Security, Manual Actions).

### Phase 6: Core Web Vitals
1. Open GSC > Experience > Core Web Vitals
2. Check mobile and desktop status

### Phase 7: Security & Manual Actions
1. Open GSC > Security & Manual Actions > Security Issues — should say "No issues detected"
2. Open GSC > Security & Manual Actions > Manual Actions — should say "No issues detected"

---

## How to Act on Results

After the report is generated, follow this priority order:

### 🔴 P1: Fix CTR Gaps (Easiest wins)
Pages appearing in search results but getting no clicks.
- **If position < 10**: Rewrite the page's `<title>` and meta description to be more compelling (add numbers, power words)
- **If position > 20**: Improve content depth first — add sections, examples, images

### 🔴 P1: Push Quick Wins to Page 1
Queries at positions 5-20 with decent impressions.
- Add more relevant content to the ranking page
- Add internal links from other pages pointing to it
- Update the title to better match the query

### 🟡 P2: Fill Content Gaps
Queries getting impressions but no dedicated page.
- **High impressions (10+)**: Create a new dedicated page/tool
- **Low impressions (2-9)**: Add a section to an existing page

### 🟡 P2: Fix Cannibalization
Multiple pages ranking for the same query.
- Merge content into the stronger page
- Redirect the weaker page

### 🟢 P3: Refresh Declining Queries
Queries where clicks dropped >30% vs previous period.
- Update content, refresh dates in titles
- Add new sections, improve internal linking

---

## Weekly Routine

```
Every Monday:
1. Run:  node C:\Projects\gsc-audit-tool\audit.js --no-inspect
2. Open reports in VS Code
3. Pick top 1-2 items from CTR Gaps or Quick Wins
4. Fix them in the actual project
5. Deploy
6. Next Monday, run again → check if numbers improved
```
