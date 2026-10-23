# 07 — Checkout, Payments, Orders & Inventory

This is the money path. Every rule here exists to guarantee four properties:

1. **Correct price**: what the customer pays equals what the server computed from the database.
2. **Paid exactly once**: no double capture, no "paid but order missing", no "order paid twice".
3. **Never oversell**: stock can't go negative, even under concurrent checkouts.
4. **Self-healing**: closed tabs, dropped callbacks, and missed webhooks are repaired automatically.

---

## 1. Checkout UX flow (single page, 3 steps)

```
[Contact + Login-optional] → [Address + Pincode ETA] → [Delivery & Gift] → [Payment: UPI/Card/NB/Wallet | COD] → Pay
```

- Guest checkout allowed (email + phone required). An "Create account with one tap" OTP prompt appears after payment, never as a blocker.
- Address autofill from pincode (city/state lookup from a static India pincode→district JSON, ~1 MB, lazy-loaded; or the Shiprocket serviceability response).
- The quote is shown with a full breakdown: subtotal, discount, shipping, gift wrap, COD fee, "Inclusive of GST ₹X", and total.

## 2. Pricing algorithm (`pricingService.priceCart`)

All values are in paise. Prices are **GST-inclusive** (Indian retail MRP convention).

```
1. For each item: load variant (active, stock), unitPriceP = variant.priceP
2. lineTotalP = unitPriceP × qty
3. subtotalP = Σ lineTotalP
4. Automatic offers (from settings/content), e.g. "free 2 ml sample above ₹1,999" → adds a ₹0 line
5. Coupon (if any) → discountP, allocated pro-rata across eligible lines (needed for per-line GST)
6. shippingP = subtotalAfterDiscount ≥ freeAbove ? 0 : slab(totalWeightG)
7. giftWrapP = gift.wrap ? settings.giftWrapP : 0
8. codFeeP = method === "cod" ? settings.cod.feeP : 0
9. GST split (per line, on discounted line value; shipping/gift wrap/COD fee taxed at 18 %, verify with CA):
      taxable = round(gross × 10000 / (10000 + rateBps))
      tax     = gross − taxable
      interstate ? IGST = tax : CGST = floor(tax/2), SGST = tax − CGST
10. totalP = subtotalP − discountP + shippingP + giftWrapP + codFeeP; roundOffP to the nearest rupee if configured
11. quoteHash = sha256(JSON of {items, prices, coupon, shippingP, fees, totalP, settingsVersion})
```

`placeOrder` recomputes the quote. If `quoteHash` differs from what the client confirmed, it returns `PRICE_CHANGED` with the new quote, so the customer re-confirms. Prices never change silently.

## 3. Place order (Razorpay), sequence

```
Client                      Server (placeOrder)                       MongoDB (txn)                 Razorpay
  │  placeOrder(input) ───────▶│ auth? rate-limit, zod, idempotencyKey   │                               │
  │                            │ existing order with key? → return it    │                               │
  │                            │ priceCart() → compare quoteHash         │                               │
  │                            │ startTransaction ──────────────────────▶│                               │
  │                            │   reserve stock (conditional $inc)      │ variants.stock -= q, reserved += q
  │                            │   reserve coupon (conditional $inc)     │ usedCount < limit             │
  │                            │   insert order {pending_payment,        │                               │
  │                            │     reservationExpiresAt = now+30m}     │                               │
  │                            │   insert stock_movements(reserve)       │                               │
  │                            │ commit ◀────────────────────────────────│                               │
  │                            │ razorpay.orders.create({amount: totalP, currency: "INR",                │
  │                            │   receipt: orderId, notes: {orderId}}) ───────────────────────────────▶│
  │                            │ save payment.razorpayOrderId (unique)   │                               │
  │ ◀──── {orderId, rzp params}│                                         │                               │
  │ open Razorpay Checkout ───────────────────────────────────────────────────────────────────────────▶│
  │ ◀──────────────────────────────────────── handler(payment_id, order_id, signature) ────────────────│
  │ verifyPayment(...) ───────▶│ HMAC(order_id|payment_id, key_secret) == signature ?                   │
  │                            │ razorpay.payments.fetch(payment_id) → status captured, amount == totalP │
  │                            │ markPaid(orderId, payment) (idempotent, see §5)                        │
  │ ◀──── {status: paid} → redirect /order/AQ-100001/confirmation                                       │
                                              … meanwhile, independently …
Razorpay ── webhook order.paid / payment.captured ──▶ /api/webhooks/razorpay → markPaid() (no-op if already paid)
```

If the Razorpay order creation fails after commit, the order stays `pending_payment`; the client shows "Retry payment", which calls `retryPayment`. The cron releases it if it is never paid.

## 4. Coupon validation rules

In order, with the first failure returned as a reason code:

| Check | Reason code |
|---|---|
| Exists and `isActive` | `NOT_FOUND` |
| `startsAt ≤ now ≤ endsAt` | `EXPIRED` / `NOT_STARTED` |
| `subtotal ≥ minSubtotalP` (eligible lines only) | `MIN_NOT_MET` (include the shortfall amount in the message) |
| Audience: first order / birthday month / specific users | `NOT_ELIGIBLE` |
| `perUserLimit` against `coupon_redemptions` (by userId **or** email/phone for guests) | `ALREADY_USED` |
| Global `usedCount < usageLimit` | `EXHAUSTED` |
| At least one eligible line (sign/product/type filters, bundle exclusion) | `NOT_APPLICABLE` |

The redemption is **reserved** in the order transaction, **consumed** on payment or COD confirm, and **released** on cancel or expiry.

## 5. `markPaid()`: the single idempotent convergence point

```ts
async function markPaid(orderId: string, p: { razorpayOrderId; razorpayPaymentId; amountP; method; source: "callback" | "webhook" | "reconcile" }) {
  // 1. Guard amount & order linkage
  // 2. Atomic state transition: only from pending_payment (or from cancelled-by-expiry, see §7)
  const res = await Order.updateOne(
    { _id: orderId, "payment.razorpayOrderId": p.razorpayOrderId, status: "pending_payment" },
    { $set: { status: "confirmed", "payment.status": "paid", "payment.razorpayPaymentId": p.razorpayPaymentId, "payment.paidAt": new Date() },
      $unset: { reservationExpiresAt: 1 },
      $push: { history: { at: new Date(), status: "confirmed", actor: { name: "System", role: "system" }, note: `Paid via ${p.method} (${p.source})`, visibleToCustomer: true } } },
    { session }
  );
  if (res.modifiedCount === 0) return "already_processed";   // idempotent exit
  // 3. In the same transaction: reserved → sold (stock_movements: sale), coupon consumed, invoice number minted
  // 4. After commit: insert payments row (unique gatewayPaymentId), revalidate product tags, send confirmation (email + SMS/WA)
}
```

**Webhook handler** (`/api/webhooks/razorpay`):

```
1. raw = await req.text()                             // NEVER req.json() before verifying
2. verify HMAC-SHA256(raw, RAZORPAY_WEBHOOK_SECRET) == header x-razorpay-signature (timing-safe)
     → mismatch: 401
3. eventId = header x-razorpay-event-id
   insert webhook_events {_id: "razorpay:"+eventId} → duplicate key → 200 (already handled)
4. switch event:
     order.paid / payment.captured → markPaid(notes.orderId, …)
     payment.failed                → append history (customer-invisible), keep reservation until expiry (customer may retry)
     refund.processed / failed     → update payments + order.payment.refundedP/status
     default                       → 200 ignore
5. set processedAt; return 200 quickly (< 5 s). Heavy work (emails) is fire-and-forget via `after()`
```

Events can arrive **out of order** and **more than once**. Both `order.paid` and `payment.captured` lead to the same idempotent `markPaid`.

## 6. Order state machine

```
                ┌──────────── (expiry/cancel) ──────────┐
                ▼                                       │
 pending_payment ──paid──▶ confirmed ──▶ processing ──▶ ready_to_ship ──▶ shipped ──▶ out_for_delivery ──▶ delivered
       │                     │  ▲            │                │              │                                  │
       │ (COD placed)        │  └─ COD OTP ──┘                │              └──▶ rto_initiated ──▶ rto_delivered│
       └─────────▶ confirmed │                                │                                                 ▼
                             └──────── cancelled ◀────────────┘ (before handover only)                return flow (doc 08)
```

| From → To | Who | Side effects |
|---|---|---|
| `pending_payment → confirmed` | system (`markPaid`) or COD place | stock reserved→sold, coupon consumed, invoice minted, notify |
| `pending_payment → cancelled` | cron / customer | release stock & coupon (`release` movements) |
| `confirmed → processing` | staff (packing started) | — |
| `processing → ready_to_ship` | staff/system (`createShipment` OK) | AWB, label stored (private blob), pickup scheduled |
| `ready_to_ship → shipped → out_for_delivery → delivered` | Shiprocket webhook | notify on shipped, OFD, delivered; `deliveredAt` starts the return window |
| `confirmed/processing/ready_to_ship → cancelled` | customer (before RTS) / admin | release or restock; auto-refund if prepaid; cancel the Shiprocket order if created |
| `shipped → rto_initiated → rto_delivered` | webhook | on RTO delivered: restock after QC; COD RTO count++ (block COD after 2) |

Transitions are implemented as **one function** with a transition table; every transition appends `history` with the actor. Invalid transitions throw `CONFLICT`.

## 7. Reservation expiry & self-healing

