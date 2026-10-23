# 04 — Database Schema (MongoDB Atlas + Mongoose)

## 1. Conventions

| Rule | Detail |
|---|---|
| **Money** | Integer **paise** (`priceP: 249900` = ₹2,499). Field suffix `P` makes it obvious. Conversion happens only in `lib/money.ts` |
| **IDs** | Customer-facing documents get a human-readable `_id` from the atomic `counters` collection: orders `AQ-100001`, returns `RT-10001`, invoices `INV/2026-27/00001`. Internal documents use ObjectId |
| **Timestamps** | `{ timestamps: true }` everywhere; stored UTC; displayed in IST via `lib/datetime.ts` |
| **Snapshots** | Orders copy product title, variant, price, tax rate, image, and sign at purchase time. Never re-read the catalogue to render an old order |
| **Append-only** | `orders.history[]`, `stock_movements`, `audit_logs`, `webhook_events`, `consents` are never edited, only appended |
| **Sensitive fields** | `select: false` on anything not needed for display (cost price, internal notes, raw gateway payloads) |
| **Soft delete** | Products are `status: "archived"`, never deleted (orders reference them) |
| **Indexes** | `autoIndex: false` in production; `npm run db:sync-indexes` runs `Model.syncIndexes()` for every model on deploy (doc 13). Some indexes are **correctness** (unique), not performance |
| **Schema validation** | Mongoose validation plus Zod at the edge. Enums are TypeScript `as const` arrays shared by both |

## 2. Connection (serverless-safe)

```ts
// src/server/db/connect.ts
import "server-only";
import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions"; // Fluid compute: drain idle pool before suspend
import { env } from "@/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (g.__mongoose ??= { conn: null, promise: null });

export async function db() {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,          // per instance; Fluid shares one instance across concurrent requests
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 20_000,
    autoIndex: process.env.NODE_ENV !== "production",
    bufferCommands: false,    // fail fast instead of queueing when disconnected
  }).then((m) => {
    attachDatabasePool(m.connection.getClient()); // verify MongoClient support in current @vercel/functions docs
    return m;
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
```

- Atlas tier: start on **Flex** (or M0 for dev). Move to **M10** before launch for backups, point-in-time restore, and no throttling (doc 13).
- Network access: Vercel egress IPs are dynamic, so allow `0.0.0.0/0` **with** a strong DB user password and TLS, or use Vercel Secure Compute on Enterprise. Use a dedicated DB user with `readWrite` on the app DB only.
- Transactions require a replica set (all Atlas tiers are). Use `session.withTransaction()` for order creation, payment capture, and return refunds.
- Better Auth uses the **same** `MongoClient` (`mongoose.connection.getClient()`), so there is one pool, not two.

## 3. Collection map

| Collection | Purpose | Approx. size (yr 1) |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth managed (extended fields on `user`) | 50k |
| `addresses` | Customer address book | 60k |
| `products` | Fragrances, bundles, gift sets with variants | < 100 |
| `collections` | Curated groupings | < 30 |
| `inventory_batches` | Batch / lot, manufacture & expiry dates per variant | < 1k |
| `stock_movements` | Append-only stock ledger | 200k |
| `carts` | Server carts (logged-in + guest by cart token) | 100k (TTL) |
| `orders` | Orders with snapshots, payment, shipment, history | 30k |
| `payments` | Every gateway attempt / refund | 40k |
| `webhook_events` | Dedupe log for Razorpay and Shiprocket | 200k (TTL 90 d) |
| `coupons`, `coupon_redemptions` | Offers and per-customer usage | small / 30k |
| `reviews` | Verified reviews | 5k |
| `returns` | Damage / wrong-item claims | < 1k |
| `wishlists` | Saved products | 20k |
| `stock_alerts` | Back-in-stock subscriptions | 5k |
| `newsletter` | Subscribers with double opt-in | 30k |
| `consents` | DPDP consent ledger | 100k |
| `content` | CMS blocks: home sections, banners, FAQs, policies, sign copy | < 500 |
| `posts` | Journal articles | < 300 |
| `media` | Registry of every uploaded blob (for orphan sweeping) | 5k |
| `settings` | Singleton store configuration | 1 |
| `counters` | Atomic sequences | ~5 |
| `audit_logs` | Admin actions | 50k (TTL 2 y) |

