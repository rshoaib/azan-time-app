---
description: Systematically discover, evaluate, and prioritize new tools or utilities to build for the site
---

# Tool Discovery Workflow

<!--
PROGRESS INSTRUCTIONS: When executing this workflow, update the Task View status
at each phase using the format shown in the progress comments below.
Example: "🔍 Phase 2/6: Scanning competitors..."
-->

Find the highest-impact tool to build next. Uses competitor analysis, keyword research, and feasibility scoring.

## How to Use
Say: `/tool-discovery` while in any project folder.

---

## Phase 1: Current Tool Inventory
<!-- progress: "📋 Phase 1/6: Building inventory of existing tools..." -->

1. **List all existing tools** on the site — read the tool registry (e.g., `ToolSelector.jsx`, route definitions, or sitemap)
2. **Count tools by category** — image, video, PDF, text, developer, etc.
3. Output an inventory table:

| Category | Count | Tools |
|----------|-------|-------|
| Image editing | X | compress, resize, crop, ... |
| Video | X | compress, to-gif, to-mp3, ... |
| Developer | X | base64, ... |
| **Total** | **X** | |

> **Goal:** Avoid suggesting tools that already exist.

---

## Phase 2: Competitor Analysis
<!-- progress: "🔍 Phase 2/6: Scanning competitors for tool gaps..." -->

1. **Identify top 3 competitors** for the site:
   - For image tools: iloveimg.com, squoosh.app, tinypng.com, photopea.com
   - For PDF tools: ilovepdf.com, smallpdf.com, pdf2go.com
   - For calculators: calculator.net, omnicalculator.com
   - For legal: termsfeed.com, getterms.io
2. **Browse each competitor** — list every tool they offer
3. **Find the gap** — tools competitors have that you DON'T

| Competitor Tool | Competitor 1 | Competitor 2 | Competitor 3 | You Have It? |
|----------------|-------------|-------------|-------------|-------------|
| [tool name] | ✅ | ✅ | ❌ | ❌ GAP |
| ... | ... | ... | ... | ... |

---

## Phase 3: Keyword Research
<!-- progress: "🔑 Phase 3/6: Researching search volumes for tool candidates..." -->

1. **Gather Hard Data** — use explicit SEO tools to find actual monthly search volumes (MSV):
   - Navigate to Google Keyword Planner (Free) or Ahrefs Free Keyword Generator
   - Search for "[tool type] online free", "[niche] calculator", or "[niche] converter"
   - Document the exact Monthly Search Volume (MSV) and Keyword Difficulty (KD) / Competition.
2. **Check your own GSC** (if available) for queries you get impressions for but have no tool
3. **Search trending tools** — "best free online tools 2026" type queries to spot rising trends

Output a keyword table:

| Tool Idea | Search Query | Est. Volume | Competition | Your Tool? |
|-----------|-------------|-------------|-------------|-----------|
| ... | "... online free" | High/Med/Low | High/Med/Low | ❌ Build |

---

## Phase 4: Feasibility Scoring
<!-- progress: "⚖️ Phase 4/6: Scoring candidates — volume × ease × relevance..." -->

Score each candidate tool on 3 criteria (1-5 each):

| Tool Idea | Search Volume (1-5) | Ease to Build (1-5) | Relevance to Site (1-5) | **Total /15** |
|-----------|-------------------|---------------------|------------------------|--------------|
| ... | ... | ... | ... | ... |

### Scoring Guide:
- **Search Volume:** 1 = niche, 5 = 50K+ monthly searches
- **Ease to Build:** 1 = needs backend/AI, 5 = pure client-side JS in a day
- **Relevance:** 1 = tangential, 5 = core to site's purpose

---

## Phase 5: Recommend Top 3
<!-- progress: "🏆 Phase 5/6: Presenting top 3 tool recommendations..." -->

Present the **top 3 candidates** sorted by total score:

### 🥇 #1: [Tool Name]
- **What it does:** [one-line description]
- **Search volume:** [High/Med/Low]
- **Implementation:** [client-side/needs API/complex]
- **Time estimate:** [hours/days]
- **Why build it:** [unique angle or competitive advantage]

### 🥈 #2: [Tool Name]
- ...

### 🥉 #3: [Tool Name]
- ...

---

## Phase 6: Decision & Next Steps
<!-- progress: "✅ Phase 6/6: Updating context files & preparing handoff..." -->

Ask the user which tool to build. Once decided:

1. **Update `target-keywords.md`** — add the new tool's keywords
2. **Update `internal-links.md`** — add the new tool URL and anchor keywords
3. Hand off to implementation (user builds it or uses a new conversation)
4. After building, run `/content-pipeline` to write an announcement article

---

## Competitor Reference by Site

| Your Site | Competitors to Check |
|-----------|---------------------|
| onlineimageshrinker.com | iloveimg.com, squoosh.app, tinypng.com, photopea.com, remove.bg |
| pdftoolkit | ilovepdf.com, smallpdf.com, pdf2go.com, sejda.com |
| dailysmartcalc.com | calculator.net, omnicalculator.com, calculatorsoup.com |
| mycalcfinance.com | bankrate.com, nerdwallet.com/calculators, calculator.net |
| legalpolicygen.com | termsfeed.com, getterms.io, privacypolicygenerator.info |
| orderviachat.com | gloria.food, square.com/online-ordering, zomato.com |
| imrizwan.com | dev.to, medium.com, hashnode.dev |
