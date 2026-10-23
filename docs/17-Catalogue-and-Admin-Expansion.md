# 17 — Catalogue & Admin Expansion (FlexSell parity, retail only)

The admin follows FlexSell Wholesale's catalogue model and form flow, with everything B2B, dropshipping, POS, ERP and advance-balance left out. This document records what was built and where it lives.

## 1. Data model

| Collection | Purpose | Notes |
|---|---|---|
| `categories` | Tree (`parentId`), image, sort, visibility, SEO | Every product has one `categoryId`. A category with products or children can't be deleted. |
| `collections` | `manual` (ordered `productIds`) or `smart` (`rules`: all/any of tag, badge, category, sign, element, type, price, stock, name) | Smart rules are evaluated in memory over the cached catalogue (`server/catalog/rules.ts`, pure and tested). |
| `hsncodes` | HSN master: code, description, GST rate | A product's `gstRateBps` is copied from its HSN on save; a rate change updates every product on that code (orders keep their snapshot). |
| `products` (extended) | `categoryId`, `tags`, `badges`, `options` (≤ 2 axes), `descriptionHtml`, `specs`, `aPlus`, `display`, media `id`/`kind`/`posterUrl`; variants gain `optionValues`, `mediaIds`, `barcode`, `dimensionsCm` | One variant per option combination. SKU format `AQ-<code>-<opt>[-<opt>]` (`lib/sku.ts`). |
| `reviews` | One per customer per product; `pending → approved/rejected`; verified when the customer received that product | Product `ratingAvg/ratingCount` count approved reviews only. |
| `returnrequests` | `RT-1000xx` claims: items, reason, evidence, status history | `requested → approved → (received) → refunded / replaced → closed`, or `rejected`. |
| `contents` | Singleton: announcement bar, home banners, FAQs, live policy versions | |
| `policyversions` | Append-only history of every published policy | |
| `staffinvites` | Email → role, applied on that email's first sign-in | |

`npm run db:migrate-catalog` (also run by `db:seed`) creates the seed categories, collections and HSN codes and upgrades existing products. It is idempotent and never overwrites edits.

## 2. Admin

- **Products** — status tabs, search (name/SKU/URL/tag), filters (category incl. sub-categories, collection, low/out of stock), sort, pagination, bulk live/draft/archive/delete, quick live switch, duplicate, CSV export/import with a preview before anything is written.
- **Product editor** — sections in FlexSell's order: Basic info (rich-text description) → Organisation (category, sign, tags, badges, manual collections) → Media (multi upload, drag to reorder, cover, alt text, video with auto poster) → Variants & pricing (option axes, auto-generated matrix, auto SKUs, bulk fill, per-variant images, barcode, dimensions, COD, limits) → Fragrance (notes, intensity, display toggles) → Specifications & A+ blocks → Tax & legal (HSN picker with inline "new HSN") → Search listing. Sticky save bar, unsaved-changes guard, Ctrl/⌘+S.
- **Delete rule** — a product (or variant) that appears in any order is archived/switched off instead of deleted; otherwise it is deleted and its remaining stock written off in the ledger.
- **Categories**, **Collections** (product picker or rule builder with live preview), **HSN codes**.
- **Inventory** — CSV stocktake (`count`) or receipts (`delta`), previewed, applied through the ledger.
- **Returns & claims**, **Reviews**, **Customer detail** (orders, LTV, addresses, claims, reviews).
- **Content** (announcement, banners, FAQs, versioned policies), **Shipping** (any number of weight slabs, COD rules, quote preview), **Settings** (gift wrap, reservation, claim window).
- **Invoices** (register by financial year, CSV), **Reports & GST** (daily sales, by product/category, HSN summary for GSTR-1 table 12, place-of-supply summary, refunds; CSV for each), **Staff & roles** (invites, role matrix), **Activity log**.

## 3. Storefront

- Product page: gallery (scroll-snap swipe, thumbnails, keyboard, full-screen zoom, video), option chips that disable impossible combinations, `?v=SKU` deep links, sticky mobile buy bar, rich description, specifications, A+ blocks, reviews with distribution and verified badges, related products, recently viewed (browser-only).
- `/category/[slug]`, `/collections`, `/collections/[slug]` (prerendered), `/faq`, shop filters by category/element plus sort and in-stock.
- Order pages: "Report a problem" within the claim window, with claim progress.

## 4. Tests

- `tests/catalog.test.ts` — SKUs, option combinations, smart rules, CSV, sanitiser, product input validation.
- `scripts/dev/catalog-check.ts` — catalogue services against the database with a throwaway product.
- `scripts/dev/engagement-e2e.mjs` — browser test of claims, reviews, the product editor and the new pages; safe on a database with real orders.
