# 11 — Admin Panel (Back Office)

Route group `/admin`, dynamic, `noindex`, neutral theme (no zodiac atmosphere), desktop-first but usable on a tablet and phone for order handling on the go.

## 1. Access

- Roles: `staff`, `admin`, `owner` (doc 06 §3). Mandatory 2FA (passkey or TOTP).
- Every page is a Server Component that calls `requireRole()` before any query.
- Every mutation writes to `audit_logs` (actor, action, entity, before/after diff for key fields).

## 2. Permission matrix

| Module | staff | admin | owner |
|---|---|---|---|
| Dashboard | view (no revenue) | view | view |
| Orders: view, pack, notes | ✔ | ✔ | ✔ |
| Orders: cancel | — | ✔ | ✔ |
| Shipments: create/label/pickup | ✔ | ✔ | ✔ |
| Refunds | — | ≤ ₹10,000 (step-up) | any (step-up) |
| Returns: receive/QC | ✔ | ✔ | ✔ |
| Returns: approve/reject | — | ✔ | ✔ |
| Products & variants | view | ✔ | ✔ |
| Inventory receive/adjust | receive | ✔ | ✔ |
| Coupons | — | ✔ | ✔ |
| Reviews moderation | ✔ | ✔ | ✔ |
| Content: edit drafts | ✔ | ✔ | ✔ |
| Content: publish | — | ✔ | ✔ |
| Customers: view (masked PII for staff) | ✔ | ✔ | ✔ |
| Customers: block / COD block | — | ✔ | ✔ |
| Exports with PII | — | — | ✔ |
| Settings, staff, data erasure | — | — | ✔ |
| Audit log | — | view | view |

## 3. Modules

### 3.1 Dashboard
- KPIs for a range (today / 7 d / 30 d / custom): revenue (paid), orders, AOV, conversion (from analytics), refunds, RTO %, COD share.
- Charts: revenue by day, **sales by sign** (12-colour donut using sign primaries), top variants, payment method split.
- Action queues: to pack, to ship, NDR (failed delivery), return requests, pending reviews, low stock.
- Implementation: aggregation pipelines on `orders`, cached 5 min (`"use cache"` with `cacheLife({ revalidate: 300 })`, tag `dashboard`), run on the secondary when available.

### 3.2 Orders
- List with filters: status, payment method/status, date range, sign, search (order ID, email, phone, AWB). Cursor pagination.
- Detail: items with snapshot, pricing breakdown, payment timeline (all `payments` rows), shipment and scan history, customer, gift message, internal notes, full history (customer-visible flag shown).
- Actions: mark processing, create shipment (shows courier options with rate and ETA from Shiprocket), print packing slip and label (bulk, A4/4×6), cancel (with auto-refund toggle), refund (partial), resend notification, add note.
- Bulk: select N "confirmed" orders → create shipments → print labels → schedule pickup.

### 3.3 Products
- Editor with tabs: **Basics** (name, slug, type, sign → auto element, concentration, tagline), **Story & description** (Tiptap), **Notes & profile** (top/heart/base pickers from the notes library, intensity/longevity/sillage), **Variants** (SKU, ml, MRP, price, weight, dims, COD, max per order), **Media** (drag-drop upload with Blob client upload, reorder, alt text required, role tag), **Legal** (manufacturer, country of origin, generic name, HSN, GST rate), **SEO** (title/description with live SERP preview and character counters, OG preview **rendered in the sign theme**), **Theme override** (limited editions).
- Live preview: opens `/perfume/[slug]?preview=token` using Next.js Draft Mode for unpublished changes.
- Validation: cannot publish without ≥ 3 images with alt text, a price ≤ MRP, legal fields, and weight.
- On save: `updateTag("product:"+slug)`, `updateTag("products")`.

### 3.4 Inventory
- Table per SKU: stock, reserved, low threshold, last movement, batches (mfg/expiry).
- Receive stock (batch no, mfg date, expiry, qty), adjust (reason required), write-off.
- Movement ledger view per SKU (append-only).
- Alerts: low stock digest daily; expiry within 6 months highlighted.

### 3.5 Customers
- Search by name/email/phone; profile, sign, orders, lifetime value, returns, RTO count, consents history.
- Actions: block, COD block, send a login link, view addresses. **PII masked for staff** (`a***@gmail.com`).

### 3.6 Coupons & offers
- Create/edit with a live "who qualifies" explanation; usage stats; deactivate.
- Automatic offers (sample above threshold, free gift wrap during a festival) configured as content of kind `offer` with a Zod schema.
- Birthday coupon template (v1.1): single-use, auto-generated per customer, valid for the birth month.

### 3.7 Reviews
- Queue (pending), approve/reject with templates, reply publicly, feature a review (shown on the sign page).
- Photo review images are moderated before becoming public. Uploads land in the private store and are **copied to the public store on approval**.

### 3.8 Returns
- Queue by status; evidence viewer (video player, image zoom) via signed URLs; approve (replacement/refund, pickup needed?), reject with reason, receive and QC (restock/write-off per item), resolve.

### 3.9 Content (CMS)
- **Home builder:** ordered sections (hero, zodiac wheel, season spotlight, best-sellers, story, press, reviews, journal teaser), each with a typed form, visibility schedule, and preview.
- Banners and announcement bar (scheduled).
- Sign copy: per-sign story, traits, FAQs, featured review.
- Journal: posts with Tiptap, cover, sign tags, SEO, schedule publish.
- FAQs and policy pages (versioned; the policy version shown in the footer and stored with consents).
- Notes library: note name, family, short description, icon, used by product editor pickers and the glossary page.
- On publish: `updateTag` for affected keys (`home`, `sign:{slug}`, `post:{slug}`).

### 3.10 Settings (owner)
- Store & legal info (legal name, GSTIN, state code, address, support contacts, **grievance officer**), shipping slabs and free-shipping threshold, COD rules, gift-wrap price, reservation minutes, return window, maintenance mode (shows a branded page to shoppers, admin still works), integrations health (Razorpay/Shiprocket/Resend/MSG91 ping), staff management.

### 3.11 Reports & exports
- Orders CSV (range), GST sales register (invoice-wise with HSN summary, for the CA / GSTR-1), refunds register, inventory valuation, sign performance.
- Exports run as streaming route handlers with row limits; PII exports are owner-only and audited.

## 4. Admin UX standards
- Optimistic UI only for non-money actions; money actions show a confirm dialog with an amount summary.
- Keyboard shortcuts on the orders list (`j/k` navigate, `p` pack, `s` ship).
- Every destructive action uses a confirm dialog; never `window.confirm`.
- Tables: TanStack Table (client, small pages) with server-side filters.
- Timezone: all times shown in IST with relative hints ("2 h ago").
