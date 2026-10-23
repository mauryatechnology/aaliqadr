# 06 — Authentication, Authorisation & Security

Target: **OWASP ASVS v4 Level 2** for authentication, session management, access control, and payment flows; **OWASP Top 10 (2021/2025)** mitigations across the app.

---

## 1. Assets & threats

| Asset | Threat | Primary control |
|---|---|---|
| Customer PII (name, phone, address, DOB) | Data leak, IDOR, scraping | Ownership checks, encryption of DOB, least-privilege DB user, rate limits |
| Orders & payments | Price tampering, replay, double capture, fake "paid" callbacks | Server-side pricing, HMAC verification, gateway fetch confirmation, idempotency |
| Stock | Bot hoarding of limited editions | `maxPerOrder`, reservation expiry, Turnstile on checkout for anomalies |
| Admin panel | Account takeover, privilege escalation | Passkey/TOTP 2FA mandatory for staff, role checks on the server, audit log |
| Coupons | Brute-forcing codes, abuse | Rate limit on `applyCoupon`, per-user limits, codes ≥ 8 chars for private ones |
| Webhook endpoints | Forged events | Signature/token verification on the raw body, timing-safe compare |
| Blob storage | Public exposure of invoices/evidence | Separate **private** store; access only via auth-checked signed redirect |
| Secrets | Leak via client bundle or logs | `server-only` imports, env validation, Sentry data scrubbing |
| Availability | Cost-exhaustion (DoS on functions) | CDN caching, Vercel Firewall/WAF rules, rate limits, spend management |

## 2. Authentication (Better Auth)

**Methods (customers):**
1. **Email OTP** (6 digits, 10 min expiry, max 5 attempts, resend cooldown 60 s)
2. **Phone OTP** via MSG91 DLT template (same limits)
3. **Google** OAuth (PKCE)

No passwords in v1, so there is no password storage, reset, or stuffing surface.

**Staff/admin:**
- Same login plus **mandatory second factor**: passkey (WebAuthn, preferred) or TOTP. Enforced by a guard: `role !== "customer" && !session.twoFactorVerified` → redirect to the 2FA challenge.
- Staff accounts are invite-only (an owner creates them). A customer can never self-elevate; `role` is not writable through any profile action.

**Configuration essentials**

```ts
// src/server/auth.ts (shape)
export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.getClient().db()),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.NEXT_PUBLIC_SITE_URL],
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300 } },
  advanced: { useSecureCookies: true, cookiePrefix: "aq", defaultCookieAttributes: { sameSite: "lax", httpOnly: true, secure: true } },
  rateLimit: { enabled: true, storage: "secondary-storage" },   // Upstash via secondaryStorage
  user: { additionalFields: { role: { type: "string", input: false, defaultValue: "customer" }, /* phone, dob… */ } },
  socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
  plugins: [emailOTP({ /* send via Resend */ }), phoneNumber({ /* send via MSG91 */ }), twoFactor(), passkey(), nextCookies()],
});
```

- **Session lifetime:** customers 30 days sliding; staff 12 hours absolute, re-auth required for owner-only actions (refunds > ₹10,000, settings, staff management): "step-up" with a fresh 2FA within 10 min.
- **Session revocation:** on role change, block, or 2FA reset, all sessions for that user are deleted.
- **Account linking:** Google and email OTP for the same verified email link automatically. Phone-only accounts must verify an email before an invoice can be emailed.
- **OTP abuse:** per phone 5/hour and per IP 20/hour (Upstash). SMS pumping protection: block non-Indian numbers (`+91` only) and require Turnstile after 2 sends.

## 3. Authorisation

### 3.1 Roles

| Role | Can |
|---|---|
| `customer` | Own profile, addresses, orders, reviews, returns, wishlist |
| `staff` | Orders (view, pack, ship), returns (receive), reviews (moderate), content (edit drafts); **no** refunds, settings, staff, or exports with PII |
| `admin` | Everything staff can, plus products, inventory, coupons, refunds ≤ ₹10,000, publishing content, customer management |
| `owner` | Everything, plus settings, staff management, refunds of any amount, PII exports, data erasure |

