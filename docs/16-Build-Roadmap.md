# 16 — Build Roadmap & Checklists

The estimates assume **one senior full-stack developer plus one designer** (part-time) and content arriving on time. They are scaled roughly linearly for a larger team. Each phase ends in a deployable, tested increment on Preview.

## Phase 0: Foundations (week 1)

- [x] Repo, Next.js 16 + TS strict + Tailwind v4 + ESLint flat config + Prettier
- [x] `next.config.ts`: `cacheComponents`, `reactCompiler`, images config, security headers, cacheLife profiles
- [x] `env.ts` (Zod) with no fallbacks; `.env.example` (placeholders allowed locally, refused in production)
- [x] `server/db/connect.ts`, Product model, `db:sync-indexes` + `db:seed` scripts (`counters` comes with orders in Phase 2)
- [ ] Vercel project (Pro), `bom1`, Atlas `ap-south-1` (Flex for staging), Upstash, two Blob stores, Sentry (`vercel.json` region done; accounts pending, owner)
- [ ] CI: typecheck, lint, unit, build; Preview deploys with protection
- [x] `src/config/zodiac.ts` + generator → `zodiac-tokens.css`; contrast checker (vitest)
- [x] Fonts via `next/font`; base layout; `ZodiacScope`, `.surface` material

**Exit:** Preview shows a themed skeleton page for any sign with no flash, and contrast CI is green.

## Phase 1: Design system & catalogue read path (weeks 2–3)

- [ ] Figma → tokens for brand + 12 signs; motion tokens
- [x] Lenis provider; `AmbientLayer` (12 sign variants, CSS-only); IO-based `Reveal` (Motion dropped from first load, see doc 09 §1)
- [x] Product model; seed with 12 fragrances, Discovery Coffret, 4 Element Trios (Collection/Content models: Phase 4)
- [x] Cached queries with `"use cache"` + tags
- [x] Pages: home, `/zodiac`, `/zodiac/[sign]`, `/perfume/[slug]`, `/shop` (element/type filters), `/search`, `/find-my-sign`, `/cart`, about, contact, policies (`/collections/[slug]`: Phase 4)
- [x] NotesPyramid, ScentProfile, VariantPicker, compatible signs (photo gallery once photography exists)
- [x] Metadata, JSON-LD, themed OG images, sitemap, robots, manifest, icons
- [ ] Lighthouse CI budgets enforced in CI (budgets measured manually: 148–162 KB first-load JS per page)

**Exit:** The full catalogue is browsable, themed, SEO-complete, and within performance budgets.

## Phase 2: Auth, cart & checkout (weeks 4–5)

- [~] Better Auth email OTP (hashed) + Google (when configured) + account shell done; phone OTP (MSG91) pending
- [~] Cart in the browser, priced by the server on every view; server-side cart + merge on login pending
- [x] `pricingService` + `quoteCheckout` (coupons, COD fee, gift wrap, per-line GST, CGST/SGST vs IGST) tested
- [ ] Pincode serviceability (Shiprocket) + Redis cache
- [x] Checkout UI (React 19 `useActionState` + Zod; react-hook-form dropped over a peer-dependency conflict), address book
- [x] `placeOrder` transaction, stock reservation, coupon reservation
- [x] Razorpay integration: create order, Checkout, `verifyPayment`, webhook, `markPaid`
- [~] COD (confirmed at once, paid on delivery); OTP confirmation pending
- [~] Confirmation page + emails (SMTP); SMS pending
- [x] Cron `release-reservations` with rescue logic
- [~] End-to-end script `scripts/dev/e2e.mjs` (31 checks) passes; full concurrency suite pending

**Exit:** Real test-mode purchases end to end; the concurrency and idempotency suite passes.

## Phase 3: Post-purchase & admin core (weeks 6–7)

- [~] Admin shell, roles (owner bootstrap via ADMIN_EMAIL), audit log done; staff 2FA pending
- [x] Admin: products editor (with Blob client uploads, media registry), inventory + batches, orders list/detail
- [ ] Shiprocket (manual courier/AWB entry in admin for now): create shipment, AWB, label (private blob), pickup; webhook → statuses → notifications
- [~] Invoices: gap-free FY numbering + printable GST invoice page; stored PDF pending
- [~] Account: orders, timeline, invoice, cancel done; addresses UI + wishlist pending
- [x] Refunds (admin cancel → Razorpay refund) + webhook handling
- [~] Guest order link (`/order/[id]?k=`); `/track` form pending

