# 03 — Technical Architecture

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** App Router, `cacheComponents: true` | Partial Prerendering: static shell plus streamed dynamic islands; explicit `"use cache"` |
| Language | TypeScript 5.x, `strict: true`, `noUncheckedIndexedAccess: true` | — |
| Runtime | Node.js 22 LTS on **Vercel Fluid compute** | Next 16 requires ≥ 20.9; Fluid reuses instances, so connection pools survive |
| Bundler | Turbopack (default in 16) | 2–5× faster builds |
| React | 19.2 (View Transitions, `useEffectEvent`, `<Activity/>`) | Native page-transition morphs without heavy libs |
| React Compiler | `reactCompiler: true` | Auto-memoisation; fewer re-renders in animated UI |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`), CSS variables for zodiac tokens | Zero-runtime theming |
| UI primitives | shadcn/ui (Radix) copied into `components/ui` | Accessible, unstyled, owned code |
| Animation | Motion (`motion/react`), GSAP + ScrollTrigger (scroll stories only), Lenis (smooth scroll, desktop) | See doc 09 |
| Database | **MongoDB Atlas** (Mumbai `ap-south-1`) + Mongoose 9 | Flexible product documents (notes, variants, content blocks); team already knows it from the reference app |
| Validation | **Zod 4**: one schema shared by form, server action, and route handler | — |
| Auth | **Better Auth** (MongoDB adapter): email OTP, phone OTP, Google | Maintained, passwordless plugins, owns sessions (doc 06) |
| Cache / rate limit | Upstash Redis (`@upstash/ratelimit`) | HTTP-based, serverless-safe |
| Files | **Vercel Blob** (public store for media, private store for invoices/return evidence) | Doc 12 |
| Payments | Razorpay (Orders API + Checkout + Webhooks) | Doc 07 |
| Shipping | Shiprocket API (serviceability, orders, AWB, tracking webhook) | Doc 08 |
| Email | Resend + React Email | Template-as-code, generous free tier |
| SMS / WhatsApp | MSG91 (DLT-registered OTP & transactional), WhatsApp Cloud API via MSG91/Interakt (v1.1) | Indian DLT compliance |
| Jobs | Vercel Cron (Pro) + lazy settlement; optional Upstash QStash for delayed jobs | Doc 13 |
| Errors / perf | Sentry, Vercel Speed Insights, Vercel Web Analytics | Doc 15 |
| Tests | Vitest, Testing Library, Playwright, `mongodb-memory-server` | Doc 15 |

## 2. System context

```
           Shopper (mobile/desktop)                Admin / Staff
                    │                                    │
                    ▼                                    ▼
        ┌────────────────────── Vercel CDN (bom1) ──────────────────────┐
        │  Static shells (PPR) · cached RSC payloads · Blob public CDN   │
        └───────────────┬───────────────────────────────┬───────────────┘
                        │ dynamic holes / actions        │
               ┌────────▼─────────┐            ┌────────▼─────────┐
               │ proxy.ts (Node)  │            │ Route Handlers   │
               │ auth gate, CSRF, │            │ /api/webhooks/*  │
               │ geo/headers      │            │ /api/cron/*      │
               └────────┬─────────┘            └────────┬─────────┘
                        ▼                               ▼
              Server Components / Server Actions → services → models
                        │
   ┌──────────┬─────────┼───────────┬────────────┬───────────┬──────────┐
   ▼          ▼         ▼           ▼            ▼           ▼          ▼
MongoDB    Upstash   Vercel Blob  Razorpay    Shiprocket   Resend    MSG91
Atlas      Redis     (pub/priv)   (pay)       (ship)       (email)   (SMS/WA)
(Mumbai)
```

**Region pinning:** Vercel functions in `bom1` (Mumbai) and Atlas in `ap-south-1` (Mumbai). Co-location keeps DB round-trips under ~2 ms; a mismatch adds 100+ ms per query.

## 3. Repository layout

```
aaliqadr/
├── src/
│   ├── app/
│   │   ├── (store)/                     # public storefront (themed)
│   │   │   ├── page.tsx                 # home
│   │   │   ├── zodiac/[sign]/page.tsx   # 12 sign landing pages
│   │   │   ├── perfume/[slug]/page.tsx  # product detail (themed by sign)
│   │   │   ├── collections/[slug]/page.tsx
│   │   │   ├── shop/page.tsx            # listing + filters
│   │   │   ├── search/page.tsx
│   │   │   ├── find-my-sign/page.tsx
│   │   │   ├── journal/[slug]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── order/[id]/confirmation/page.tsx
│   │   │   ├── track/page.tsx
│   │   │   └── (legal)/[policy]/page.tsx
│   │   ├── (account)/account/…          # orders, addresses, wishlist, returns, profile
│   │   ├── (auth)/login/page.tsx
│   │   ├── (admin)/admin/…              # back office (doc 11), noindex
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts   # Better Auth handler
│   │   │   ├── webhooks/razorpay/route.ts
│   │   │   ├── webhooks/shiprocket/route.ts
│   │   │   ├── cron/[job]/route.ts
│   │   │   ├── upload/route.ts          # Blob client-upload token
│   │   │   ├── files/[...path]/route.ts # private file signed redirect
│   │   │   └── og/…                     # (optional) OG image routes
│   │   ├── sitemap.ts · robots.ts · manifest.ts
│   │   ├── opengraph-image.tsx · icon.tsx
│   │   ├── layout.tsx · not-found.tsx · error.tsx · global-error.tsx
│   │   └── globals.css                  # Tailwind v4 @theme + zodiac tokens
│   ├── proxy.ts
│   ├── actions/                         # "use server" mutations (thin)
│   ├── server/
│   │   ├── db/connect.ts                # cached Mongoose connection
│   │   ├── models/                      # Mongoose schemas (doc 04)
│   │   ├── services/                    # domain logic (pure, testable)
│   │   ├── queries/                     # cached read functions ("use cache")
│   │   ├── integrations/                # razorpay.ts, shiprocket.ts, resend.ts, msg91.ts, blob.ts
│   │   └── auth.ts                      # Better Auth instance + guards
│   ├── lib/                             # isomorphic helpers: money, datetime, zodiac math, slug
│   ├── schemas/                         # Zod schemas (shared client/server)
│   ├── config/                          # zodiac.ts, site.ts, constants
│   ├── components/
│   │   ├── ui/                          # shadcn primitives
│   │   ├── motion/                      # reveal, magnetic, parallax, page-transition
│   │   ├── zodiac/                      # ZodiacThemeProvider, ambient layers, glyphs
│   │   ├── product/ · cart/ · checkout/ · account/ · admin/ · layout/
│   ├── emails/                          # React Email templates
│   └── types/
├── scripts/                             # sync-indexes, seed, reconcile-payments, sweep-orphan-blobs
├── tests/ (unit, integration, e2e)
├── docs/
├── next.config.ts · vercel.json · tsconfig.json · .env.example
```

## 4. Layering rules

Dependencies point **inward only**.

| Layer | Location | May import | Must never import |
|---|---|---|---|
| Presentation | `app/**/page.tsx`, `components/**` | `actions`, `server/queries` (RSC only), `lib`, `schemas`, `config` | `server/models`, `server/db` |
| Actions / Route handlers | `actions/**`, `app/api/**` | `server/services`, `server/auth`, `schemas` | components |
| Queries (cached reads) | `server/queries/**` | models, `lib` | `cookies()`/`headers()` (keeps them cacheable) |
| Services (domain) | `server/services/**` | models, integrations, `lib` | `next/*` request APIs (so they are unit-testable) |
| Integrations | `server/integrations/**` | `lib` | models |
| Models | `server/models/**` | `types` | everything above |

Every file under `server/` starts with `import "server-only";`. Secrets can never be bundled to the client.

**Mutation pattern:** Server Action → `requireUser()`/`requireRole()` → Zod parse → service → `updateTag(...)` → return a typed result `{ ok: true, data } | { ok: false, error }`.

Route handlers exist only where something **external** calls us (webhooks, cron, Better Auth, Blob upload token, private file redirect). Everything the UI triggers is a Server Action.

## 5. Rendering & caching model (Next.js 16 Cache Components)

```ts
// next.config.ts (excerpt)
const nextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  cacheLife: {
    catalog: { stale: 300, revalidate: 3600, expire: 86400 * 30 },
    content: { stale: 300, revalidate: 86400, expire: 86400 * 30 },
  },
};
```

| Surface | Strategy | Tags |
|---|---|---|
| Home | Static shell + cached sections (`"use cache"`, `cacheLife('content')`) | `home`, `products` |
| `/zodiac/[sign]` (12) | `generateStaticParams` → fully prerendered | `sign:{slug}`, `product:{slug}` |
| `/perfume/[slug]` | Prerendered; reviews summary cached; stock badge & pincode check are dynamic islands in `<Suspense>` | `product:{slug}`, `reviews:{productId}` |
| `/shop`, `/collections/*` | Cached query per filter key; filters via `searchParams` in a Suspense island | `products`, `collection:{slug}` |
| Journal | Prerendered | `post:{slug}`, `posts` |
| Cart, checkout, account | Dynamic (reads cookies/session); never cached | — |
| Admin | Dynamic, `noindex` | — |
| Webhooks / cron | Dynamic route handlers | Call `revalidateTag(tag, 'max')` |

**Invalidation**
- Admin edits (Server Actions) → `updateTag('product:'+slug)` + `updateTag('products')`, giving read-your-writes for the editor.
- Stock change from an order (webhook) → `revalidateTag('product:'+slug, 'max')`, which is stale-while-revalidate for shoppers.
- **Stock is never baked into a long-cached HTML shell.** The "In stock / Only 3 left" badge is a dynamic island reading a tiny cached query (`cacheLife({ revalidate: 60 })`), so a sale does not need to rebuild the page.

**Why this is cheap:** shoppers mostly hit CDN-cached shells. Functions run only for dynamic holes, actions, and webhooks.

## 6. Data flow examples

**Product page request**
```
GET /perfume/ember-crown-aries
 → CDN serves prerendered shell (theme tokens already inline, no flash)
 → Suspense islands stream: <StockBadge/> <DeliveryEta/> <PersonalWishlistHeart/>
```

**Add to cart (logged-in)**
```
<AddToCart/> → action addToCart({variantId, qty})
 → requireSession (optional) → zod → cartService.add (validates variant active & stock)
 → returns cart summary → client store updates → refresh() header count
```

**Checkout**: see doc 07 sequence diagram.

## 7. Environment variables

All are validated at boot with a Zod `env.ts`. Missing required vars **throw**; there are no fallbacks.

| Variable | Scope | Notes |
|---|---|---|
| `MONGODB_URI` | server | Atlas SRV string, `retryWrites=true&w=majority` |
| `BETTER_AUTH_SECRET` | server | ≥ 32 random bytes |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | both | `https://aaliqadr.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | server | — |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | server (key id also public) | Separate test/live |
| `RAZORPAY_WEBHOOK_SECRET` | server | — |
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` | server | API user (not panel user) |
| `SHIPROCKET_WEBHOOK_TOKEN` | server | Compared to the `x-api-key` header |
| `SHIPROCKET_PICKUP_LOCATION` | server | Pickup nickname |
| `BLOB_READ_WRITE_TOKEN` (public store) / `BLOB_PRIVATE_READ_WRITE_TOKEN` | server | Two stores |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server | — |
| `RESEND_API_KEY` / `EMAIL_FROM` | server | Verified domain |
| `MSG91_AUTH_KEY` / `MSG91_OTP_TEMPLATE_ID` / `MSG91_SENDER_ID` | server | DLT-registered |
| `CRON_SECRET` | server | Vercel sends `Authorization: Bearer` |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | both | — |
| `ENCRYPTION_KEY` | server | AES-256-GCM for PII at rest (doc 06) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | public | Key id only |

## 8. Architecture decision records

| ADR | Decision | Alternatives rejected | Reason |
|---|---|---|---|
| 001 | MongoDB + Mongoose | Postgres (Neon) + Drizzle | Product shape is document-like (notes, content blocks, variants); team familiarity; Atlas transactions cover order/stock atomicity. *Postgres is equally valid if the team prefers SQL; the schema in doc 04 maps cleanly* |
| 002 | Zodiac themes in code, not DB | Theme collection | 12 fixed themes; zero reads; type-safe; build-time CSS |
| 003 | Server Actions for UI mutations, route handlers only for external callers | REST API for everything | Less surface, built-in CSRF origin check, typed end to end |
| 004 | Better Auth | Auth.js v5, custom JWT (reference app) | Auth.js now in maintenance mode; custom auth is where the reference app's FS-101 bug came from |
| 005 | Passwordless (OTP + Google) | Passwords | No password storage or reset flows; better mobile UX in India |
| 006 | Stock reserved at order creation, released lazily + by cron | Reserve on add-to-cart | Carts are abandoned at a high rate; reserving there causes false out-of-stock |
| 007 | Vercel Blob public + private stores | Cloudinary | Same platform billing; direct CDN delivery; Next image optimisation on top |
| 008 | Shiprocket aggregator | Single courier | Rate shopping, COD remittance, NDR handling, one API |
| 009 | Dark-first themes | Light-first | Luxury perfume convention; jewel colours read richer on dark |