## 4. Schemas

> Shapes are written as TypeScript interfaces plus the indexes. Mongoose schemas mirror them 1:1.

### 4.1 `user` (Better Auth core + additional fields)

```ts
interface User {
  id: string; email: string; emailVerified: boolean; name: string; image?: string;
  // additionalFields:
  phone?: string;                 // E.164, unique sparse
  phoneVerified?: boolean;
  role: "customer" | "staff" | "admin" | "owner";
  dob?: string;                   // "YYYY-MM-DD", encrypted at rest (doc 06 §8)
  zodiacSign?: ZodiacSlug;        // chosen or derived
  zodiacSystem?: "western" | "vedic";
  marketingOptIn: { email: boolean; sms: boolean; whatsapp: boolean; updatedAt: Date };
  status: "active" | "blocked" | "deleted";
  codBlocked?: boolean;           // set after repeated RTO
  createdAt: Date; updatedAt: Date;
}
```
Indexes: `{ email: 1 } unique` (Better Auth), `{ phone: 1 } unique sparse`, `{ role: 1 }`, `{ zodiacSign: 1 }`, `{ "dobMonth": 1 }` (derived field for birthday campaigns).

### 4.2 `addresses`

```ts
interface Address {
  _id: ObjectId; userId: string;
  label?: "Home" | "Work" | "Other";
  fullName: string; phone: string;
  line1: string; line2?: string; landmark?: string;
  city: string; state: string; stateCode: string;   // GST state code, e.g. "27"
  pincode: string;                                  // /^[1-9][0-9]{5}$/
  country: "IN";
  isDefault: boolean;
}
```
Indexes: `{ userId: 1, isDefault: -1 }`. Max 10 per user (service-enforced).

### 4.3 `products`

```ts
interface Product {
  _id: ObjectId;
  slug: string;                         // "ember-crown-aries", unique
  type: "fragrance" | "bundle" | "gift_set" | "body_care" | "accessory";   // body_care = existing lotion line (brand theme, no sign)
  status: "draft" | "active" | "archived";
  name: string;                         // "Ember Crown"
  tagline: string;
  zodiacSign?: ZodiacSlug;              // required for type=fragrance; drives the theme
  element?: Element;                    // denormalised from sign for filtering
  concentration?: "extrait" | "edp" | "edt";
  description: string;                  // sanitised rich text (HTML allowlist)
  story?: string;
  notes: { top: Note[]; heart: Note[]; base: Note[] };   // Note = { name, family, icon? }
  noteFamilies: string[];               // ["spicy","amber","floral"] for filters
  profile: { intensity: 1|2|3|4|5; longevityHours: [number, number]; sillage: 1|2|3|4|5; season: string[]; timeOfDay: ("day"|"night")[] };
  howToWear?: string;
  ingredients?: string;                 // INCI list
  allergens?: string[];                 // EU 26 / IFRA declarables
  compatibleSigns?: ZodiacSlug[];
  variants: Variant[];
  bundleItems?: { productId: ObjectId; variantSku: string; qty: number }[]; // for bundles
  media: Media[];                       // ordered; first = primary
  video?: { url: string; posterUrl: string; durationS: number };
  themeOverride?: Partial<ZodiacTheme>; // limited editions only
  legal: {                              // Legal Metrology declarations (doc 14)
    manufacturer: string; packer?: string; importer?: string;
    countryOfOrigin: string; genericName: string; // "Eau de Parfum"
    customerCareRef: "default" | string;
  };
  hsnCode: string;                      // "33030050"
  gstRateBps: number;                   // 1800 = 18.00 %
  seo: { title?: string; description?: string; ogImage?: string; keywords?: string[] };
  ratingAvg: number; ratingCount: number; // denormalised from approved reviews
  salesCount: number;                   // for "best-sellers"
  sortOrder: number;
  publishedAt?: Date;
  createdAt: Date; updatedAt: Date;
}

interface Variant {
  sku: string;                          // "AQ-ARI-50", unique across products
  label: string;                        // "50 ml"
  volumeMl: number;
  mrpP: number;                         // printed MRP, paise, inclusive of all taxes
  priceP: number;                       // selling price, paise (≤ mrpP)
  costP?: number;                       // select:false
  stock: number;                        // sellable on hand (excludes reserved)
  reserved: number;                     // held by unpaid orders
  lowStockThreshold: number;
  weightG: number;                      // shipping weight incl. packaging
  dimensionsCm: { l: number; b: number; h: number };
  barcode?: string;                     // EAN-13 if registered with GS1
  isActive: boolean;
  codAllowed: boolean;
  maxPerOrder: number;                  // anti-hoarding, default 5
}

interface Media { url: string; pathname: string; alt: string; width: number; height: number; blurDataURL: string; kind: "image" | "video"; role?: "hero" | "bottle" | "box" | "texture" | "lifestyle" }
```

