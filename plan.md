# Aaliqadr: Admin, Catalogue, Storefront & Account Upgrade Plan

**Goals**
1. **Admin:** a fast, dense, software-grade back office that is safe by default: complete CRUD wherever a record is managed, search/filter/sort that work the same way on every list, compact tables, every known bug fixed, and hardened security starting with the login.
2. **Product add & edit:** every variant gets its **own images**, uploaded right in the variant row, and the public product page shows exactly that variant's photos when it's selected.
3. **Public search & filters:** instant search with suggestions, typo tolerance and rashi/sign synonyms, and faceted filters with counts on every listing.
4. **Product showcase:** listing cards, quick view and product page at the level of leading D2C beauty brands.
5. **Customer account:** a proper dashboard: orders with tracking, addresses, wishlist, reviews, claims, profile and security.

**Scope**
- **Admin:** `src/app/(admin)/**`, `src/components/admin/**`, `src/actions/admin/**`, `src/server/admin/**`.
- **Storefront:** `src/app/(store)/**`, `src/components/product/**`, `src/components/layout/**`.
- **Account:** `src/app/(store)/account/**`.
- **Auth:** `src/server/auth.ts`, `src/components/auth/LoginForm.tsx`, `scripts/seed-admin.ts`, and the upload route.

**Status:** analysis complete (24 admin pages, the product editor, the storefront listing/search/product pages and the account pages reviewed). Nothing in this plan has been implemented yet.

---

## 0. Priorities at a glance

| Priority | Theme | Why first |
|---|---|---|
| **P0** | Security fixes (login, sign-up, seed script, sessions) | Two issues let anyone become **owner** today. |
| **P1** | Bugs & broken behaviour | Visible defects and wrong behaviour. |
| **P2** | Admin design system: density, data table, toolbar, dialogs, toasts | Every later page reuses it. Build it once. |
| **P3** | Search, filter, sort and pagination on every list | One shared pattern, applied page by page. |
| **P4** | Complete CRUD on every managed record | Fill the gaps listed in §5. |
| **P5** | Speed & software-level UX: command palette, shortcuts, bulk actions, saved views | The finishing layer. |
| **P6** | Security part 2: 2FA, password lifecycle, sessions, admin CSP | Builds on P0. |
| **P7** | Product add/edit 2.0: per-variant images, publish checklist, previews | The catalogue quality every page depends on (§8). |
| **P8** | Public search & filters | How shoppers find products (§9). |
| **P9** | Product showcase: cards, quick view, product page | Conversion (§10). |
| **P10** | Customer account dashboard | Retention and self-service (§11). |

Every phase ships with its tests, audit entries and doc updates (§13).

---

## 1. Analysis: what exists today

**Pages (24):**
- Dashboard.
- Orders: list and detail.
- Returns: list and detail.
- Products: list and editor.
- Categories, Collections (list and editor), Inventory, HSN codes.
- Customers: list and detail.
- Reviews, Content, Coupons, Shipping, Invoices, Reports & GST.
- Staff & roles, Settings, Activity log.

**What works well:**
- **Server side:** server actions with role checks, Zod validation, an audit log, an append-only stock ledger, and money in paise.
- **Pages:** every page wraps itself in Suspense with a skeleton, so navigation is instant.
- **Products:** a rich editor (options matrix, media, A+ content, SEO) and a product list with filters and bulk actions.

### 1.1 Security findings

| # | Severity | Finding | Where |
|---|---|---|---|
| S1 | **Critical** | **Open password sign-up.** `emailAndPassword` is enabled, and neither `disableSignUp` nor `requireEmailVerification` is set. Anyone can call `POST /api/auth/sign-up/email` with any email address, without owning it. The user-create hook then hands out roles by email: **signing up as `ADMIN_EMAIL` gives owner**, and **signing up as an invited staff email takes that invite's role**. | `src/server/auth.ts` |
| S2 | **Critical** | **Hard-coded owner email.** `databaseHooks.user.create` makes a hard-coded personal email address owner, alongside `ADMIN_EMAIL`. Combined with S1, anyone who signs up with that address first becomes owner. Ownership must come only from configuration. | `src/server/auth.ts` |
| S3 | **Critical** | **Plaintext password in the repo, and a destructive seed script.** `scripts/seed-admin.ts` contains a plaintext admin password. It also deletes **every** credential account in the database (`deleteMany({ accountId: { $exists: true }, providerId: "credential" })`), not only that user's. **This file is committed (`1620787`) and pushed to `origin/main` on GitHub, so the password must be treated as leaked: rotate it now.** Removing it from the latest commit is not enough; it stays in history unless rewritten. | `scripts/seed-admin.ts` |
| S4 | High | **No brute-force protection on password sign-in.** OTP is rate-limited; `/sign-in/email` is not. Better Auth's built-in limiter is per-instance memory, which is ineffective on serverless. | auth config |
| S5 | High | **Role changes lag up to 5 minutes.** Changing a role deletes the person's sessions, but `session.cookieCache` (maxAge 300 s) keeps the old role valid until the cookie expires. A demoted admin keeps admin rights for up to 5 minutes. | `auth.ts`, `setRoleAction` |
| S6 | High | **No second factor for staff.** Staff accounts use only a password or email code; there is no 2FA. Docs/06 requires staff 2FA. | — |
| S7 | Medium | **No password policy.** There's no minimum length, no breached-password check, no "forgot password" flow, and no way to set or change a password from the UI. | auth |
| S8 | Medium | **Sign-ins aren't logged.** Sign-in, sign-out, failed attempts and role changes made outside the admin (e.g. the seed script) don't reach the activity log. | — |
| S9 | Medium | **Role changes have no confirmation.** Changing a role from a dropdown submits instantly on change. The owner role can be granted with one mis-click. | `RoleSelect` |
| S10 | Medium | **`/admin` isn't gated at the network edge.** The proxy matcher covers only `/zodiac`. Every page and action does check, so this is defence in depth only. | `src/proxy.ts` |
| S11 | Low | **Outdated comments.** The auth file still says "passwordless", and the login has a meaningless ternary (`? "password" : "password"`). | `auth.ts`, `LoginForm.tsx` |
| S12 | Low | **Weak CSP.** It allows `'unsafe-inline'` scripts, kept so catalogue pages can stay prerendered. Evaluate a nonce-based CSP for `/admin` only, since admin pages are dynamic anyway. | `next.config.ts` |

