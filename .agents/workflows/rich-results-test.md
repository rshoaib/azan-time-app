---
description: Validate all structured data (JSON-LD) schemas using Google Rich Results Test and Schema Markup Validator
---

# Rich Results & Schema Validation

Run this workflow to validate that all JSON-LD structured data on your site will render correctly in Google search results.

## How to Use
Say: `/rich-results-test https://your-site.com`

---

## Phase 1: Identify All Schemas

1. Search the codebase for all JSON-LD script tags:
   ```
   grep -r "application/ld+json" src/
   ```
2. List each schema type found (e.g., WebApplication, BlogPosting, FAQPage, HowTo, Organization, BreadcrumbList, Person)
3. **CRITICAL:** Ensure `BreadcrumbList` is present on all nested pages for expanded search footprints.
4. Note which pages/components render each schema

---

## Phase 2: Google Rich Results Test

Test these URLs using the browser:

1. Go to: `https://search.google.com/test/rich-results`
2. Enter the **homepage URL** → click TEST URL
3. Wait for results. Record:
   - Status: Valid / Invalid / Warnings
   - Detected schemas
   - Any errors or warnings
4. Take a screenshot
5. Repeat for:
   - A **blog post** URL (tests BlogPosting + FAQPage schemas)
   - A **tool page** URL (tests WebApplication + HowTo schemas)
   - The **/about** page (tests Organization schema)

---

## Phase 3: Schema Markup Validator (Detailed)

For deeper validation:

1. Go to: `https://validator.schema.org/`
2. Enter the same URLs tested above
3. Record any errors, warnings, or recommended properties
4. Common issues to check:
   - Missing `image` property on BlogPosting
   - Missing `dateModified` on articles
   - Invalid `@type` values
   - Missing required properties per schema spec

---

## Phase 4: Fix Issues

For each error/warning found:
1. Identify the component that renders the schema
2. Fix the JSON-LD output
3. Re-test after deploying

---

## Phase 5: Report

| Page Tested | Schemas Found | Status | Issues |
|-------------|---------------|--------|--------|
| Homepage | WebApplication, Organization | ? | |
| Blog Post | BlogPosting, FAQPage | ? | |
| Tool Page | WebApplication, HowTo | ? | |
| About Page | Organization | ? | |

Include screenshots of each test result.