Indexes:
- `{ slug: 1 } unique`
- `{ "variants.sku": 1 } unique` (multikey; also enforce in service)
- `{ status: 1, type: 1, sortOrder: 1 }`
- `{ status: 1, zodiacSign: 1 }`, `{ status: 1, element: 1 }`, `{ status: 1, noteFamilies: 1 }`
- `{ status: 1, salesCount: -1 }`
- Text index `{ name: "text", tagline: "text", "notes.top.name": "text", "notes.heart.name": "text", "notes.base.name": "text", noteFamilies: "text" }` with weights name 10, notes 5. *With < 100 products, search can also run fully in memory from a cached catalogue list. That is the cheaper default; see doc 05 §6*

**Atomic stock reservation** (no transaction needed for a single variant):

```ts
await Product.updateOne(
  { _id, variants: { $elemMatch: { sku, isActive: true, stock: { $gte: qty } } } },
  { $inc: { "variants.$.stock": -qty, "variants.$.reserved": qty } },
  { session }
); // matchedCount === 0 → out of stock → abort transaction
```

### 4.4 `inventory_batches`

```ts
interface InventoryBatch {
  _id: ObjectId; productId: ObjectId; sku: string;
  batchNo: string; mfgDate: Date; expiryDate?: Date;     // perfumes: "best before" commonly 36–60 months
  qtyReceived: number; qtyRemaining: number; receivedAt: Date; notes?: string;
}
```
Index: `{ sku: 1, mfgDate: 1 }` (FIFO allocation at dispatch). The batch number is printed on the packing slip so complaints can be traced.

### 4.5 `stock_movements` (append-only ledger)

```ts
interface StockMovement {
  _id: ObjectId; sku: string; productId: ObjectId;
  type: "receive" | "reserve" | "release" | "sale" | "return_restock" | "write_off" | "adjust";
  qty: number;                          // signed
  ref?: { kind: "order" | "return" | "batch" | "manual"; id: string };
  actor: { userId?: string; name: string; role: "system" | "staff" | "admin" | "owner" };
  reason?: string;
  createdAt: Date;
}
```
Index: `{ sku: 1, createdAt: -1 }`, `{ "ref.id": 1 }`. A nightly job reconciles `sum(movements)` against `variant.stock + reserved` and alerts on drift.

### 4.6 `collections`

```ts
interface Collection { _id: ObjectId; slug: string; title: string; description?: string; kind: "manual" | "element" | "rule";
  productIds?: ObjectId[]; rule?: { element?: Element; noteFamily?: string; type?: Product["type"] };
  hero?: Media; themeSign?: ZodiacSlug; seo: Product["seo"]; isActive: boolean; sortOrder: number }
```
Index: `{ slug: 1 } unique`, `{ isActive: 1, sortOrder: 1 }`.

### 4.7 `carts`

```ts
interface Cart {
  _id: ObjectId;
  userId?: string;                       // logged-in
  token?: string;                        // guest cart id (httpOnly cookie), random 32 bytes
  items: { productId: ObjectId; sku: string; qty: number; addedAt: Date }[];  // no prices stored
  couponCode?: string;
  gift?: { wrap: boolean; message?: string; hidePrice: boolean };
  updatedAt: Date; expiresAt: Date;      // TTL: 30 d guest, 90 d user
}
```
Indexes: `{ userId: 1 } unique sparse`, `{ token: 1 } unique sparse`, `{ expiresAt: 1 } expireAfterSeconds: 0`.
Prices are **never** stored in the cart; they are computed on read from `products`.