### 1.2 Bugs & broken behaviour

| # | Bug | Where |
|---|---|---|
| B1 | Session cookie cache keeps revoked roles alive (see S5). | auth |
| B2 | **Coupon dates use UTC:** they are built with `toISOString().slice(0,10)`, so between 00:00 and 05:30 IST the default start and end dates are a day early. | `AdminForms.tsx` CouponForm |
| B3 | **Lists truncate silently with no pagination:** customers stop at 100 and returns stop at 100 (no "more" link); inventory shows only the last 25 movements. | `queries.ts`, `ops.ts` |
| B4 | **Stale product page after review moderation:** after a review is published, a product page that was already open shows it only on the second load. | review actions |
| B5 | **Mobile menu positioning:** the menu panel is `absolute` without a positioned parent, so it can overlap the page header. | `AdminNav.tsx` |
| B6 | **No warning before losing work:** content, collection and category editors don't warn about unsaved changes (only the product editor does). | editors |
| B7 | **`RoleSelect` lists the "owner" role with no extra confirmation** (see S9). | `AdminForms.tsx` |
| B8 | **Orders can't be edited before dispatch:** the shipping address and phone are fixed after placement (customers often send corrections). | orders |
| B9 | **The product list loads every product, then pages in memory.** Fine for 17 products, slow at 1,000+. | `listProductsAdmin` |
| B10 | **Inventory table is heavy:** every row carries an always-open adjust form (two inputs and a button). The page grows long and slow; a 2,000-row list would render 4,000 inputs. | inventory |
| B11 | **Several status messages vanish on refresh:** some actions show an inline status, then `router.refresh()` clears it, so the confirmation flashes and disappears. | various |
| B12 | **No CSV export** for orders, customers, coupons, reviews or returns. | — |

### 1.3 UI / UX issues (density and efficiency)

**Spacing and density**
- Table cells use `px-4 py-3` and headers `py-2.5`, giving rows about 52 px high. That is too airy for an operations tool.
- Cards use `p-5`, the page header `mb-6`, and section gaps `gap-6`. Together this means too much scrolling.
- Stat cards take a full row on every page; KPIs could be a compact strip.

**Tables**
- No sticky header, no click-to-sort columns, no column chooser, no density toggle.
- No row selection outside Products.
- Numbers are right-aligned inconsistently.
- Long text wraps instead of truncating with a tooltip.

**Filters**
- Each page invents its own: some use a form with an "Apply" button, some use tabs, some have none.
- Active filters aren't shown as removable chips, and there's no "clear all".

**Feedback and confirmation**
- Inline `FormStatus` lines everywhere; there's no global toast.
- `ConfirmButton` expands inline and shifts the layout; it should be a proper dialog.

**Editing**
- Categories and HSN use a side panel or inline rows, but Coupons can only be created, and Customers can't be edited.
- There's no consistent "drawer" pattern.

**Navigation**
- No global search: finding an order, product or customer means opening its page first.
- No breadcrumbs on detail pages beyond a "back" link.
- No keyboard shortcuts.

**Mobile**
- Tables just scroll sideways; there's no card layout on small screens for the key lists (Orders, Products, Returns).

**Other gaps**
- Empty states give no next action (e.g. "Create coupon").
- Every time is shown absolute; there are no relative hints ("2 h ago").

---

## 2. Design system for the admin (P2)

Build these once in `src/components/admin/kit/`, then migrate every page to them.

### 2.1 Density tokens
- **Default "compact":**
  - cells `px-3 py-2` (about 36 px rows), headers `py-2 text-[11px]`;
  - card padding `p-4`, page header `mb-4`, section gap `gap-4`.
- **Density toggle** (Comfortable / Compact), remembered per viewer in `localStorage`.
- **Tabular figures** on every number; consistent alignment (numbers right, text left, status centre-left).

### 2.2 `<DataTable>` (server-driven)
- **Inputs:** column definitions plus rows from the server.
- **URL as the single source of truth:** state lives in `searchParams` (q, filters, sort, dir, page, size), so views are shareable, refresh-safe and work with the back button.
- **Header:**
  - Sticky header; click a column to sort (asc → desc → off), with an arrow icon and `aria-sort`.
  - Column chooser (show/hide), remembered per viewer.
- **Rows:**
  - Optional selection checkboxes with select-all-on-page and "select all N matching".
  - Long text is truncated with a `title` tooltip; numbers use tabular figures.
- **Footer:**
  - Row count "1–25 of 312" and page size 25/50/100.
  - Pagination: prev/next, jump to page.
- **States:**
  - Loading: a skeleton row set, never a blank page.
  - Empty: a message plus a primary action.
- **Mobile:** under `md`, each row renders as a card with the key fields (configurable per table).

### 2.3 `<ListToolbar>`
- **One row, top to bottom on mobile:**
  - Search box (debounced 300 ms, updates the URL; Enter applies immediately).
  - Filter dropdowns (status, date range, multi-select), and a sort select for mobile.
  - "Export CSV" and the page's primary action button.
- **Active filters** appear as removable chips under the toolbar, with a "Clear all" link.

### 2.4 Feedback & overlays
- **`<Toaster>`:** success/error toasts, top-right, auto-dismiss in 4 s, `aria-live`. They replace most inline `FormStatus` lines and survive `router.refresh()` (bug B11).
- **`<ConfirmDialog>`:**
  - Built on the native `<dialog>`: focus trap, Esc to close, and a danger variant.
  - Shows a typed summary for money actions ("Refund ₹1,200 to UPI").
  - Destructive bulk actions require typing the count.
