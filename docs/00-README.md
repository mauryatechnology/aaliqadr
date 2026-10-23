# Aaliqadr — Documentation Index

**Aaliqadr** is a luxury D2C perfume house with one signature fragrance for each of the 12 rashi (zodiac signs). Every fragrance has its own colour palette, material language, and motion personality, and the website renders each product page in that sign's theme.

This folder is the complete pre-development specification. Nothing here is code. It exists so that the application can be built **once, correctly**: secure, fast, cheap to run on Vercel, and premium in feel.

| | |
|---|---|
| **Business model** | Retail only (B2C, D2C), India first |
| **Stack** | Next.js 16 (App Router, Cache Components) · React 19.2 · TypeScript (strict) · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Vercel |
| **Payments / Shipping** | Razorpay · Shiprocket |
| **Reference app** | FlexSell Wholesale. Only the retail-relevant **backend patterns** were taken from it, with no UI. See §3 |
| **Doc status** | v1.0, 22 Oct 2026, pre-development |

---

## 1. Reading order

| # | Document | Read it when |
|---|---|---|
| 01 | [Product Requirements (PRD)](01-Product-Requirements.md) | You need to know **what** we are building and what is out of scope |
| 02 | [Brand & Zodiac System](02-Brand-and-Zodiac-System.md) | You need the 12 signs, palettes, fragrance briefs, and theme tokens |
| 03 | [Technical Architecture](03-Technical-Architecture.md) | You need the stack, folder structure, layering, and rendering/caching model |
| 04 | [Database Schema](04-Database-Schema.md) | You are touching any collection, index, or the DB connection |
| 05 | [Backend API Specification](05-Backend-API-Specification.md) | You are writing a route handler or server action |
| 06 | [Auth & Security](06-Auth-and-Security.md) | You are touching login, sessions, input, headers, or secrets |
| 07 | [Checkout, Payments, Orders & Inventory](07-Checkout-Payments-Orders.md) | You are touching money or stock |
| 08 | [Shipping, Returns & Notifications](08-Shipping-Returns-Notifications.md) | You are touching fulfilment, reverse logistics, email/SMS/WhatsApp |
| 09 | [Frontend Design System](09-Frontend-Design-System.md) | You are writing UI, animation, or theming |
| 10 | [Pages, Routing & SEO](10-Pages-Routing-SEO.md) | You are adding a page or touching metadata/structured data |
| 11 | [Admin Panel](11-Admin-Panel.md) | You are building back-office features |
| 12 | [Media & Blob Storage](12-Media-and-Blob-Storage.md) | You are uploading, storing, or serving files/images |
| 13 | [Vercel Deployment & Cost](13-Vercel-Deployment-and-Cost.md) | You are deploying, configuring env vars, or worried about the bill |
| 14 | [Compliance & Legal (India)](14-Compliance-Legal-India.md) | You are writing policies, product listings, invoices, or handling personal data |
| 15 | [Testing, QA & Observability](15-Testing-QA-Observability.md) | You are writing tests or setting up monitoring |
| 16 | [Build Roadmap & Checklists](16-Build-Roadmap.md) | You are planning sprints or doing a go-live review |

---

## 2. Non-negotiable principles

These are repeated across the documents because each one prevents a known, expensive failure.

1. **The server owns money and stock.** The browser never sends a price, discount, tax, or total that the server trusts. Totals are recomputed from the database on every checkout step.
2. **Money is stored as integer paise.** `₹2,499.00` is stored as `249900`. Floats never touch money.
3. **Every payment path is idempotent.** Verify-callback, webhook, and retry can all arrive, in any order, any number of times. The order is paid exactly once.
4. **Catalogue pages are cached, and personal data never is.** Product and sign pages are pre-rendered and tag-revalidated. Cart, account, and checkout are dynamic and `no-store`.
5. **Public images go browser → CDN directly.** A serverless function never streams a public image. (The reference app hit a ~40× egress amplification by doing this. See doc 12.)
6. **One theme engine.** All 12 zodiac themes are CSS-variable token sets on one component library. There are no per-sign component forks.
7. **Lightweight is a feature.** Luxury feel comes from typography, space, light, and motion timing, not from megabytes. Each page has a JS budget (doc 09 §9).
8. **No secret has a fallback value.** A missing env var throws at boot.