### 4.8 `orders`

```ts
interface Order {
  _id: string;                           // "AQ-100001"
  userId?: string; guestEmail?: string;  // guest checkout
  contact: { name: string; email: string; phone: string };
  shippingAddress: AddressSnapshot; billingAddress: AddressSnapshot;
  items: OrderItem[];
  pricing: {
    subtotalP: number;                   // sum(unitPriceP * qty)
    discountP: number; couponCode?: string;
    shippingP: number; codFeeP: number; giftWrapP: number;
    taxableP: number; cgstP: number; sgstP: number; igstP: number;  // tax-inclusive breakdown
    roundOffP: number; totalP: number;
  };
  placeOfSupply: { stateCode: string; isInterState: boolean };
  gift?: { wrap: boolean; message?: string; hidePrice: boolean };
  status: OrderStatus;
  payment: {
    method: "razorpay" | "cod";
    status: "pending" | "authorized" | "paid" | "failed" | "refunded" | "partially_refunded";
    razorpayOrderId?: string; razorpayPaymentId?: string;
    paidAt?: Date; refundedP: number;
  };
  shipment?: {
    provider: "shiprocket"; srOrderId?: string; srShipmentId?: string;
    awb?: string; courier?: string; trackingUrl?: string; labelPath?: string; // private blob
    etaDate?: Date; shippedAt?: Date; deliveredAt?: Date; lastScan?: { status: string; location?: string; at: Date };
  };
  invoice?: { number: string; issuedAt: Date; pdfPath?: string };
  reservationExpiresAt?: Date;           // for unpaid online orders
  history: { at: Date; status: OrderStatus | string; note?: string; actor: { name: string; role: string; userId?: string }; visibleToCustomer: boolean }[];
  source: { utm?: Record<string, string>; device?: "mobile" | "desktop" | "tablet"; ipHash?: string };
  notesInternal?: string;                // select:false
  createdAt: Date; updatedAt: Date;
}

type OrderStatus =
  | "pending_payment" | "confirmed" | "processing" | "ready_to_ship" | "shipped"
  | "out_for_delivery" | "delivered" | "cancelled" | "rto_initiated" | "rto_delivered" | "returned";

interface OrderItem {
  productId: ObjectId; sku: string; name: string; variantLabel: string; zodiacSign?: ZodiacSlug;
  image: string; qty: number; mrpP: number; unitPriceP: number; lineDiscountP: number;
  hsnCode: string; gstRateBps: number; batchNo?: string;
}
```

Indexes:
- `{ userId: 1, createdAt: -1 }`
- `{ "contact.email": 1, createdAt: -1 }` (guest lookup / track page)
- `{ status: 1, createdAt: -1 }` (admin queue)
- `{ "payment.razorpayOrderId": 1 } unique sparse` (**correctness**: one order per gateway order)
- `{ "payment.razorpayPaymentId": 1 } unique sparse` (**correctness**: a payment can pay only one order)
- `{ "shipment.awb": 1 } sparse`
- `{ status: 1, reservationExpiresAt: 1 }` partial on `status: "pending_payment"` (release sweep)

### 4.9 `payments`

```ts
interface Payment {
  _id: ObjectId; orderId: string; kind: "payment" | "refund";
  gateway: "razorpay"; gatewayOrderId?: string; gatewayPaymentId?: string; gatewayRefundId?: string;
  amountP: number; currency: "INR"; status: string; method?: string; // upi/card/netbanking/wallet
  feeP?: number; taxOnFeeP?: number;
  errorCode?: string; errorReason?: string;
  raw?: unknown;                          // select:false, gateway payload for audit
  createdAt: Date;
}
```
Indexes: `{ orderId: 1 }`, `{ gatewayPaymentId: 1, kind: 1 } unique sparse`, `{ gatewayRefundId: 1 } unique sparse`.

### 4.10 `webhook_events`