- **`<Drawer>`:** a right-side panel for quick create/edit (coupon, category, HSN, staff invite, customer edit, order address), so the list stays visible.
- **`<UnsavedGuard>`:** a shared hook used by every editor (fixes B6).

### 2.5 Small pieces
- `<RelativeTime>` ("2 h ago", absolute IST time in the tooltip).
- `<CopyButton>` for order IDs, SKUs and AWB numbers.
- `<KeyValue>` grid for detail pages.
- `<Breadcrumbs>`.

**Acceptance:** Orders, Products and Inventory pages show at least 2× more rows per screen than today at 1440×900, with no horizontal scroll at 1280 px.

---

## 3. Search, filter & sort: every list (P3)

All server-side, in the URL, through `<DataTable>` and `<ListToolbar>`.

| Page | Search | Filters | Sort | Paging / export |
|---|---|---|---|---|
| **Orders** | order ID, name, email, phone, AWB, invoice no. | status (multi), payment method, payment status, date range (presets + custom), state, has coupon, sign | date, total, status | paged · **CSV** |
| **Products** | name, SKU, URL, tag, barcode | status, category (incl. sub), collection, type, sign, stock (in/low/out), badge, has photos | store order, name, newest, edited, best-selling, price, stock | paged (move paging into Mongo, fixes B9) · CSV ✓ |
| **Inventory** | product, SKU, barcode | category, status, stock (low/out/reserved > 0), active | name, stock, reserved, last movement | paged · CSV (stock sheet) |
| **Stock ledger** *(new tab)* | SKU, reason, reference | type, actor, date range | date | paged · CSV |
| **Customers** | name, email, phone | role, has orders, joined range, spent range, has open claim | joined, orders, spent, last order | paged (fixes B3) · CSV (admin; PII audited) |
| **Returns** | RT id, order, email, name | status tab, reason, resolution, date range | date, value | paged (fixes B3) · CSV |
| **Reviews** | text, product, customer | status, rating, verified, has photos, product | date, rating | paged · CSV |
| **Coupons** | code, description | status (live / scheduled / ended / paused), kind | created, ends, uses | paged |
| **Categories** | name, URL | visibility, parent | tree order, name, products | — |
| **Collections** | name, URL | kind, visibility, featured | order, name, products | — |
| **HSN** | code, description | rate, active, in use | code, rate, products | — |
| **Invoices** | invoice no., order, name, email | financial year, date range, supply (intra/inter), state | date, total | paged · CSV ✓ |
| **Activity log** | action, record, person | actor, entity kind, date range | date | paged · CSV |
| **Staff** | name, email | role, invite status | name, role | — |

**Indexes to add** (via `db:sync-indexes`):
- Orders: `contact.email`, `contact.phone`, `shipment.awb`, `invoice.number`, `{ status, createdAt }`, `{ "payment.method", createdAt }`.
- Reviews: `{ productId, rating }`.
- AuditLog: `{ action, createdAt }`.
- Text index on product `name`/`tags` for search.

**Acceptance:** every list above responds in under 300 ms on 10k rows (seeded test data). Refreshing or sharing the URL reproduces the exact view.

---

## 4. Software-level UX (P5)

- **Command palette (⌘K / Ctrl+K):**
  - Jump to any page.
  - Search orders, products and customers live; actions such as "New product", "New coupon", "Go to order AQ-…".
  - Built on one server action, `globalSearch(q)`, returning the top 5 per type.
- **Keyboard shortcuts** (shown in a `?` help dialog):
  - Navigation: `g o` orders, `g p` products, `g i` inventory, `/` focus search, `n` new.
  - Order list: `j/k` to move, `Enter` to open.
  - Order detail: `p` pack, `s` ship.
- **Bulk operations:**
  - Orders: start packing, print packing slips (one combined print page), mark shipped from a CSV of AWBs, export.
  - Reviews: approve/hide selected. Returns: export. Inventory: bulk receive via CSV ✓.
- **Saved views:** save the current filters as a named tab per user (e.g. "COD to ship", "Low stock perfumes"), stored per user in the database.
- **Inline quick edits:**
  - Products: price/MRP and stock threshold editable right in the table (with an undo toast).
  - Order detail: internal note inline.
- **Dashboard 2.0:**
  - **Header:** date-range picker (today / 7 / 30 / FY / custom) and a compact KPI strip (revenue, orders, AOV, refunds, COD share).
  - **Action queues** (each links to a pre-filtered list): to pack, to ship, awaiting payment, open claims, pending reviews, low stock.
  - **Charts:** revenue-by-day chart and top products.
- **Detail pages:**
  - Two-column layout: a main column plus a right summary rail.
  - Sticky action bar for the primary action.
  - Activity timeline merging history and audit log.
- **Relative times, copy buttons, breadcrumbs** everywhere.

---

## 5. CRUD completeness (P4)

✓ = exists today · **+** = to build.

