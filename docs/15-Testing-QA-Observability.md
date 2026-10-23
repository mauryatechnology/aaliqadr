# 15 — Testing, QA & Observability

## 1. Test pyramid

| Layer | Tool | Scope | Target |
|---|---|---|---|
| Unit | **Vitest** | `lib/*` (money, tax split, zodiac date→sign, slug), `pricingService`, `couponService.validate`, state machine transitions, Zod schemas | ≥ 90 % lines on `server/services` and `lib` |
| Integration | Vitest + **mongodb-memory-server** (replica set mode for transactions) | Services with a real Mongo: order creation, stock reservation concurrency, markPaid idempotency, refunds, returns, review aggregation | All money/stock paths |
| Contract | Vitest + recorded fixtures (MSW) | Razorpay, Shiprocket, Resend, MSG91 adapters: request shape and response mapping, signature verification with known vectors | Every integration |
| Component | Testing Library | Forms (checkout, address), VariantSelector, SignFinder, CartDrawer, accessibility roles | Critical UI |
| E2E | **Playwright** (Chromium, WebKit, mobile emulation) against the Preview deployment with Razorpay **test mode** | Journeys below | Must pass to deploy |
| Visual | Playwright screenshots per sign theme (12 product pages × mobile/desktop) | Theme regressions | Diff threshold 0.2 % |
| Performance | **Lighthouse CI** (budgets from doc 09 §9), `@next/bundle-analyzer` | Home, sign, product, shop, checkout | Fail the PR on budget breach |
| Accessibility | `@axe-core/playwright` on every E2E page; contrast script for all 12 palettes | WCAG 2.2 AA | Zero serious/critical |
| Security | `npm audit`, Dependabot, gitleaks, OWASP ZAP baseline on Preview (weekly) | — | No high/critical |
| Load | k6 (pre-launch and pre-sale): 200 concurrent checkouts on the staging DB | Stock correctness under load, p95 action latency < 800 ms | — |

## 2. Critical E2E journeys

1. Home → zodiac wheel → sign page → product → add to cart → guest checkout → UPI (test) success → confirmation → email received (Resend test inbox).
2. Same with payment failure → retry → success.
3. Close the tab after payment → simulate webhook → order confirmed; confirmation page later shows paid.
4. COD order with OTP → admin sees it → create shipment (Shiprocket sandbox/mock) → webhook statuses → delivered → review request.
5. Logged-in user: login by email OTP → saved address → coupon → pay → order history → invoice download (authorised) → another user cannot download it (403/404).
6. Return claim within 48 h with video upload → admin approves replacement → replacement order created.
7. Sign finder: boundary dates (e.g. 19/20 Apr), Vedic toggle path.
8. Admin: create product → upload images → publish → storefront reflects it within seconds (tag revalidation) → price change → old order keeps its snapshot price.
9. Reduced motion & keyboard-only checkout.
10. 320 px viewport full purchase.

## 3. Domain test cases that must exist (from docs 07/06)

- [ ] 20 concurrent orders for 5 units → exactly 5 succeed, stock = 0, reserved = 5
- [ ] Callback + webhook race → one `confirmed` transition, one invoice number, one email
- [ ] Webhook duplicate event ID → no-op 200
- [ ] Invalid webhook signature → 401, no DB change
- [ ] Amount mismatch between gateway and order → not marked paid, alert raised
- [ ] Reservation expiry with captured payment found → rescued, not cancelled
- [ ] Payment after cancel → re-reserve or auto-refund
- [ ] Coupon `usageLimit: 1` under concurrency → one redemption
- [ ] Partial refunds summing above paid → rejected
- [ ] IDOR on order, address, return, invoice, review
- [ ] GST split: intra-state vs inter-state; paise rounding never loses or gains a paisa (sum of lines == total)
- [ ] Price-tampered client payload ignored
- [ ] Invoice numbers consecutive per FY, with a new series on 1 April

## 4. QA checklists per release

**Functional:** all journeys above; admin flows; emails render in Gmail/Outlook/iOS Mail (light and dark).

**Visual/brand:** each of the 12 themes on product and sign pages: contrast, glow intensity, ambient layer, OG image, email header.

**Devices:** iPhone SE, iPhone 15/16, Pixel, low-end Android (Galaxy A-series, Chrome), iPad, Safari macOS, Chrome/Edge/Firefox desktop, 4K.

**SEO:** Rich Results Test on a product and a sign page; sitemap valid; canonical and robots correct; OG previews (WhatsApp, Instagram DM, X, LinkedIn).

**Performance:** Lighthouse mobile ≥ 90 performance on product/sign pages; field data after launch.

## 5. Observability

| Concern | Implementation |
|---|---|
| Error tracking | `@sentry/nextjs` (client, server, edge); `instrumentation.ts` with `onRequestError`; release tagged with the git SHA; source maps uploaded, not served |
| PII scrubbing | `beforeSend` removes `email`, `phone`, `address`, `dob`, `otp`, `signature`, `token` keys; `sendDefaultPii: false` |
| Tracing | Sentry performance at a 10 % sample (100 % for `/checkout` and webhooks) |
| Structured logs | `logger.info({ evt: "order.paid", orderId, reqId, source })`, never full objects with PII |
| Business events | `order.created`, `order.paid`, `payment.failed`, `refund.*`, `shipment.*`, `webhook.duplicate`, `reservation.released`, `reservation.rescued` |
| Health | `/api/health` checks DB ping (cached 30 s) and Redis |
| RUM | Vercel Speed Insights (CWV by route); Web Analytics |
| Dashboards | Sentry issues and performance; Vercel usage; Atlas metrics (connections, opcounters, slow queries) |

## 6. Definition of Done (every feature)

- [ ] Types strict, no `any`, Zod schema at the boundary
- [ ] Auth level declared; ownership enforced in the query
- [ ] Unit + integration tests for domain logic; E2E updated if the journey changed
- [ ] Cache tags assigned to reads and invalidated on writes
- [ ] Works at 320 px; keyboard and screen reader checked; reduced motion respected
- [ ] Within the page JS budget
- [ ] Metadata/JSON-LD updated if it is a public page
- [ ] No new env var without an `env.ts` entry and docs update
- [ ] Audit log entry for admin mutations
- [ ] Sentry clean on Preview
