---
description: Systematic bug fix workflow with Claude Opus 4.5
---

# Bug Fix Workflow (Use Claude Opus 4.6)

## Step 1: Reproduce
1. Open the affected page in browser
2. Capture screenshot of the bug
3. Check browser console for errors
4. Check network requests for failed API calls

## Step 2: Diagnose
5. Trace the error from UI → component → server action → database
6. Check recent git changes: `git log --oneline -10`

## Step 3: Fix
7. Make the minimal targeted fix
8. Add error handling and user feedback
// turbo
9. Run production build: `npm run build`

## Step 4: Verify
10. Test the fix in browser
11. Test edge cases (rapid clicks, empty states, error states)
// turbo
12. Push to production: `git add -A && git commit -m "fix: description" && git push origin main`

## Step 5: Confirm
13. Verify fix on production after Vercel deployment
14. Take screenshot as proof