| Record | Create | Read/list | Update | Delete / archive | Notes |
|---|---|---|---|---|---|
| Products | ✓ | ✓ | ✓ (+ inline price/stock-threshold edit) | ✓ (archive if ordered) | + bulk category/collection/badge assignment |
| Variants | ✓ | ✓ | ✓ | ✓ (only if never ordered) | — |
| Categories | ✓ | ✓ | ✓ | ✓ (guarded) | + drag-to-reorder siblings |
| Collections | ✓ | ✓ | ✓ | ✓ | + drag reorder of products in manual collections |
| HSN codes | ✓ | ✓ | ✓ | ✓ (if unused) | — |
| Inventory | ✓ (receive) | ✓ | ✓ (adjust; CSV) | n/a (ledger is append-only) | + adjust in a drawer instead of per-row forms (B10); + ledger tab |
| **Coupons** | ✓ | ✓ | **+ edit** (description, end date, limits; code and kind fixed once used) | **+ delete** (unused) / pause ✓ | + usage list per coupon |
| **Orders** | n/a (customers place them) | ✓ | **+ edit shipping address/phone before dispatch**, **+ edit gift message**; status ✓; notes ✓ | cancel ✓ | + partial refund outside a claim (admin, with confirm) |
| Returns / claims | ✓ (customer) | ✓ | ✓ (status flow) | **+ admin-raised claim** on behalf of a customer (phone/email complaints) | — |
| Reviews | ✓ (customer) | ✓ | ✓ (moderate, reply) | ✓ | **+ admin edit for typos** (logged) |
| **Customers** | **+ create** (phone-order customer) | ✓ | **+ edit name/phone**, **+ manage saved addresses**, role ✓ | **+ deactivate / block COD** | Deleting personal data is a privacy-centre flow (docs/14). |
| Staff | ✓ (invite) | ✓ | ✓ (role, with confirm) | **+ remove access** (role → customer, sessions ended) | — |
| Content | ✓ | ✓ | ✓ | ✓ | + schedule (start/end) for banners and the announcement bar |
| Shipping / Settings | n/a | ✓ | ✓ | n/a | + business details editable from the UI (GSTIN etc.), owner only, validated |

Every create, update and delete goes through a Zod-validated server action with a role check, an audit-log entry and a toast. Destructive actions use `<ConfirmDialog>`.

---

## 6. Security plan (P0, then ongoing)

**Do these first, in this order:**

1. **Close sign-up (S1).**
   - Set `emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, requireEmailVerification: true }`.
   - New accounts come only from email OTP (which proves the person owns the address), Google, or staff invites.
2. **Roles only for verified owners of the email (S1, S2).**
   - In the user-create hook, give `owner` or an invite's role **only when the account was created through a flow that proved the email** (OTP or Google). Otherwise always `customer`.
   - Remove the hard-coded personal email; ownership comes from `ADMIN_EMAIL` only.
3. **Fix the seed script (S3).**
   - Remove the plaintext password from `scripts/seed-admin.ts`; read it from a one-off prompt or an env var that's never committed.
   - Scope the delete to that one user's credential account.
   - **Rotate the leaked password** and check `git log` and any pushed remotes for it.
4. **Brute-force protection (S4).**
   - Configure Better Auth `rateLimit` with the Upstash store (shared across instances).
   - Stricter custom rules for `/sign-in/email` (5 per 15 min per IP and per email), with lockout and a generic error message.
5. **Instant role changes (S5).**
   - Disable `cookieCache` for staff, or set `maxAge` ≤ 30 s; otherwise check the role from the database in `requireRole`.
   - On a role change, delete the sessions **and** invalidate the cookie cache.
6. **Staff 2FA (S6).** Better Auth `twoFactor` plugin (TOTP plus backup codes), **required for admin and owner**, optional for staff. The admin gate enforces enrolment.
7. **Password lifecycle (S7).**
   - "Set / change password" in the account page; "Forgot password" through an emailed, single-use reset link.
   - Breached-password check (HIBP k-anonymity) on set and change.
8. **Auth audit (S8).** Log sign-in success and failure, sign-out, 2FA enrolment, password change and role change to the activity log, with IP and user agent; filterable on the Activity log page.
9. **Admin hygiene (S9, S10, S11):**
   - Confirm dialog for role changes; owner grants need the current owner's password or 2FA.
   - Add `/admin/:path*` to the proxy matcher: redirect to login when there's no session cookie (cheap check; the authoritative check stays in pages and actions).
   - Fix the outdated comments.
10. **Sessions page.** "Where you're signed in" list with "sign out other devices"; owners can end any staff member's sessions.
11. **Uploads & exports.**
    - Keep the per-prefix upload rules ✓; add content-type sniffing on the client and a file-name allowlist.
    - Exports containing personal data: owner only, audited, with a watermark row "Exported by X at T".
12. **CSP for admin (S12).** A nonce-based strict CSP on `/admin/*` (dynamic pages, so no prerender cost), with `frame-ancestors 'none'` ✓.

**Acceptance:**
- An automated test proves that:
  - sign-up with `ADMIN_EMAIL` is refused (sign-up disabled);
  - an invite's role is granted only after OTP;
  - 6 wrong passwords are rate-limited;
  - a demoted admin loses access on their next request.
- `git grep` finds no plaintext credentials.

---

## 7. Login page: show/hide password (eye button)

In `src/components/auth/LoginForm.tsx`:

**Behaviour**
- The password field gets a trailing button: `Eye` / `EyeOff` (lucide).
- It toggles `type="password"` ↔ `type="text"`.
- Accessibility: `aria-label` "Show password" / "Hide password", `aria-pressed` reflecting the state, and `aria-controls` pointing at the input.
- The input keeps `autoComplete="current-password"`.

**Safety**
- The field resets to hidden after a submit, and when the user leaves the page.
- `spellCheck={false}` and `autoCapitalize="none"`, so the visible password isn't sent to spell-check services.

**Layout**
- The button sits inside the input (`relative` wrapper; input `pr-12`; button 44×44 px tap target).
- It is keyboard focusable and uses the same gold focus ring.

**Same pattern elsewhere**
- Reuse it in every future password field (set/change password, reset).
- While there: add a "Forgot password?" link (once item 7 of §6 exists), and fix the meaningless default-mode ternary (S11).

**Acceptance:** keyboard-only users can toggle it; a screen reader announces the state; the value is never logged.

---

## 8. Product add & edit 2.0: per-variant images (P7)

### 8.1 What exists today
- **Media:** one gallery per product (`product.media`). Each variant can only *point at* gallery images (`variant.mediaIds`) through a "Pick" popover; nothing can be uploaded from the variant row itself.
- **Product page:** puts the selected variant's images first, then **every other image of the product**. So choosing "Gift box" still shows the plain-bottle photos.
- **Cart, checkout and orders:** use the product's first image, not the variant's. An order for the gift box shows the wrong picture in the bag, the confirmation email and the invoice.
- **Listing cards:** always show the product cover, whichever variant a shopper is browsing.

