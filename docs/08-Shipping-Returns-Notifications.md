# 08 — Shipping, Returns & Notifications

## 1. Shipping provider: Shiprocket

**Why an aggregator:** rate shopping across couriers, one API for serviceability/AWB/label/pickup/tracking, COD remittance handling, and NDR (non-delivery report) workflows.

### 1.1 Perfume is a dangerous good, which shapes courier choice

- Alcohol-based perfumes typically have a flash point ≤ 60 °C and are classified as **Class 3 flammable liquids** (IATA DGR for air; CMV Rules 1989 rr. 129–137 for road).
- **Default to surface (road) shipping.** Configure Shiprocket courier priority to surface services that accept perfumes. Air express is only via couriers that accept DG/limited-quantity perfume with proper declaration. **Confirm acceptance in writing with Shiprocket and each courier before launch.**
- Packaging: leak-proof sealed bottle, inner box, cushioning, outer corrugated box, orientation arrows, "Fragile" label, and any limited-quantity marks the courier requires.
- Product weight and dimensions on every variant (`weightG`, `dimensionsCm`) are mandatory. Wrong weights cause courier weight-dispute charges.
- International shipping is **out of scope** for v1 (DG air export documentation).

### 1.2 Integration

| Step | Shiprocket API | When |
|---|---|---|
| Auth | `POST /v1/external/auth/login` (API user) → token (~10 days) | Cached in Redis with a TTL slightly shorter than its expiry; refreshed on 401 |
| Serviceability | `GET /v1/external/courier/serviceability?pickup_postcode&delivery_postcode&weight&cod` | Product page / cart / checkout via `checkPincode`. **Redis cache 24 h** per `pincode:cod:weightBucket` |
| Create order | `POST /v1/external/orders/create/adhoc` | Admin "Create shipment" (or auto on `confirmed` if `autoShip` is on) |
| Assign AWB | `POST /v1/external/courier/assign/awb` | Right after create; recommended courier or by priority rules |
| Label | `POST /v1/external/courier/generate/label` | Label PDF copied to the **private** blob store (`labels/{orderId}.pdf`) |
| Pickup | `POST /v1/external/courier/generate/pickup` | Batch, daily cut-off 2 pm |
| Cancel | `POST /v1/external/orders/cancel` | On order cancel before pickup |
| Tracking | **Webhook** (Settings → API → Webhooks) with security token sent as `x-api-key` | Status updates; polling only as a fallback in the daily reconcile cron |

> Endpoint paths are from the Shiprocket API docs and helpsheet; verify against the current reference at apidocs.shiprocket.in during implementation.

### 1.3 Courier status → order status mapping

| Shiprocket status (examples) | Order status | Customer notified |
|---|---|---|
| `PICKUP SCHEDULED`, `PICKUP GENERATED` | `ready_to_ship` | — |
| `PICKED UP`, `SHIPPED`, `IN TRANSIT` | `shipped` | ✔ (first time only) |
| `OUT FOR DELIVERY` | `out_for_delivery` | ✔ |
| `DELIVERED` | `delivered` | ✔ + review request after 7 days |
| `UNDELIVERED` / NDR | (history only) | ✔ "Delivery attempt failed, reschedule" |
| `RTO INITIATED` | `rto_initiated` | ✔ |
| `RTO DELIVERED` | `rto_delivered` | — (admin QC task) |
| `CANCELLED` | (history only) | — |

Webhook handling: verify the token (timing-safe) → dedupe (`hash(awb + status + scanTime)`) → map → `orderService.transition` (ignores backwards moves) → append the latest scan → notify → 200.

### 1.4 Shipping charges

- Settings: `freeAbovePaise` (default ₹1,499), weight slabs (e.g. ≤ 500 g ₹79; ≤ 1 kg ₹99; each extra 500 g ₹40), optional express surcharge.
- The customer-facing ETA comes from serviceability `etd` plus a processing buffer (`+1 day` before 2 pm, `+2` after). Shown as a range ("Arrives 24–27 Oct").

## 2. Returns, replacements & cancellations policy

Perfume is a hygiene/personal-care product. Industry practice in India is **no returns for opened products**. The policy below is the default; legal review is required (doc 14).