### 3.2 Enforcement rules

1. **Every** server action and route handler checks auth on the server. UI hiding is cosmetic only.
2. Guards: `requireUser()`, `requireRole("admin")`, `requirePermission("refund", { amountP })`.
3. **Ownership in the query, not after it:** `Order.findOne({ _id: orderId, userId: session.user.id })`. Never fetch by ID and compare afterwards (that still leaks timing and existence).
4. `proxy.ts` performs only a cheap **optimistic** check (session cookie present) to redirect `/account/*` and `/admin/*`. The authoritative check is always in the action, page, or handler (CVE-2025-29927 taught that middleware-only auth is unsafe).
5. Admin pages render `noindex` and live under `/admin`. Optionally restrict by Vercel Firewall IP allowlist or a country rule.

## 4. CSRF, CORS & request integrity

| Surface | Protection |
|---|---|
| Server Actions | Next.js compares `Origin` to `Host` automatically; POST only. Set `serverActions.allowedOrigins` to the production domain only |
| Better Auth endpoints | Built-in origin check against `trustedOrigins` |
| Webhooks | No cookies; authenticated by signature/token only |
| Cookies | `SameSite=Lax`, `Secure`, `HttpOnly` for session and cart token |
| CORS | No CORS headers emitted (same-origin app). Feeds are public GET only |

## 5. Input & output handling

- **Zod at every boundary** (`.strict()`, length caps). Mongo queries are built only from parsed values, never from raw objects. That blocks operator injection (`{ "$gt": "" }`). Do **not** enable Mongoose's global `sanitizeFilter`: it also wraps the app's own `$gte`/`$elemMatch`/`$expr` operators in `$eq`, which silently breaks conditional stock and coupon updates.
- **Rich text** (product description, journal) is authored by staff in a constrained editor (Tiptap) and **sanitised on save** with `sanitize-html` (allowlist: p, h2–h4, strong, em, a[href|rel], ul, ol, li, blockquote, img[src from our Blob host only]). Rendered with `dangerouslySetInnerHTML` only from sanitised fields.
- **User text** (reviews, gift message, return description) is plain text only; React escapes it. Gift messages printed on packing slips are also escaped in PDF rendering.
- **Uploads:** the content-type allowlist (`image/jpeg|png|webp|avif`, `video/mp4|webm` for return evidence), size caps (images 8 MB, video 50 MB), pathname prefix bound to the user (`returns/{userId}/…`). Server-side `onUploadCompleted` re-checks via `head()` and records `media`. Public images are re-encoded by the image pipeline (doc 12), which strips EXIF/GPS.
- **Open redirects:** `callbackURL`/`next` params accepted only if they are relative paths starting with a single `/`.
- **SSRF:** `next/image` `remotePatterns` restricted to our Blob host(s); no user-supplied URLs are fetched server-side.

## 6. HTTP security headers

Set in `next.config.ts` `headers()` for all routes (static, so cacheable pages stay cacheable):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` (and CSP `frame-ancestors 'none'`) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` (Razorpay / Google popups) |
| `Content-Security-Policy` | See below |