### 8.2 Target behaviour
- **Every variant has its own image set**, uploaded and ordered in its own row (drag to reorder, first = variant cover, alt text required).
- **Shared images** (lifestyle, notes, the box) stay in a product-level "Shared" set and can be shown with every variant.
- **Option-level images (fast path):**
  - Mark one option axis as the **image axis** (e.g. *Edition* or *Colour*).
  - Images uploaded for an option value apply to every variant with that value. Example: "Gift box" photos show for 10 ml, 50 ml and 100 ml gift boxes.
  - A variant can still override them with its own images.
- **Image resolution order** for a variant: its own images → its image-axis value's images → shared images (per-product toggle: "Show shared images after variant photos"). It is never other variants' photos.

### 8.3 Data model
- **Images library:** `product.media[]` remains the single library, so storage and dedupe stay in one place.
  - Each item gains `scope`: `{ kind: "shared" } | { kind: "variant", sku } | { kind: "option", axis, value }`, plus a per-scope `order`.
- **Settings:** `product.imageAxis?: number` (index of the option axis that drives images); `product.display.sharedAfterVariant: boolean`.
- **Migration:** existing `variant.mediaIds` become `scope: variant` items; images not referenced by any variant become `shared`. Reads keep working during the switch.
- **Resolver:** one pure function `imagesFor(product, sku)` in `src/lib/variant-media.ts`, used by the editor preview, product page, quick view, cards, cart, order snapshot and JSON-LD. Unit-tested.
- **Order snapshot:** `OrderItem.image` (the resolved variant cover at purchase time), shown in the bag, checkout, confirmation email, account order page, admin order page and packing slip.

### 8.4 Editor UX (variant media)
- **Variant table "Images" cell:**
  - A drop zone with thumbnails: drag files straight onto a variant row; click to open the variant media panel.
  - Upload uses the existing Blob client upload (`products/{slug}/{sku}/…`).
- **Variant media panel** (drawer):
  - Upload (multi, drag-drop, paste from clipboard), reorder, set cover, alt text, delete.
  - "Copy from another variant…" and "Apply to all variants with *Gift box*" (option-level).
  - "Also show shared images" toggle.
- **Media section:**
  - Split into **Shared**, **By option value** (when an image axis is set) and **By variant**, with counts.
  - Unassigned images are flagged.
- **Upload pipeline (client):**
  - Downscale to ≤ 2400 px and convert to WebP/AVIF before upload (quality ~0.85).
  - Reject images under 1000 px with a clear message; block duplicates (hash).
  - Up to 12 images per variant, 40 per product.
- **Server:**
  - Generate a `blurDataURL` (tiny placeholder) and store width/height, so every image renders without layout shift and with a blur-up.
  - Delete Blob files that are no longer referenced, after a 7-day grace period (cron sweep).

### 8.5 Other add/edit improvements
- **New-product wizard** (first save only):
  1. Basics.
  2. Options & variants.
  3. Prices & stock.
  4. Images per variant.
  5. Details & SEO.
  6. Review & publish.
- After the first save, editing uses today's single-page editor with section navigation.
- **Publish checklist** blocks "Active" until:
  - every active variant has ≥ 1 image with alt text, a price ≤ MRP, a weight and a SKU;
  - legal fields and HSN are set;
  - the description is ≥ 80 characters.
  - Warnings (not blockers): no SEO title, fewer than 3 images, no A+ content.
- **Drafts & safety:**
  - Autosave a local draft every 10 s (restore prompt after a crash).
  - Server-side "Save draft" without publishing.
  - Version history (audit diff per save) with "restore this version".
- **Preview:**
  - "Preview as shopper" opens the unpublished product in Next.js Draft Mode, in its sign theme.
  - A side-by-side mobile preview of the gallery for the selected variant.
- **Variants grid:**
  - Duplicate a row; fill down a column (price, MRP, weight); keyboard navigation across cells (Excel-like).
  - Option-value drag reordering; option templates ("Size: 10/50/100 ml").
  - **Cost price** (owner only, `select: false` already) with live **margin %**.
  - Barcode scan via the camera (BarcodeDetector API where available).
- **Inline validation:**
  - Errors appear next to the field.
  - The save bar lists problems with jump-links ("3 issues: Variant 100 ml · Gift has no image").
- **Bulk edit across products:** a spreadsheet-style screen for price, MRP, status, badges and category, for many products at once (CSV import stays for very large changes).
- **Scheduling:** "Publish at" and "Unpublish at" (launches, limited editions), run by the existing cron.

### 8.6 Public product page: reflecting variant images
- Selecting a variant (chip or `?v=SKU`) swaps the **whole gallery** to `imagesFor(product, sku)`: thumbnails, main slide, lightbox and video.
- **Transitions and loading:**
  - Crossfade between galleries.
  - Preload the first image of the variant under the pointer (hover/focus on a chip).
  - No layout shift: every image has stored dimensions and a blur-up.
- **Swatches:**
  - Option chips for the image axis show a tiny image swatch.
  - Unavailable combinations stay disabled ✓; sold-out ones say so ✓.
- **Elsewhere:**
  - Listing cards switch to the variant cover when a size/edition swatch is hovered or tapped (§10.1).
  - Social share image (`og:image`) and JSON-LD use the selected variant's images (`?v=` aware) ✓ (extend to the new resolver).

### 8.7 Acceptance
- **Editor:** an admin can upload 4 photos straight onto the "100 ml · Gift box" row in under 30 seconds without opening another section.
- **Product page:** choosing that variant shows only those 4 (plus shared, if enabled); switching back restores the previous variant's set.
- **Downstream:** the bag, checkout, confirmation email, account order, admin order and packing slip all show the variant's own cover.
- **Tests:**
  - Unit tests for `imagesFor` cover all scopes and the fallback order.
  - A browser test uploads to a variant and verifies the product page.

