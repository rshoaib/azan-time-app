---
description: Add Google Analytics 4 (GA4) to the site for user behavior tracking and traffic analysis
---

# Google Analytics 4 (GA4) Setup

Add GA4 to track visitors, traffic sources, page views, and user behavior.

## How to Use
Say: `/ga4-setup https://your-site.com`

---

## Phase 1: Create GA4 Property

1. Go to: `https://analytics.google.com`
2. Sign in with Google account
3. Click **Admin** (gear icon) → **Create Property**
4. Enter:
   - Property name: `<Site Name>` (e.g., "Online Image Shrinker")
   - Time zone: User's timezone
   - Currency: User's currency
5. Click **Next** → Select industry category and business size
6. Click **Create**

---

## Phase 2: Create Data Stream

1. Select **Web** as the platform
2. Enter the website URL (e.g., `https://onlineimageshrinker.com`)
3. Enter a stream name (e.g., "Production Website")
4. Enable **Enhanced Measurement** (tracks page views, scrolls, outbound clicks, site search, video engagement, file downloads automatically)
5. Click **Create Stream**
6. Copy the **Measurement ID** (starts with `G-XXXXXXXXXX`)

---

## Phase 3: Add GA4 to the Site

### Option A: Via gtag.js (Recommended for SPAs)

Add this script to `index.html` in the `<head>` section:

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Replace `G-XXXXXXXXXX` with the actual Measurement ID.

### Option B: Via React Component (Better for Code Organization)

Create a `GoogleAnalytics.jsx` component:

```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = import.meta.env.VITE_GA4_ID;

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    window.gtag('config', GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
};

export default GoogleAnalytics;
```

Add the gtag script to `index.html` and the component inside your `<BrowserRouter>`.

---

## Phase 4: Configure Key Events

In GA4 Admin:
1. Go to **Events** → **Create Event**
2. Set up these custom events:
   - `tool_used` — when a user selects a tool
   - `file_processed` — when a user processes an image
   - `download_completed` — when a user downloads the result
3. Mark important events as **Key Events** (formerly "Conversions")

---

## Phase 5: AdSense Compliance Check

> [!IMPORTANT]
> If the site uses AdSense, ensure GA4 does NOT:
> - Track personally identifiable information (PII)
> - Set cookies without consent (if GDPR applies)
> - Conflict with AdSense data collection

Consider adding GA4 tracking to the cookie consent flow if one exists.

---

## Phase 6: Verify

// turbo
1. Build and deploy the site
2. Open the live site in a browser
3. Go to GA4 → **Realtime** report
4. Confirm your visit appears in realtime data
5. Take a screenshot of the Realtime report showing active users
6. Check that page_view events are firing on route changes
