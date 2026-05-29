# Full SEO 10/10 - Implementation Tracker

Last updated: 2026-05-25

This document turns the 90-day Full SEO plan into repo-owned checks plus external tasks that require real assets, account access or outreach. It avoids fake reviews, fake ratings, keyword stuffing and mass thin pages.

## Repo Guardrails Implemented

- Next 16 proxy convention: public routing now uses `src/proxy.ts` instead of deprecated middleware naming.
- Public marketing proxy no longer sets legacy cache-reset cookies on every request; service-worker cleanup remains handled by the tombstone response and client cleanup.
- `npm run seo:audit` crawls sitemap URLs and fails on missing title, meta description, canonical, hreflang, exactly-one H1, non-200 status and missing image `alt` attributes.
- Global JSON-LD is emitted on every page with Organization, TravelAgency, LocalBusiness and WebSite data from the public NAP constants.
- FAQ pages now have stronger localized SEO descriptions and visible FAQPage structured data.
- Levanzo and Marettimo island detail pages now have substantial localized editorial content, visible FAQs and FAQPage/ItemList/TouristDestination JSON-LD instead of thin copy.

## Sprint 1 - Technical And Measurement

Repo done:

- Proxy migration.
- SEO crawler script and package script.
- Removed unnecessary legacy cache cookie on marketing pages.

External/account tasks:

- Connect Google Search Console domain property.
- Confirm GA4 property and conversion events.
- Run PageSpeed Insights for home, top experience, top boat, top island and booking page.
- Confirm Google Business Profile Insights access.

## Sprint 2 - Image And Schema

Repo done:

- Audit script fails on missing `alt` attributes.
- Global Organization/LocalBusiness/WebSite JSON-LD.
- FAQPage schema on FAQ and island pages.

Still needed:

- Audit filenames in `public/images` and rename future assets descriptively before upload.
- Replace placeholder island gallery blocks with real optimized WebP/AVIF photos when assets are available.
- Add VideoObject only when real public videos, posters and transcripts exist.
- Add AggregateRating only when the rating count is verifiable and visible on the page.

## Sprint 3 - Content Parity

Repo done:

- Localized editorial expansions for Favignana, Levanzo and Marettimo fallback pages.
- Localized FAQs for island detail pages.

Still needed:

- Native-speaker review for EN, ES, FR and DE query wording.
- Expand contact page to a richer local directions/NAP block if the business wants more operational detail on-page.
- Continue the Priority 3 page briefs in `docs/seo/priority-3/` for any new editorial clusters.

## Sprint 4 - Local And Authority

Repo references:

- `docs/seo/google-business-profile-checklist.md`
- `docs/seo/google-things-to-do-roadmap.md`

External tasks:

- Complete GBP categories, services, photos, booking link and weekly seasonal posts.
- Upload 10-20 real non-watermarked photos.
- Set up post-tour review requests and structured owner replies.
- Build hotel, B&B, marina, tourism portal and partner citation outreach list.

## Sprint 5 - Commercial And Things To Do

Repo references:

- `docs/seo/google-things-to-do-roadmap.md`

Still needed:

- Confirm product IDs, prices, landing pages and image rights before any feed submission.
- Use experience detail pages as landing pages, not booking step pages.
- Do not publish ratings/prices in feeds unless they match the visible page and booking flow.

## Release Checklist

Before deploy:

- `npm run build`
- `npm run typecheck`
- `npm test`
- `SEO_AUDIT_BASE_URL=https://egadisailing.com npm run seo:audit` after deploy, or point it to staging before deploy.

After deploy:

- Inspect GSC coverage, duplicate canonical, hreflang and Core Web Vitals.
- Run Rich Results Test for home, experiences, boats, islands, FAQ and contacts.
- Check GBP services/photos approval after 72 hours.