| Mechanism | Frequency | Does |
|---|---|---|
| **Cron `release-reservations`** | Every 15 min (Vercel Pro) | Finds `pending_payment` orders with `reservationExpiresAt < now`. For each, **first** asks Razorpay `orders.fetchPayments(razorpayOrderId)`: if a captured payment exists → `markPaid` (rescues missed webhooks); else → cancel + release stock & coupon |
| **Lazy check** | On customer visit to `/account/orders` or the confirmation page | Same check for that customer's own pending orders (cheap, indexed) |
| **Cron `reconcile-payments`** | Daily 02:30 IST | Lists Razorpay captured payments for the last 48 h; any with `notes.orderId` not `confirmed` → `markPaid` or alert (paid after cancel) |
| **Late payment after cancel** | rare | If a payment is captured for an order already cancelled: try to re-reserve stock; if available → confirm; otherwise **auto-refund** and email an apology with a coupon. Never leave money captured without an order |

Reservation window: `settings.reservationMinutes` (default 30). Razorpay UPI intents can take a few minutes, so do not go below 20.

## 8. Cash on Delivery

- Enabled if `settings.cod.enabled`, the order total ≤ `maxOrderP`, all items have `codAllowed`, the pincode is COD-serviceable, the user is not `codBlocked`, and the pincode is not in `blockedPincodes`.
- Order created directly as `confirmed` (stock reserved → sold on confirm) **after phone OTP verification** (recommended; reduces fake orders and RTO).
- COD fee shown before confirmation.
- Remittance reconciliation: the Shiprocket COD remittance report is imported weekly (admin upload or API) and matched by AWB; mismatches are flagged.

## 9. Refunds

| Case | Path |
|---|---|
| Customer cancels a prepaid order before RTS | Auto full refund via `razorpay.payments.refund(paymentId, { amount, notes: { orderId, reason } })` |
| Damaged/leaked/wrong item (approved return) | Refund to source (prepaid) **or** replacement order at ₹0; COD orders: refund to UPI/bank details collected in the return form (encrypted, deleted after payout) |
| Partial refund (e.g. one of two items) | Amount = that line's paid amount incl. its share of discount (from snapshot) + proportional shipping if policy says so |
| Goodwill | Owner only, audited |

Every refund writes a `payments` row (`kind: "refund"`), updates `order.payment.refundedP` with a conditional guard (`refundedP + amount ≤ totalP`), appends history, and emails the customer. `refund.processed` webhook confirms the final status.

## 10. Inventory rules

- Stock is per variant (`sku`). Bundles (Discovery Coffret, Element Trios) have **their own SKU stock** (pre-packed). If assembled on demand, the bundle's availability = min of component availability, and reservation decrements components. **Decision for v1: pre-packed bundles with own stock** (simpler, matches physical reality).
- `stock` = available to sell; `reserved` = held by unpaid orders. Displayed availability = `stock`.
- Low stock: when `stock ≤ lowStockThreshold` → admin alert (email, daily digest) and the storefront shows "Only N left" when N ≤ 5.
- Back in stock: `stock` goes from 0 to > 0 → cron `stock-alerts` emails subscribers (batch of ≤ 100 per run, `notifiedAt` set).
- Receiving stock creates an `inventory_batches` row and a `receive` movement. Dispatch allocates batches FIFO by `mfgDate` and stores `batchNo` on order items.
- Nightly reconciliation compares ledger vs counters; drift → Sentry alert.

## 11. Invoices

- Generated for every confirmed order. Number format `INV/2026-27/00001`, sequential per financial year, minted at confirmation (no gaps).
- Contents (GST invoice for B2C): legal name, address, GSTIN of Aaliqadr; invoice number and date; customer name, address, and **place of supply (state + code)**; per line: description, HSN, qty, unit, taxable value, rate, CGST/SGST or IGST amounts; totals in figures **and words**; "Whether tax is payable on reverse charge: No"; authorised signatory. (Verify the final field list with the CA; doc 14.)
- PDF rendered on first request with `@react-pdf/renderer`, stored in the **private** blob store, and served via `/api/files/invoice/{orderId}` (ownership-checked → signed redirect).
- Gift orders with `hidePrice`: the **packing slip** has no prices; the invoice is emailed to the buyer, not put in the box.

## 12. Notifications on the money path

| Event | Email | SMS / WhatsApp |
|---|---|---|
| Order confirmed | ✔ (with summary + invoice link) | ✔ |
| Payment failed (customer still on site) | — (inline UI) | — |
| Pending payment reminder (+20 min) | ✔ with a "complete payment" link (only if consented or transactional-allowed) | optional |
| Cancelled | ✔ | ✔ |
| Refund initiated / processed | ✔ | ✔ |

## 13. Test matrix (must pass before launch)

- Concurrency: 20 parallel `placeOrder` for the last 5 units → exactly 5 succeed.
- Callback and webhook arriving simultaneously → one confirmation email, one invoice number.
- Webhook arrives before `verifyPayment` → confirmation page shows paid.
- Webhook never arrives, tab closed → cron rescues within 15 min.
- Tampered amount in the client → ignored.
- Payment captured after cancellation → re-confirm or auto-refund.
- Coupon with `usageLimit: 1`, 2 parallel orders → one succeeds.
- Refund twice (double click) → one refund.
- Razorpay test mode end-to-end for UPI success, UPI failure, card 3DS, netbanking.
