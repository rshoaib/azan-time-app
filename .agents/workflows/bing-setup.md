---
description: Set up Bing Webmaster Tools for the site (covers Bing, Yahoo, DuckDuckGo)
---

# Bing Webmaster Tools Setup

Set up Bing Webmaster Tools to get your site indexed on Bing, Yahoo, and DuckDuckGo (all powered by Bing's index).

## How to Use
Say: `/bing-setup https://your-site.com`

---

## Phase 1: Create Account & Add Site

1. Go to: `https://www.bing.com/webmasters`
2. Sign in with Microsoft account (or create one)
3. Click **Add a Site**
4. Enter the site URL (e.g., `https://onlineimageshrinker.com`)
5. Choose verification method:
   - **Option A (Fastest):** Import from Google Search Console — if GSC is already set up, this auto-verifies
   - **Option B:** Add a meta tag to `index.html`
   - **Option C:** Add a CNAME record to DNS

---

## Phase 2: Verify Domain

### If using Import from GSC:
1. Click "Import from Google Search Console"
2. Sign in with the same Google account
3. Select the property to import
4. Done — Bing will auto-import your GSC data

### If using Meta Tag:
1. Copy the meta tag Bing provides (looks like `<meta name="msvalidate.01" content="XXXXX" />`)
2. Add it to `index.html` in the `<head>` section
3. Build and deploy
4. Return to Bing Webmaster Tools and click Verify

---

## Phase 3: Submit Sitemap

1. Go to **Sitemaps** in the left sidebar
2. Click **Submit Sitemap**
3. Enter: `https://<domain>/sitemap.xml`
4. Click Submit
5. Verify status shows "Success"

---

## Phase 4: Configure Settings

1. **Crawl Control** — Set to default (Bing auto-optimizes)
2. **URL Submission** — Submit your top 10 pages for immediate crawling
3. **SEO Reports** — Enable automated SEO reports

---

## Phase 5: Verify

1. Take a screenshot of the dashboard
2. Confirm sitemap is submitted
3. Check for any crawl errors
4. Report the number of pages submitted vs indexed