```ts
interface WebhookEvent { _id: string /* provider:eventId */; provider: "razorpay" | "shiprocket"; type: string; receivedAt: Date; processedAt?: Date; error?: string; expiresAt: Date }
```
The `_id` is the dedupe key (Razorpay: `x-razorpay-event-id`; Shiprocket: `awb + current_status + scan timestamp` hash). Insert first; a duplicate-key error means "already handled" and the endpoint returns 200. TTL index on `expiresAt` (90 d).

### 4.11 `coupons` & `coupon_redemptions`

```ts
interface Coupon {
  _id: ObjectId; code: string;           // uppercase, unique
  kind: "percent" | "flat" | "free_shipping" | "free_gift";
  valueBps?: number; valueP?: number; maxDiscountP?: number;
  minSubtotalP: number;
  appliesTo: { productIds?: ObjectId[]; signs?: ZodiacSlug[]; types?: Product["type"][]; excludeBundles?: boolean };
  audience: "all" | "first_order" | "birthday" | "specific_users";
  userIds?: string[];
  startsAt: Date; endsAt: Date;
  usageLimit?: number; perUserLimit: number; usedCount: number;
  freeGiftSku?: string;
  isActive: boolean; stackable: false;
}
interface CouponRedemption { _id: ObjectId; couponId: ObjectId; code: string; userId?: string; email: string; orderId: string; discountP: number; createdAt: Date; status: "reserved" | "consumed" | "released" }
```
Indexes: `coupons { code: 1 } unique`; `coupon_redemptions { couponId: 1, email: 1, status: 1 }`, `{ orderId: 1 } unique`.
Global `usageLimit` is enforced with a conditional `$inc` (`usedCount: { $lt: usageLimit }`) inside the order transaction.

### 4.12 `reviews`

```ts
interface Review { _id: ObjectId; productId: ObjectId; userId: string; orderId: string; authorName: string; authorSign?: ZodiacSlug;
  rating: 1|2|3|4|5; title: string; body: string; photos: Media[]; longevity?: 1|2|3|4|5; sillage?: 1|2|3|4|5;
  status: "pending" | "approved" | "rejected"; adminReply?: string; helpfulCount: number; createdAt: Date }
```
Indexes: `{ productId: 1, userId: 1 } unique`, `{ productId: 1, status: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`.
Approving or rejecting recomputes `products.ratingAvg/ratingCount` with an aggregation, then `updateTag('reviews:'+id)`.

### 4.13 `returns`

```ts
interface ReturnRequest {
  _id: string;                            // "RT-10001"
  orderId: string; userId?: string;
  type: "damaged" | "leaked" | "wrong_item" | "missing_item";
  items: { sku: string; qty: number }[];
  evidence: { pathname: string; kind: "image" | "video" }[];  // private blob
  description: string;
  status: "requested" | "approved" | "rejected" | "pickup_scheduled" | "received" | "refunded" | "replaced" | "closed";
  resolution?: "refund" | "replacement";
  refund?: { amountP: number; mode: "source" | "bank"; paymentRefundId?: string; refundedAt?: Date };
  replacementOrderId?: string;
  restock: { sku: string; qty: number; condition: "resellable" | "damaged" }[];
  history: Order["history"];
  createdAt: Date;
}
```
Indexes: `{ orderId: 1 }`, `{ status: 1, createdAt: -1 }`, `{ userId: 1, createdAt: -1 }`.

### 4.14 Engagement

```ts
interface Wishlist   { _id: ObjectId; userId: string; productIds: ObjectId[]; updatedAt: Date }        // { userId: 1 } unique
interface StockAlert { _id: ObjectId; sku: string; email: string; userId?: string; notifiedAt?: Date; createdAt: Date } // { sku:1, email:1 } unique; { sku:1, notifiedAt:1 }
interface Newsletter { _id: ObjectId; email: string; status: "pending" | "subscribed" | "unsubscribed"; tokenHash: string; zodiacSign?: ZodiacSlug; source: string; consentAt?: Date } // { email:1 } unique
interface Consent    { _id: ObjectId; subject: { userId?: string; email?: string; phone?: string }; purpose: "marketing_email" | "marketing_sms" | "marketing_whatsapp" | "analytics_cookies" | "dob_personalisation";
                       granted: boolean; noticeVersion: string; channel: "web" | "checkout" | "account"; ipHash: string; at: Date } // append-only; { "subject.userId":1, purpose:1, at:-1 }
```

