# azantime.app — static marketing site

A zero-build-step, static HTML site for Azan Time. Designed to deploy straight to GitHub Pages, Cloudflare Pages, Netlify, or Vercel without any toolchain.

## Why static HTML (and not Next.js)?

Every hour not spent on a bundler is an hour spent on the app. This site has no package.json, no node_modules, no framework, no lock file. It's readable and debuggable by anyone, and it ranks for the same keywords a JS-heavy site would.

## Deploying to GitHub Pages

1. Push `marketing/website/` to a new repo (or a `gh-pages` branch of the app repo).
2. Settings → Pages → source: `main`, folder: `/` (root of whatever branch you pushed).
3. Point DNS: add an `A` record for `azantime.app` to GitHub's Pages IPs (or a CNAME to `<username>.github.io`).
4. The `CNAME` file in this directory tells GitHub which domain to serve.

That's the whole deploy. First index by Google: 48–72 hours.

## Adding a new city

1. Edit `prayer-times/cities.json` — add `{ "slug": "...", "city": "...", "country": "...", "lat": 0, "lng": 0 }`.
2. Run `cd prayer-times && node build.js`. That renders `<slug>/index.html` from `_template.html`.
3. Add the new city to:
   - `prayer-times/index.html` — the city directory grid.
   - `sitemap.xml` — a new `<url>` block.
   - `index.html` — the home page "Major Cities" grid (optional; keep top 12 only).
4. Commit, push, wait for Google to re-crawl (usually 3–7 days the first time, faster after).

**Cadence goal:** 1–2 cities per week for the first 3 months. 50+ cities in 6 months.

## Files

- `index.html` — landing page
- `style.css` — site-wide styling (single file, no build)
- `404.html` — GitHub Pages serves this on unknown URLs
- `sitemap.xml` — for Google Search Console
- `robots.txt` — allow all crawlers
- `CNAME` — GitHub Pages custom domain marker
- `privacy/index.html` — privacy policy (required by both app stores)
- `blog/index.html` — blog landing (stub; add articles as `.md` or `.html`)
- `prayer-times/index.html` — city directory
- `prayer-times/_template.html` — template for per-city pages
- `prayer-times/cities.json` — list of cities to render
- `prayer-times/build.js` — generator script
- `prayer-times/<slug>/index.html` — rendered per-city pages

## Verification checklist (post-deploy)

1. Open `https://azantime.app/` — page loads, cities link out.
2. Open `https://azantime.app/prayer-times/mecca/` — prayer times appear as numbers within a second (not "Loading...").
3. Open `https://azantime.app/sitemap.xml` — valid XML.
4. Google → "site:azantime.app" in 72 hours to confirm indexing.
5. PageSpeed Insights: target 95+ on mobile performance.
6. Submit sitemap in Google Search Console: https://search.google.com/search-console
7. Request indexing for the homepage and the top 5 city pages.

## SEO notes

- Every per-city page has its own `<title>`, `<meta description>`, and schema.org `WebPage` entity with GeoCoordinates — this is what Google needs to rank local-intent queries.
- Prayer times update client-side from the `adhan` library — the page content "refreshes daily" from Google's perspective because the visible text changes every day.
- The sitemap uses `changefreq=daily` on city pages to nudge re-crawl frequency.
- All internal linking uses trailing slashes (`/prayer-times/mecca/`) to avoid duplicate-content penalties.