**Exit:** An order can be fulfilled entirely from admin; the customer sees live tracking.

## Phase 4: Engagement, content & compliance (week 8)

- [x] Reviews: verified purchase, photos, moderation queue, public replies, aggregate rating
- [x] Damage/leak/wrong-item claims with photo/video evidence, claim window, approve → refund (Razorpay or recorded COD refund) / replacement, emails
- [~] Coupons admin, gift options and packing slip done; automatic offers pending
- [~] CMS: announcement bar, home banners, FAQs (/faq), policies (versioned, append-only history) done; home builder, sign copy and journal pending
- [ ] Newsletter double opt-in; consent ledger; privacy centre (export/delete)
- [ ] Back-in-stock alerts; cron jobs complete
- [ ] Cookie consent + GA4/Meta (consent mode)
- [ ] Legal Metrology fields enforced on publish; grievance page

**Exit:** Feature complete for v1.

## Catalogue & admin expansion (FlexSell parity, B2C only) — done

See docs/17. Categories (tree), collections (manual + smart rules), HSN master, product options (up to two axes) with per-variant images, gallery with zoom/video, A+ content, specifications, rich descriptions, product list with filters/bulk actions/duplicate/delete-or-archive, CSV import/export (products and stock), category and collection pages, shop filters/sort, reviews, claims, customer detail, staff invites and role matrix, shipping page, invoice register, sales & GST reports, activity log.

## Phase 5: Hardening & launch (weeks 9–10)

- [ ] Security checklist (doc 06 §11) fully ticked; ZAP baseline clean
- [ ] Full E2E suite on WebKit + mobile; visual regression for 12 themes
- [ ] k6 load test on staging (200 concurrent checkouts)
- [ ] Atlas M10 production cluster, backups verified with a restore drill
- [ ] Razorpay **live** keys + live webhook; Shiprocket live with DG acceptance confirmed; DLT templates approved
- [ ] Resend domain verified (SPF/DKIM/DMARC); SMS sender live
- [ ] Spend management, uptime monitors, Sentry alerts
- [ ] Google Search Console + Merchant Center feed; sitemaps submitted
- [ ] Content QA: every product's legal declarations match the physical label
- [ ] Policies reviewed by the lawyer; GST setup confirmed by the CA
- [ ] Soft launch (friends & family, real payments, refunds tested) → public launch

## v1.1 (post-launch, weeks 11–14)
Birthday coupons, "It's your season" campaigns, WhatsApp notifications and abandoned-cart flows, discovery-set credit, gift cards, Hindi sign pages, Meta Conversions API.

## v2
Loyalty ("Stardust"), referrals, compatibility duo sets, subscriptions, international shipping, 3D bottle viewer, Atlas Search, multi-region.

---

## Go-live checklist (one page)

**Business:** GST ✔ · cosmetics licence (manufacturer) ✔ · Legal Metrology registration ✔ · trademark filed ✔ · DLT ✔ · grievance officer appointed ✔

**Money:** live Razorpay keys ✔ · webhook secret set and tested ✔ · reconcile cron green ✔ · refund tested with real ₹1 ✔ · invoice series starts at 00001 for the FY ✔

**Shipping:** pickup address ✔ · DG acceptance in writing ✔ · weights/dims on all variants ✔ · webhook token ✔ · packaging leak test ✔

**Tech:** `sync-indexes` run on prod ✔ · env validation green ✔ · Sentry release ✔ · uptime monitors ✔ · spend alerts ✔ · backups and restore drill ✔ · rollback rehearsed ✔

**SEO:** Search Console verified ✔ · sitemap submitted ✔ · Rich Results pass ✔ · Merchant feed approved ✔ · OG previews ✔

**Brand:** 12 themes QA'd on real devices ✔ · copy proofread ✔ · photography for all 12 ✔ · policies live ✔