### 4.15 Content

```ts
interface Content { _id: ObjectId; key: string;   // "home.hero", "faq.shipping", "policy.returns", "sign.aries.story"
  kind: "hero" | "section" | "faq" | "policy" | "banner" | "sign_copy" | "announcement";
  data: unknown;                                    // validated by a Zod schema per kind
  status: "draft" | "published"; version: number; publishedAt?: Date; updatedBy: string }   // { key:1, status:1 } unique
interface Post { _id: ObjectId; slug: string; title: string; excerpt: string; body: string; cover: Media; tags: string[]; signs: ZodiacSlug[];
  author: string; status: "draft" | "published"; publishedAt?: Date; seo: Product["seo"] }  // { slug:1 } unique; { status:1, publishedAt:-1 }
```

### 4.16 System

```ts
interface Media    { _id: ObjectId; pathname: string; url?: string; store: "public" | "private"; contentType: string; size: number; width?: number; height?: number;
                     ownerKind: "product" | "post" | "content" | "review" | "return" | "invoice" | "label"; ownerId?: string; uploadedBy: string; createdAt: Date } // { pathname:1 } unique; { ownerKind:1, ownerId:1 }
interface Settings { _id: "store"; storeName: string; legalName: string; gstin: string; stateCode: string; address: string;
                     support: { email: string; phone: string; whatsapp?: string; hours: string };
                     grievanceOfficer: { name: string; designation: string; email: string; phone: string };
                     shipping: { freeAbovePaise: number; slabs: { uptoG: number; pricePaise: number }[]; expressSurchargeP?: number };
                     cod: { enabled: boolean; maxOrderP: number; feeP: number; blockedPincodes: string[] };
                     giftWrapP: number; reservationMinutes: number; returnWindowHours: number; maintenanceMode: boolean }
interface Counter  { _id: "order" | "return" | "invoice:2026-27"; seq: number }
interface AuditLog { _id: ObjectId; actor: { userId: string; name: string; role: string }; action: string; entity: { kind: string; id: string };
                     diff?: { before?: unknown; after?: unknown }; ip?: string; ua?: string; at: Date } // { "entity.kind":1, "entity.id":1, at:-1 }; { at:1 } TTL 2y
```

**ID generation**

```ts
export async function nextId(key: Counter["_id"], session?: ClientSession) {
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return c.seq;
}
// order: `AQ-${100000 + seq}` ; invoice: `INV/${fy}/${String(seq).padStart(5,"0")}` (FY resets: new counter key per FY)
```

Invoice numbers must be **consecutive and unique per financial year** (GST rule). They are minted only when an order becomes `confirmed`, never at cart time, so there are no gaps from abandoned checkouts.

## 5. Query performance rules

1. Every list query uses a **projection** (`.select()`) and `.lean()`.
2. Admin lists use **range pagination** (`createdAt < cursor`), never `skip` on large collections.
3. Storefront reads go through `server/queries/*` wrapped in `"use cache"` + `cacheTag`, so most pageviews cause **zero** DB reads.
4. Aggregations for dashboards run on the Atlas secondary (`readPreference: "secondaryPreferred"`) once on M10+.
5. Profile slow queries with Atlas Performance Advisor monthly; there is a budget of < 50 ms p95 per query.

## 6. Seed & migration scripts

| Script | Purpose |
|---|---|
| `db:sync-indexes` | `syncIndexes()` for all models. Run on every production deploy (doc 13) |
| `db:seed` | 12 fragrances, discovery coffret, element trios, settings, content keys, an owner admin user |
| `db:reconcile-stock` | Compares ledger to variant counters |
| `payments:reconcile` | Fetches Razorpay payments for the last N days and repairs any order still `pending_payment` with a captured payment |
| `blobs:sweep-orphans` | Report-only by default; deletes blobs not referenced in `media` with `--apply` |
| `privacy:erase-user` | DPDP erasure: anonymises PII on user, addresses, orders (keeps tax-required fields) |