---

## 3. What was taken from the FlexSell reference and what was not

| Taken (retail-relevant backend patterns) | Left out (not needed for a retail D2C perfume brand) |
|---|---|
| Atomic stock decrement with conditional `$inc` | B2B / wholesale tiers, MOQ, price tiers |
| Human-readable IDs from an atomic counter (`AQ-10001`) | Dropshipping hub, reseller plans |
| Order line-item **snapshots** (invoice shows what was bought) | Advance balance / wallet ledgers |
| Append-only order `history[]` timeline with actor | POS, tills, day-close, barcode scanning |
| Razorpay server signature verification + webhook | ERP: suppliers, purchase orders, warehouses, stock transfers |
| CSRF double-submit token, Upstash rate limiting | Multi-tenant control plane, subdomains, plans, entitlements |
| `select: false` on sensitive fields (cost price, password hash) | Manager KPI reports, impersonation |
| Single storage writer, public vs private blob classes, `del()` on replace | KYC documents, GST-registered buyer flows, marketplace claims |
| Coupons (percentage/flat, min order, per-customer limit) | Credit notes, e-invoicing (IRN). Not needed below the turnover threshold, see doc 14 |
| Reviews with moderation, one per customer per product | Profitability backfill reports (replaced by a simpler dashboard) |
| Returns with item condition & restock flag | Manager PIN login |
| `sync-indexes` script (`autoIndex: false` in production) | |
| Cron + **lazy** maintenance for cost efficiency | |
| Weight-slab shipping config (simplified) | |

**Lessons carried over from the reference app's own audit:**
- A hard-coded JWT secret fallback was found in production (FS-101). We forbid fallbacks (principle 8).
- Private documents streamed through a function caused 255 MB of storage to produce 10 GB of transfer. We serve private files via a short-lived signed redirect, and public files directly.
- `images.unoptimized` was enabled because `remotePatterns` had a wildcard. We restrict `remotePatterns` to our own Blob host from day one, so optimisation can stay on.
- Seven routes hand-rolled date formatting. All dates go through one `lib/datetime.ts`, and all money through one `lib/money.ts`.

---

## 4. Research sources used

Official or primary sources were preferred. Third-party figures are marked "verify" where they appear in the docs.

- Next.js 16 release notes: https://nextjs.org/blog/next-16
- Vercel Blob pricing & limits: https://vercel.com/docs/vercel-blob/usage-and-pricing
- Vercel Image Optimization pricing: https://vercel.com/docs/image-optimization/limits-and-pricing
- Vercel platform limits: https://vercel.com/docs/limits
- Vercel Fluid compute pricing: https://vercel.com/docs/functions/usage-and-pricing
- Vercel Fluid compute DB pools: https://vercel.com/kb/guide/efficiently-manage-database-connection-pools-with-fluid-compute
- Razorpay webhook validation & idempotency: https://razorpay.com/docs/webhooks/validate-test
- Shiprocket API helpsheet: https://support.shiprocket.in/support/solutions/articles/43000337456
- Google merchant listing structured data: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Consumer Protection (E-Commerce) Rules 2020 summary: https://www.indialaw.in/guides/civil/consumer-protection-e-commerce-rules/
- DPDP Rules 2025 timeline: https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified
- Legal Metrology e-commerce declarations: https://ssrana.in/articles/labelling-on-retail-packages/
- Dangerous goods (perfume) in Indian e-commerce shipping: https://shipping.amazon.in/blog/dangerous-goods-indian-ecommerce-shipping
- Zodiac/element fragrance mapping: https://www.marieclaire.co.uk/beauty/fragrance/fragrance-based-on-star-sign, https://www.astrotheme.com/The_Zodiac_and_Perfumes.php
- Zodiac colours: https://artincontext.org/zodiac-colors/
- Auth library landscape 2026: https://blog.logrocket.com/best-auth-library-nextjs-2026/
- Animation library landscape 2026: https://www.pkgpulse.com/guides/best-react-animation-libraries-2026