**CSP (allowlist, no nonce, which keeps pages static):**

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://challenges.cloudflare.com https://va.vercel-scripts.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com;
media-src 'self' https://*.public.blob.vercel-storage.com;
font-src 'self';
connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.ingest.sentry.io https://vitals.vercel-insights.com;
frame-src https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com;
form-action 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
upgrade-insecure-requests;
```

> Trade-off: a nonce-based strict CSP forces every page to render dynamically (each response needs a fresh nonce), which defeats PPR caching and raises cost. We accept `'unsafe-inline'` for scripts on the storefront, mitigated by having no user-generated HTML and strict sanitisation. **Admin and checkout** can opt into a nonce-based CSP via `proxy.ts`, since they are dynamic anyway. Verify the exact Razorpay domains against their current CSP guidance before launch.

## 7. Rate limiting (Upstash, sliding window)

| Tier | Limit | Applied to |
|---|---|---|
| `otp-send` | 5 / hour / phone-or-email; 20 / hour / IP | OTP send |
| `otp-verify` | 10 / 10 min / identifier | OTP verify |
| `coupon` | 10 / 10 min / session | `applyCoupon` |
| `checkout` | 10 / 10 min / user-or-IP | `placeOrder`, `retryPayment` |
| `search` | 60 / min / IP | server search |
| `public-write` | 5 / min / IP | contact, newsletter, stock alert, track order |
| `admin` | 120 / min / user | admin actions |

If Redis is unavailable, **fail open** for reads and search, and **fail closed** for OTP send (an SMS cost-abuse risk).

Edge protection: enable **Vercel Firewall** managed rules plus custom rules (block `/admin` for non-IN countries if desired, challenge excessive requests to `/api/*`, bot protection on checkout).

## 8. Data protection

| Data | At rest | In logs |
|---|---|---|
| Email, phone, name, address | Atlas encryption at rest (default) | Masked (`a***@g***.com`, `+91******3210`) |
| Date of birth | **Field-level AES-256-GCM** (`ENCRYPTION_KEY`), plus a derived non-sensitive `dobMonth` for campaigns | Never |
| Payment card / UPI data | **Never stored.** Razorpay Checkout handles it (we stay PCI-DSS SAQ-A) | Never |
| Gateway payloads | Stored `select:false` in `payments.raw` | IDs only |
| IP address | Stored as a salted SHA-256 hash only | Hash |

- Backups: Atlas continuous backup (M10+), 7-day point-in-time restore; a quarterly restore drill.
- Retention: orders and invoices 8 years (GST/Income Tax); marketing data until consent is withdrawn; OTP/verification rows TTL 1 day; webhook events 90 days; audit logs 2 years.
- Sentry: `sendDefaultPii: false`, `beforeSend` scrubs `email|phone|address|dob|otp|token|signature`.

## 9. Secrets management

- All secrets live in Vercel Environment Variables (Production / Preview / Development separated). **Preview uses Razorpay test keys and a separate DB.**
- `src/env.ts` validates them with Zod at boot. A missing variable **throws**; there are no fallback values (lesson FS-101 from the reference app).
- Rotation: webhook secrets and API keys yearly or on staff exit. Razorpay webhook secret rotation needs both old and new secrets accepted during the overlap (retries still carry old signatures).
- `.env*` in `.gitignore`; `gitleaks` in CI.

## 10. Payment security specifics

1. The amount and currency for Razorpay orders come **only** from `orders.pricing.totalP` computed server-side.
2. The client callback (`verifyPayment`) is a hint. The server verifies the HMAC `order_id|payment_id` with the key secret, **and** fetches the payment from the Razorpay API to confirm `status=captured` and `amount == order.totalP` before marking it paid.
3. The webhook is the source of truth for closed-tab cases; both paths converge on one idempotent `markPaid()`.
4. Auto-capture is enabled on Razorpay orders (`payment_capture: 1`) to avoid authorised-but-uncaptured payments expiring.
5. Refunds are owner/admin only, step-up authenticated, audited, and capped at the paid amount minus already refunded.

## 11. Security checklist (pre-launch)

- [ ] No secret has a fallback; `env.ts` passes in Production
- [ ] All `server/` files import `server-only`
- [ ] Every action uses the `action()` wrapper with an explicit `auth` level
- [ ] IDOR tests: customer A cannot read or modify customer B's order, address, return, invoice, or review
- [ ] Price-tamper test: modified client totals are ignored
- [ ] Webhook replay test: the same event twice gives one state change
- [ ] Forged webhook test: a bad signature returns 401 and nothing changes
- [ ] CSP passes on home, product, checkout (Razorpay modal works), and admin
- [ ] `securityheaders.com` grade A
- [ ] Staff 2FA enforced; owner step-up on refunds and settings
- [ ] Rate limits verified for OTP and coupon
- [ ] Private blobs are not reachable without a session
- [ ] `npm audit` / Dependabot clean of high/critical
- [ ] Sentry scrubbing verified with a test event containing PII
- [ ] Vercel Firewall rules and spend management enabled