---

## 9. Public search & filters (P8)

### 9.1 What exists today
- **`/search`:** a simple substring score over the cached catalogue. There are no suggestions, no typo tolerance, no synonyms ("mesh" doesn't find Aries) and no filters on the results page.
- **`/shop`:** filters by category, element and in-stock, with 5 sort options. There's no price range, no notes/size/concentration filters, no counts per filter value and no mobile filter drawer.
- **Category and collection pages:** have no filters at all (they link to `/shop`).

### 9.2 Search experience
- **Search overlay:** opened from the header icon, `/` or ⌘K, and the mobile bottom nav.
  - **Instant results as you type** (debounced 150 ms): products (image, price, sign), categories, collections, signs/rashis and notes ("saffron" → fragrances with saffron).
  - **Before typing:** recent searches (stored in the browser only), popular searches (curated in Admin › Content), and "Find my sign".
  - Keyboard navigation (↑↓, Enter, Esc), highlighted matches; screen-reader announced counts.
- **Relevance engine.** **Phase 1** is an in-memory index over the cached catalogue, fine for up to ~1,000 products. Rebuilt on catalogue change through the same cache tags, so it costs zero database reads per search.
  - Tokenise and normalise (lower-case, accents, punctuation); light stemming ("woods" → "wood").
  - **Synonyms:** rashi ↔ sign (Mesh ↔ Aries, Vrishabh ↔ Taurus…); Hindi transliterations (kesar ↔ saffron, chandan ↔ sandalwood, gulab ↔ rose, oud ↔ agarwood); edited in Admin › Content › Search synonyms.
  - **Typo tolerance:** edit distance 1 for words of 4–7 letters, 2 for 8+.
  - **Field weights:** name > sign/rashi > tags > notes > category > description.
  - **Ranking boosts:** in stock, bestseller, rating.
  - **Phase 2** (over ~1,000 products, or for analytics needs): MongoDB **Atlas Search** with autocomplete and fuzzy indexes, behind the same `searchProducts()` interface, so no page changes.
- **No results:**
  - "Did you mean …" from the typo engine.
  - Nearest category/sign, and bestsellers.
  - A "Tell us what you were looking for" link.
- **Search analytics** (no personal data): log the query, result count and clicked product. Admin › Reports gets "Top searches", "Searches with no results" and "Search → add-to-bag rate" to guide merchandising.

### 9.3 Faceted filters (shop, search, category, collection pages)
- **Facets, each with live counts:**
  - Category (tree), zodiac sign, element.
  - **Note family** (woody, floral, amber, citrus, spicy, aquatic…).
  - Concentration; **size** (10 / 50 / 100 ml, gift sets).
  - **Price range** (slider plus buckets: under ₹1,500 / ₹1,500–3,000 / ₹3,000+).
  - Rating ≥ 4; in stock; badges (New, Bestseller, Gift, Limited); on offer.
- **Behaviour:**
  - Multi-select within a facet (OR), across facets (AND). Values with zero results are dimmed, not hidden.
  - Applied filters show as chips with ×, plus "Clear all".
  - The result count updates live.
- **Sort:** Featured, Bestselling, Newest, Price ↑/↓, Top rated, Biggest saving.
- **URL state:**
  - Every filter and sort lives in the query string (shareable, back-button friendly).
  - Canonical and noindex rules prevent filter combinations from being indexed (only category/sign/element landing pages are indexable).
- **Desktop:** a sticky left filter rail with collapsible groups.
- **Mobile:**
  - A "Filter & sort" button opens a full-height sheet with "Show 23 results".
  - The sort control sits in the sticky header of the grid.
- **Paging:**
  - "Load more" (24 per page) with real `?page=` URLs for crawlers.
  - Scroll position is restored on back.
- **Performance:** facet counts are computed server-side from the cached catalogue, with no client-side filtering library; the JS added stays under 15 KB gzip.

### 9.4 Acceptance
- **Search:**
  - "mesh" finds Ember Crown; "kesar" finds saffron fragrances.
  - "embr crwn" finds Ember Crown; the empty-results page always offers something.
- **Filters:**
  - Combining sign + price + size returns correct counts that match the grid.
  - The URL round-trips.
- **Mobile:** the filter sheet passes keyboard and screen-reader checks.
- **Performance:** search responds in < 100 ms on the server for 1,000 products; the shop page keeps LCP < 2.5 s and CLS < 0.1 on a mid-range phone.

---

## 10. Product showcase at industry level (P9)

### 10.1 Product cards (shop, search, category, collection, home, related)
- **Visuals:**
  - Consistent 4:5 media and a blur-up; a second image on hover ✓.
  - **Variant swatches/size chips** (up to 4, "+2"): hovering or tapping switches the card image and price to that variant.
- **Information:**
  - Price "from" with MRP strike-through and % off ✓; star rating with count; badges (max 1–2) ✓.
  - Stock hints ("Only 3 left" when true).
- **Actions:**
  - **Quick add:** a single-variant product goes straight to the bag; a multi-variant product opens Quick View.
  - **Wishlist heart** (§11).
- **Accessibility:** the whole card is one link, with separate buttons for quick add and wishlist (no nested links); focus rings; 44 px tap targets.

### 10.2 Quick View
- A sheet on mobile, a modal on desktop.
- Contents: the variant-aware gallery (§8.6), variant picker, price, stock, Add to bag, "View full details".
- URL-safe: no route change, and Esc closes it.

### 10.3 Product page 2.0
- **Gallery:** variant-specific (§8.6); zoom and full-screen ✓; video ✓; pinch-zoom on mobile; thumbnails as a vertical rail on desktop ✓.
- **Buy box:**
  - Variant chips with image swatches; price per ml ✓; savings.
  - **Offers row:** "Use STARS10 for 10% off" from live coupons flagged "show on product page".
  - **Delivery estimate by pincode:** "Delivered by Tue 28 Oct · COD available". This uses Shiprocket serviceability when it's connected; until then, zone-based estimates from Settings.
  - **Gift options preview** (gift wrap price, message) ✓ at checkout; surface here as well.
  - Sticky mobile buy bar ✓.
- **Back-in-stock:** "Notify me" (email) on sold-out variants; an email goes out on restock (the inventory ledger triggers it).
- **Trust strip:** authenticity, secure payments (UPI/cards logos), free shipping threshold ✓, claim promise ✓.
- **Content:**
  - Notes pyramid ✓, scent profile ✓, A+ blocks ✓, specifications ✓.
  - **"How it wears through the day"** timeline (opening → heart → dry-down).
  - Ingredients & legal ✓; FAQ ✓.
- **Reviews 2.0:**
  - A photo-review gallery strip and filters (rating, verified, with photos); sort (newest, most helpful).
  - **Helpful votes**; review summary bars ✓; verified badges ✓.
  - Reply from Aaliqadr ✓.
  - Review request email 7 days after delivery.
- **Q&A:** customers ask, the team answers (moderated), with FAQ schema for answered ones.
- **Cross-sell:**
  - "Frequently bought together" (bundle add with a combined price).
  - "Compatible signs" ✓, "Complete your ritual" (body care/accessories from the same sign), recently viewed ✓.
- **Share:** native share sheet with the variant link (`?v=`).

### 10.4 Quality bars
- **Speed:** product and listing pages keep LCP < 2.5 s, INP < 200 ms and CLS < 0.1 on a mid-range Android over 4G, within the 170 KB first-load JS budget (docs/09).
- **Images:**
  - AVIF/WebP ✓ with correct `sizes`; the variant cover is preloaded.
  - No above-the-fold lazy images ✓.
- **SEO:**
  - Variant-aware Product JSON-LD ✓ (images per variant from §8).
  - AggregateRating and Review snippets once reviews exist; breadcrumbs ✓; canonical to the base product URL.
- **Analytics (consent-gated):** `view_item_list`, `select_item`, `view_item`, `select_variant`, `add_to_cart`, `add_to_wishlist`, `search`. These feed the Reports page.

### 10.5 Acceptance
- **Cards:** every listing card shows variant swatches that switch image and price without a page load; quick add works for single- and multi-variant products.
- **Product page:** shows a delivery estimate, live offers and a back-in-stock signup on a sold-out variant.
- **Speed:** Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices and SEO on `/shop` and one product page.

---

## 11. Customer account dashboard (P10)

### 11.1 What exists today
- One `/account` page: name, email, an admin link for staff, sign out, and a flat order list.
- **Order detail:** timeline, invoice, cancel and claim forms ✓.
- **Missing:** addresses management, wishlist, "my reviews", profile editing, password/security, preferences. The order list has no search, filter or thumbnails.

### 11.2 Structure
- **Navigation:**
  - An **account shell** with a left nav on desktop and a horizontal scrollable tab bar on mobile.
  - Sections: **Overview · Orders · Returns & claims · Addresses · Wishlist · Reviews · Profile · Security · Preferences**.
- **Theme:** the whole area wears the customer's **own sign theme** (from their birth date in Profile, or their most-bought sign), via the existing `ZodiacScope`.

### 11.3 Sections
- **Overview:**
  - Greeting.
  - The latest order card with a tracking progress bar, ETA and quick actions (Track, Invoice, Reorder).
  - Open claims; wishlist items back in stock.
  - "Picked for your sign" recommendations; a "Complete your profile" nudge (birth date → sign).
- **Orders:**
  - **List:** search (order ID, product) and filters (status, date range); item thumbnails (variant images, §8.3); status chips; ETA.
  - **Detail:**
    - Timeline ✓, courier tracking link ✓, invoice download ✓, cancel ✓, claims ✓.
    - **Reorder** (adds the same variants to the bag at today's price, with notes on unavailable items).
    - **Review this product** after delivery; "Need help?" contact with the order pre-filled.
- **Returns & claims:** every claim with its status and timeline; raise a claim from here too (choosing the order).
- **Addresses (CRUD):**
  - Add, edit, delete and set default.
  - Pincode → city/state autofill; the same validation as checkout (`addressInput`).
  - Up to 10 addresses ✓ (server limit); checkout uses the default ✓.
- **Wishlist:**
  - Hearts on cards and product pages; guests' wishlists live in the browser and merge on sign-in.
  - Move to bag; price-drop and back-in-stock alerts (opt-in).
  - Shareable wishlist link (optional, off by default).
- **Reviews:** my reviews with status (pending / published / hidden), edit (goes back to moderation ✓), delete; "Write a review" prompts for delivered products not yet reviewed.
- **Profile:**
  - Name, phone (verified by OTP when SMS is connected), birth date (optional, encrypted, used for sign and birthday offers with consent).
  - Email change through OTP to the new address.
- **Security:**
  - Set / change password with the **show/hide eye button** (§7) and a strength meter.
  - "Where you're signed in" sessions list with "sign out other devices"; optional 2FA.
  - Recent sign-in activity.
- **Preferences:**
  - Marketing consents per channel (email / SMS / WhatsApp) with an append-only consent ledger (docs/14).
  - Order notification channels.
  - "Download my data" and "Delete my account" requests (privacy centre, docs/14).

### 11.4 UI quality
- Matches the storefront's luxury design (glass surfaces, gold accents, sign theme) but with **denser, scannable layouts**: cards with clear hierarchy, not long forms.
- **States:**
  - Skeletons for every section (all reads are per-user and streamed in Suspense ✓).
  - Empty states with a next step ("No orders yet → Find your sign").
  - Toasts for saves.
- **Mobile-first:**
  - Thumb-reachable actions; bottom sheets for edit forms.
  - Order cards readable at 360 px.
- **Accessibility:** a landmark per section, visible focus, form errors linked to fields, 4.5:1 contrast on glass surfaces.

### 11.5 Security & data
- **Reads:** every account read is per-user and uncached ✓; ownership is checked on every record (orders ✓, addresses, wishlist, reviews, claims).
- **Writes:** rate-limited (`publicWrite`); sensitive changes (email, password, 2FA) require a recent sign-in (re-authenticate after 10 min).
- **Audit:** account security events are written to the activity log and shown to the customer in Security › Recent activity.

### 11.6 Acceptance
- **Self-service:** a customer can, without contacting support:
  - add and edit an address and set it as default;
  - wishlist from a card and move it to the bag;
  - reorder a past order;
  - write and edit a review;
  - raise and follow a claim;
  - change their password (eye toggle) and sign out other devices.
- **Layout:** every section works at 360 px and with keyboard only.

---

## 12. Phased delivery

| Phase | Contents | Est. |
|---|---|---|
| **P0 — Security** | §6 items 1–5, 9 and the §7 eye button. Rotate the leaked password. | 1 day |
| **P1 — Bugs** | B1–B12 (B9 and B10 land with P3). | 1 day |
| **P2 — Admin kit** | Density tokens, `DataTable`, `ListToolbar`, `Toaster`, `ConfirmDialog`, `Drawer`, `UnsavedGuard`, small pieces; migrate Orders, Products and Inventory first. | 2–3 days |
| **P3 — Search/filter/sort** | §3 for every list, the new indexes, Mongo-side paging, CSV exports. | 2 days |
| **P4 — CRUD** | §5 gaps: coupons, customers, order address edit, staff removal, admin-raised claims, content scheduling, business details. | 2 days |
| **P5 — Speed & polish** | Command palette, shortcuts, bulk order ops, saved views, inline edits, Dashboard 2.0, mobile card layouts. | 2–3 days |
| **P6 — Security part 2** | §6 items 6–8 and 10–12 (2FA, password lifecycle, auth audit, sessions, admin CSP). | 2 days |
| **P7 — Product add/edit 2.0** | §8: media scopes and migration, `imagesFor` resolver, variant-row upload and media drawer, option-level images, upload pipeline, order image snapshot, product-page gallery swap, publish checklist, wizard, drafts/preview, variants grid, bulk edit, scheduling. | 4–5 days |
| **P8 — Search & filters** | §9: search overlay, relevance engine with synonyms and typo tolerance, facets with counts on shop/search/category/collection, mobile filter sheet, URL state and SEO rules, search analytics. | 3–4 days |
| **P9 — Product showcase** | §10: card 2.0 with swatches and quick add, quick view, product page 2.0 (offers, delivery estimate, back-in-stock, reviews 2.0, Q&A, frequently bought together, share), quality bars. | 4–5 days |
| **P10 — Customer account** | §11: account shell, overview, orders 2.0, claims, addresses CRUD, wishlist, my reviews, profile, security, preferences. | 3–4 days |

**Suggested order:** P0 → P1 → P7 (images are the foundation for P9 and P10) → P2 → P3 → P8 → P9 → P10 → P4 → P5 → P6. Total ≈ 25–30 working days.

Each phase ends with `npm run lint && npm run typecheck && npm test && npm run build`, the admin crawl (`scripts/dev/crawl.mjs`), the browser tests (`scripts/dev/engagement-e2e.mjs`, extended per phase), and screenshots at 1440 px and 390 px.

---

## 13. Testing plan

- **Unit tests (Vitest):**
  - URL ↔ filter-state parser for every list.
  - Sort and pagination builders; CSV writers.
  - Role and permission matrix; password policy.
- **Integration tests** against a seeded test database:
  - Sign-up disabled; invite role only after OTP; rate limits; session revocation is immediate.
  - CRUD actions refuse wrong roles and invalid input.
- **Browser tests (CDP scripts):**
  - Every list: search → filter → sort → page → refresh keeps the view.
  - Bulk actions with confirm dialog.
  - Command palette search; eye button toggle.
  - Mobile card layout at 390 px.
- **Catalogue & storefront:**
  - Unit tests for `imagesFor` (all scopes and fallbacks), the search tokeniser/synonyms/typo tolerance, facet counting and URL state.
  - Browser tests:
    - upload images to a variant → the product page shows exactly those;
    - search "mesh" → Ember Crown;
    - filter + sort + paginate → refresh keeps the view;
    - quick add; wishlist → bag.
- **Account:** browser tests for address CRUD, reorder, review edit, claim, password change with the eye toggle, and sign out other devices.
- **Performance:**
  - Seed 10k orders, 2k products and 5k customers.
  - Each admin list loads in under 300 ms on the server.
  - Lighthouse mobile ≥ 90 on `/shop`, one product page and `/account`.
- **Accessibility:** keyboard-only pass on every page; `aria-sort` and `aria-live` checks; contrast ≥ 4.5:1.

---

## 14. Decisions needed from you

1. **Password sign-in:** keep it (with sign-up closed, 12+ characters, rate limits and 2FA), or go back to email-code-only for the admin?
2. **2FA:** required for admin and owner only, or for staff too?
3. **Orders:** which order fields can staff edit after placement? Proposed: address, phone and gift message before dispatch only, all audited.
4. **Customer deletion:** right-to-erasure handled by the privacy centre (planned, docs/14), or a direct admin "anonymise" button?
5. **Default density:** compact (recommended) or comfortable?
6. **Variant images:** should shared (product-level) images also show with every variant by default, or only the variant's own photos?
7. **Image axis:** which option drives images for most products (e.g. *Edition* / *Box*), or always per variant?
8. **Search engine:** start with the in-memory engine (free, instant, fine up to ~1,000 products) and move to Atlas Search later, or go to Atlas Search now?
9. **Wishlist for guests:** keep it in the browser and merge on sign-in (recommended), or require sign-in?
10. **Delivery estimate:** wait for Shiprocket, or launch with zone-based estimates from Settings?
11. **Q&A on product pages:** wanted at launch, or after reviews have traction?
