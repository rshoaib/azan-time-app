---
description: Quick deployment workflow for pushing changes to production
---

# Deploy to Production

// turbo-all
1. Run production build: `npm run build`
2. Stage changes: `git add -A`
3. Check what's staged: `git status`
4. Commit with descriptive message: `git commit -m "your message"`
5. Push to main: `git push origin main`
6. Verify on Vercel: Check https://vercel.com/easyserves-projects-743857d4 for successful deployment
