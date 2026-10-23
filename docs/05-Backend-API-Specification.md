# 05 — Backend API Specification

Two kinds of server entry points:

1. **Server Actions** (`src/actions/*.ts`, `"use server"`) handle everything the UI triggers.
2. **Route Handlers** (`src/app/api/**/route.ts`) handle only external callers: webhooks, cron, auth, Blob upload tokens, private file redirects, and the health check.

Reads for pages are **not** endpoints. Server Components call cached query functions in `server/queries/*` directly.

---

## 1. Shared contracts

### 1.1 Action result

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

export type ErrorCode =
  | "VALIDATION" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"
  | "OUT_OF_STOCK" | "PRICE_CHANGED" | "COUPON_INVALID" | "NOT_SERVICEABLE"
  | "RATE_LIMITED" | "PAYMENT_FAILED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL";
```

- `message` is always safe to show to the customer. Internal details go to Sentry with a `correlationId`, never to the client.
- Actions **never throw** to the client for expected failures. They return `ok: false`. Unexpected errors are caught by a wrapper, reported, and converted to `INTERNAL`.

### 1.2 Action wrapper

```ts
export const action = <I, O>(opts: {
  schema: z.ZodType<I>;
  auth?: "public" | "user" | "staff" | "admin" | "owner";
  rateLimit?: { key: "ip" | "user"; tier: RateTier };
  handler: (input: I, ctx: { user?: SessionUser; ip: string; reqId: string }) => Promise<O>;
}) => async (raw: unknown): Promise<ActionResult<O>> => { /* auth → rate limit → parse → handler → map errors */ };
```

Every action declares its auth level and schema. A lint rule (custom ESLint or a code review checklist) forbids exporting a raw `"use server"` function that doesn't use the wrapper.

### 1.3 Route handler response shape

`application/json`; errors as `{ error: { code, message } }` with a proper HTTP status. Webhooks return `200` for duplicates and for events we deliberately ignore (so the provider stops retrying), and `4xx` only on signature failure.

## 2. Server Actions catalogue

### 2.1 Catalogue & discovery (public)

| Action | Input (Zod) | Output | Notes |
|---|---|---|---|
| `searchProducts` | `{ q: string(1..60), filters? }` | `ProductCard[]` | Rate limit `search` (60/min/IP). See §6 |
| `checkPincode` | `{ pincode: /^[1-9]\d{5}$/, skus?: string[] }` | `{ serviceable, etaDays: [min,max], codAvailable }` | Redis-cached 24 h per pincode; falls back to "Delivery in 3–7 days" if Shiprocket is down |
| `subscribeStockAlert` | `{ sku, email }` | `{ subscribed: true }` | Idempotent (unique index) |
| `subscribeNewsletter` | `{ email, zodiacSign?, consent: true }` | `{ status: "pending" }` | Sends double opt-in email; writes `consents` |
| `confirmNewsletter` | `{ token }` | `{ status }` | Token hash compare |
| `submitContact` | `{ name, email, phone?, topic, message(10..2000), turnstileToken }` | `{ ticketId }` | Cloudflare Turnstile verification, 3/min/IP |

### 2.2 Cart (public; guest by cookie, user by session)

| Action | Input | Output | Rules |
|---|---|---|---|
| `getCart` | — | `CartView` | Recomputes prices, stock flags, and applicable offers on every read |
| `addToCart` | `{ sku, qty: 1..5 }` | `CartView` | Variant must be active; `qty ≤ maxPerOrder`; warns (doesn't block) if stock < qty |
| `updateCartItem` | `{ sku, qty: 0..5 }` | `CartView` | `0` removes |
| `applyCoupon` | `{ code }` | `CartView` | Full validation (doc 07 §4); returns a reason code |
| `removeCoupon` | — | `CartView` | — |
| `setGiftOptions` | `{ wrap, message?: string(0..200), hidePrice }` | `CartView` | Message sanitised (plain text) |
| `mergeGuestCart` | (internal, on login) | `CartView` | Sums quantities, caps at `maxPerOrder` |

`CartView` contains `items[] { sku, name, variantLabel, image, sign, qty, unitPriceP, mrpP, lineTotalP, inStock, maxQty }` and `totals { subtotalP, discountP, shippingP, giftWrapP, codFeeP?, taxP, totalP }`, plus `warnings[]`.

### 2.3 Checkout & payment

| Action | Input | Output | Notes |
|---|---|---|---|
| `getCheckoutQuote` | `{ addressId? \| address, paymentMethod }` | `Quote` | Server computes shipping, COD fee, tax split (CGST/SGST vs IGST by state) |
| `placeOrder` | `{ address, billingSameAsShipping, billing?, contact, paymentMethod: "razorpay"\|"cod", quoteHash, idempotencyKey: uuid }` | Razorpay: `{ orderId, razorpay: { keyId, orderId, amount, currency, prefill } }`; COD: `{ orderId, redirect }` | See doc 07 §3. `quoteHash` mismatch returns `PRICE_CHANGED` with a new quote. Duplicate `idempotencyKey` returns the original result |
| `verifyPayment` | `{ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ status: "paid" }` | HMAC verify + `payments.fetch` amount/status check. Idempotent |
| `reportPaymentFailure` | `{ orderId, code, reason }` | `{ ok }` | Logs only; release happens via webhook/cron |
| `retryPayment` | `{ orderId }` | Razorpay params | Only for `pending_payment` orders within the reservation window; reuses the order |
| `sendCodOtp` / `confirmCodOrder` | `{ orderId }` / `{ orderId, otp }` | `{ status }` | Optional COD phone verification to cut RTO |

### 2.4 Account (auth: user)

| Action | Notes |
|---|---|
| `updateProfile { name, dob?, zodiacSign?, zodiacSystem? }` | DOB is encrypted at rest; consent `dob_personalisation` recorded |
| `listAddresses` / `upsertAddress` / `deleteAddress` / `setDefaultAddress` | Ownership check on every call |
| `listMyOrders { cursor? }` | Range pagination, 10 per page |
| `getMyOrder { orderId }` | `order.userId === session.user.id` or guest token |
| `cancelMyOrder { orderId, reason }` | Allowed only before `ready_to_ship`; auto-refund if paid |
| `getInvoiceUrl { orderId }` | Returns `/api/files/invoice/{orderId}` (auth-checked redirect) |
| `createReturnRequest { orderId, type, items, description, evidence[] }` | Within `returnWindowHours` of `deliveredAt`; evidence pathnames must be uploaded by this user (verified against `media`) |
| `toggleWishlist { productId }` | — |
| `submitReview { productId, rating, title, body, photos[], longevity?, sillage? }` | Requires a delivered order containing the product; one per product |
| `updateMarketingPreferences { email, sms, whatsapp }` | Writes a `consents` row per change |
| `requestDataExport` / `requestAccountDeletion` | DPDP rights (doc 14); deletion is queued with a 7-day grace period, then `privacy:erase-user` |

### 2.5 Guest order tracking (public)

`trackOrder { orderId, emailOrPhone }` returns the customer-visible history only. Rate limit 10/min/IP, and a constant-time "not found" response for both a wrong ID and a wrong email.

### 2.6 Admin actions (auth: staff/admin/owner; see doc 11 for the permission matrix)

| Domain | Actions |
|---|---|
| Products | `createProduct`, `updateProduct`, `setProductStatus`, `upsertVariant`, `reorderMedia`, `duplicateProduct` |
| Inventory | `receiveStock { sku, qty, batchNo, mfgDate, expiryDate? }`, `adjustStock { sku, delta, reason }`, `writeOff` |
| Orders | `listOrders { status?, q?, cursor? }`, `getOrder`, `confirmCodOrder`, `cancelOrder { reason, refund: boolean }`, `addOrderNote`, `markPacked` |
| Fulfilment | `createShipment { orderId, courierId? }` (Shiprocket order → AWB → label), `schedulePickup`, `regenerateLabel`, `markDelivered` (manual override, audited) |
| Payments | `refundOrder { orderId, amountP, reason }` (owner/admin only; partial allowed) |
| Returns | `approveReturn`, `rejectReturn { reason }`, `schedulePickup`, `receiveReturn { restock[] }`, `resolveReturn { resolution }` |
| Coupons | `createCoupon`, `updateCoupon`, `deactivateCoupon` |
| Reviews | `moderateReview { id, status, adminReply? }` |
| Content | `upsertContent { key, data }` (Zod-validated per kind), `publishContent`, `upsertPost`, `publishPost` |
| Customers | `listCustomers`, `getCustomer`, `blockCustomer`, `setCodBlocked` |
| Settings | `updateSettings` (owner only) |
| Staff | `inviteStaff { email, role }`, `changeRole`, `revokeStaff` (owner only) |
| Reports | `getDashboard { range }`, `exportOrdersCsv { range }` (streams CSV; PII export is audited) |

Every admin mutation writes `audit_logs` and calls `updateTag` for affected tags.

## 3. Route handlers

| Method & path | Caller | Auth | Behaviour |
|---|---|---|---|
| `GET/POST /api/auth/[...all]` | Better Auth client | — | Delegated to Better Auth (`toNextJsHandler`) |
| `POST /api/webhooks/razorpay` | Razorpay | HMAC `X-Razorpay-Signature` on **raw body** | Events: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, `refund.failed`. Dedupe by `x-razorpay-event-id` (doc 07 §5) |
| `POST /api/webhooks/shiprocket` | Shiprocket | `x-api-key` == `SHIPROCKET_WEBHOOK_TOKEN` (timing-safe) | Maps courier status → `OrderStatus`, appends history, notifies the customer on key transitions |
| `GET /api/cron/[job]` | Vercel Cron | `Authorization: Bearer ${CRON_SECRET}` | Jobs: `release-reservations`, `reconcile-payments`, `stock-alerts`, `birthday-coupons`, `cleanup`. See doc 13 §4 |
| `POST /api/upload` | Admin UI, account (review photos, return evidence) | Session + role, via `handleUpload` `onBeforeGenerateToken` | Issues a Blob client-upload token restricted by content type, max size, and pathname prefix; `onUploadCompleted` writes `media` |
| `GET /api/files/[...path]` | Browser | Session + ownership | Private blob (invoice, label, return evidence) → **302 to a short-lived signed URL**, `Cache-Control: no-store` |
| `GET /api/health` | Uptime monitor | — | `{ db: "ok", redis: "ok", version }` with no secrets; DB ping cached 30 s |
| `GET /api/feeds/google-merchant.xml` | Google Merchant Center | — | Product feed; cached (`"use cache"`, tag `products`) |

All route handlers export `export const runtime = "nodejs"` (implicit in Next 16) and set `maxDuration` explicitly (webhooks 30 s, cron 120 s).

## 4. Validation schemas (shared)

Lives in `src/schemas/`. Examples:

```ts
export const pincode = z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode");
export const phoneIN = z.string().transform(normaliseIndianPhone).pipe(z.string().regex(/^\+91[6-9]\d{9}$/));
export const addressInput = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneIN,
  line1: z.string().trim().min(5).max(120),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  stateCode: z.enum(GST_STATE_CODES),
  pincode,
});
export const giftMessage = z.string().trim().max(200).regex(/^[^<>]*$/, "No HTML please").optional();
export const sku = z.string().regex(/^AQ-[A-Z]{3}-\d{1,3}$/);
```

Rules: `.strict()` on every object (unknown keys rejected); strings trimmed and length-capped; numbers bounded; no `z.any()`.

## 5. Business services (domain layer)

| Service | Responsibilities |
|---|---|
| `pricingService` | Single function `priceCart(items, ctx) → Totals`. Used by cart, quote, and placeOrder. Pure and unit-tested with fixtures. Handles offers, coupon, shipping slab, COD fee, gift wrap, tax-inclusive GST split, round-off |
| `taxService` | `splitInclusiveGst(amountP, rateBps, isInterState)`; place-of-supply from shipping state vs `settings.stateCode` |
| `inventoryService` | `reserve`, `release`, `commitSale`, `restock`, `adjust`; all write `stock_movements` |
| `orderService` | `create` (transaction), `transition(orderId, to, actor)` enforcing the state machine (doc 07 §6), `cancel` |
| `paymentService` | Razorpay order create, verify, capture handling, refunds, reconciliation |
| `couponService` | `validate(code, cart, user)`, `reserve`, `consume`, `release` |
| `shippingService` | Serviceability (cached), create shipment, label, pickup, tracking map |
| `notificationService` | Email/SMS/WhatsApp dispatch with templates; never throws into the caller; logs failures |
| `invoiceService` | Mint the number on confirm; render PDF on demand (`@react-pdf/renderer`); cache the PDF in the private blob after first render |
| `reviewService`, `returnService`, `contentService`, `searchService`, `auditService` | — |

## 6. Search strategy (cost-efficient)

The catalogue is tiny (< 100 products), so the default implementation:
1. `getSearchIndex()` is a `"use cache"` function (tag `products`) returning a compact array: name, sign, rashi, element, note names, families, slug, and image.
2. Client-side fuzzy search with **Fuse.js** on that index (≈ 10–20 KB JSON, loaded when the search overlay opens). This gives instant results with zero per-keystroke function invocations.
3. `/search?q=` server page uses the same index for SEO and no-JS fallback.

Upgrade path: if the catalogue exceeds ~1,000 SKUs, move to **Atlas Search** (`$search` with autocomplete).

## 7. Idempotency & concurrency summary

| Operation | Mechanism |
|---|---|
| Place order (double click / retry) | `idempotencyKey` stored on the order (unique sparse index) → return the existing order |
| Stock | Conditional `$inc` with `stock >= qty` inside a transaction |
| Coupon global limit | Conditional `$inc` with `usedCount < usageLimit` |
| Payment capture | Unique `payment.razorpayPaymentId`; state transition `pending_payment → confirmed` is a conditional update on the current status |
| Webhooks | Insert-first into `webhook_events` (unique `_id`) |
| Refunds | Razorpay idempotency via `receipt`/notes plus unique `gatewayRefundId`; refund total ≤ paid enforced with a conditional update on `payment.refundedP` |
| Invoice number | Minted inside the same transaction as `confirmed` |
