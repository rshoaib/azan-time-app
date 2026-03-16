---
description: Quick reference for when and how often to run each SEO/growth workflow
---

# SEO Schedule — Quick Reference

## 🏗️ Tier 1: One-Time Setup (Run once per new site)

| Workflow | Purpose |
|----------|---------|
| `/gsc-setup` | Add property to Google Search Console & submit sitemap |
| `/bing-setup` | Register with Bing Webmaster Tools & submit sitemap |
| `/ga4-setup` | Add Google Analytics 4 tracking |
| `/full-seo` | Run ALL audits in one shot (after setup is complete) |

---

## 🔄 Tier 2: Weekly (Your Growth Engine)

```
Every Monday:
1. /gsc-audit              → Find CTR gaps, quick wins, content gaps
2. Pick 1-2 fixes          → Rewrite titles, add content sections
3. /deploy                 → Push fixes live

Every other week:
4. /content-pipeline       → Write 1 new article targeting a gap
```

| Workflow | Purpose | Frequency |
|----------|---------|-----------|
| `/gsc-audit` | Search Console data — rankings, CTR, content gaps | **Weekly** |
| `/content-pipeline` | Research + write + publish a blog article | **Bi-weekly** |
| `/deploy` | Push changes to production | **After every fix** |

---

## 🔍 Tier 3: Deep Audits (Monthly / Before Milestones)

| Workflow | Purpose | When to Run |
|----------|---------|-------------|
| `/seo-audit` | 79-checkpoint code audit (meta, schema, technical) | **Monthly** |
| `/adsense-audit` | Check AdSense policy compliance | **Before applying** or after rejection |
| `/rich-results-test` | Validate JSON-LD structured data | **Monthly** or after new schemas |
| `/full-seo` | All audits combined in one run | **Quarterly** |

---

## 🧠 What Each Workflow Actually Does

| Workflow | One-Line Summary |
|----------|-----------------|
| `/gsc-audit` | "What is Google seeing?" — real search data |
| `/seo-audit` | "Is my code correct?" — technical HTML/meta checks |
| `/adsense-audit` | "Will Google approve my ads?" — content depth + policy |
| `/content-pipeline` | "What should I write next?" — research → draft → publish |
| `/full-seo` | "Do everything at once" — combines all audits |
| `/rich-results-test` | "Does my schema work?" — validates JSON-LD |
| `/tool-discovery` | "What should I build next?" — find new tools/features |

---

## 🚫 Common Mistakes

- **Don't run `/full-seo` weekly** — it's overkill. Use `/gsc-audit` instead.
- **Don't skip the "fix" step** — running audits without acting on results is wasted time.
- **Don't write content randomly** — use `/gsc-audit` to find what Google already shows you for, then write to fill those gaps.