| Situation | Allowed? | Window | Evidence | Resolution |
|---|---|---|---|---|
| Changed mind, unopened, seal intact | ✔ (optional, configurable; v1 default **off**) | 7 days | Photos of seal | Refund minus return shipping |
| Opened / used | ✘ | — | — | — |
| Damaged / leaked in transit | ✔ | **48 h** from delivery | **Unboxing video** + photos of box, bottle, and shipping label | Replacement (default) or refund |
| Wrong item / missing item | ✔ | 48 h | Unboxing video + photos | Ship the correct item; reverse pickup for the wrong one |
| Cancel before dispatch | ✔ | Until `ready_to_ship` | — | Full refund |
| Discovery sets / samples | Damage only | 48 h | Video | Replacement |

### 2.1 Return workflow

```
requested ─▶ approved ─▶ pickup_scheduled ─▶ received ─▶ (QC) ─▶ refunded | replaced ─▶ closed
     └─▶ rejected (reason shown to customer)
```

- Customers upload evidence through the Blob **client upload** (private store, `returns/{userId}/{returnId}/…`, video ≤ 50 MB, image ≤ 8 MB).
- For damage claims, reverse pickup is often unnecessary (leaked perfume). Admin can approve "no pickup required" and send the replacement directly.
- Replacement creates a ₹0 order linked via `replacementOrderId`, reserving stock normally.
- QC at receipt sets `restock[]` (`resellable` → `return_restock` movement; `damaged` → `write_off`).
- Courier damage claims: admin attaches the evidence to the Shiprocket dispute (manual in v1).

## 3. Notifications

### 3.1 Channels & providers

| Channel | Provider | Use | Compliance |
|---|---|---|---|
| Email | **Resend** + React Email | Transactional + marketing (separate streams/subdomains) | SPF, DKIM, DMARC on `mail.aaliqadr.com`; List-Unsubscribe header on marketing |
| SMS | **MSG91** | OTP, order/shipping updates | TRAI DLT: entity, header (sender ID), and every template registered |
| WhatsApp | WhatsApp Cloud API via a BSP (MSG91 / Interakt / Gupshup) | Order updates, abandoned cart (v1.1) | Template approval by Meta; opt-in required for marketing |
| Web push | (v2) | Back in stock, season drops | Opt-in |

### 3.2 Template catalogue

| Key | Trigger | Email | SMS | WA |
|---|---|---|---|---|
| `otp` | Login | ✔ | ✔ | — |
| `order_confirmed` | `markPaid` / COD confirm | ✔ | ✔ | ✔ |
| `payment_pending` | +20 min unpaid (with link) | ✔ | — | v1.1 |
| `order_shipped` | `shipped` | ✔ | ✔ | ✔ |
| `out_for_delivery` | OFD | — | ✔ | ✔ |
| `delivered` | delivered | ✔ | — | ✔ |
| `review_request` | delivered + 7 d | ✔ | — | — |
| `order_cancelled` | cancel | ✔ | ✔ | — |
| `refund_update` | refund initiated/processed | ✔ | ✔ | — |
| `return_update` | each return status | ✔ | — | — |
| `back_in_stock` | stock alert | ✔ | — | — |
| `newsletter_confirm` | subscribe | ✔ | — | — |
| `birthday_offer` | 1st of birth month (consented) | ✔ | — | v1.1 |
| `season_launch` | sun enters a sign (consented subscribers of that sign) | ✔ | — | — |
| `admin_new_order` / `admin_low_stock` / `admin_return_request` | ops | ✔ | — | — |

Email design: themed by the order's primary sign (header gradient from that sign's tokens), dark-mode safe, ≤ 100 KB HTML, images from the Blob CDN, and a plain-text part.

### 3.3 Dispatch rules

- `notificationService.send(key, to, data)` **never throws** to callers. Failures are logged (Sentry breadcrumb) and retried once.
- Sent from Server Actions/webhooks with Next's `after()` so the HTTP response isn't delayed.
- De-duplication: `notifications_sent` key `{orderId}:{templateKey}` in Redis (TTL 7 d) prevents double emails when callback and webhook race.
- Marketing sends check the latest `consents` row for that purpose and channel. Transactional messages don't need marketing consent.
- Quiet hours for SMS/WA marketing: 9 pm – 9 am IST blocked.
