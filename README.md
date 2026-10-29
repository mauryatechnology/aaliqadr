# Aaliqadr

Luxury zodiac perfume D2C store: twelve Extrait de Parfum signatures, one per rashi, each page rendered in its sign's theme.

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Vercel (`bom1`).

The full specification lives in [docs/](docs/00-README.md). Start there.

## Quick start

```bash
npm install
cp .env.example .env     # placeholders ("dummy-…") are fine for local development
npm run dev              # http://localhost:3000
```

With placeholder env values the storefront runs fully on the **seed catalogue** (`src/server/catalog/seed.ts`). Integrations that need real credentials (database writes, payments, email) fail with a clear "Not configured yet" error instead of silently falling back. A Vercel **production** deploy refuses to boot while any required value is still a placeholder (`src/env.ts`).

### Connecting the database

1. Create an Atlas cluster in `ap-south-1` (Mumbai) and put its URI in `MONGODB_URI`.
2. `npm run db:sync-indexes`: creates indexes (production runs with `autoIndex` off).
3. `npm run db:seed`: upserts the launch catalogue (keeps live stock on re-runs).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js (runs `zodiac:css` first) |
| `npm run zodiac:css` | Generates `src/app/zodiac-tokens.css` from `src/config/zodiac.ts` |
| `npm test` | Vitest: zodiac date math, WCAG contrast of all 12 palettes, money/GST, cart pricing |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint |
| `npm run db:seed` / `db:sync-indexes` | Database setup (needs a real `MONGODB_URI`) |

## Where things are

```
src/
  app/                 routes (storefront pages, sitemap, robots, manifest, OG images)
  actions/             server actions (UI mutations)
  components/          brand/ zodiac/ product/ layout/ cart/ motion/ ui/
  config/              zodiac.ts (the 12 signs, single source of truth), site.ts
  lib/                 money, zodiac math, routes, JSON-LD, OG, colour, cart store
  server/              db/ models/ queries/ (cached reads) services/ catalog/
  env.ts               validated environment
  proxy.ts             network boundary (cheap checks only)
public/brand/          logo SVGs (converted from the vector master), icons, embossed art
scripts/               zodiac CSS generator, db seed and index sync
tests/                 unit tests
```

## Status

Phase 0 (foundations) and Phase 1 (design system + catalogue read path) are done. See [docs/16-Build-Roadmap.md](docs/16-Build-Roadmap.md) for what is next.

---

## Amazon Shipping (SP-API Shipping v2)

Amazon Shipping integration allows admin to shop dynamic rates, purchase labels, download thermal/PNG shipping documentation, and display real-time tracking checkpoints to customers.

### Switch from Sandbox to Production

Switching from Amazon Sandbox to Live Production requires **only** `.env` updates with **zero code changes**:

| Variable | Sandbox Value | Production Value |
| :--- | :--- | :--- |
| `SPAPI_MODE` | `sandbox` | `production` |
| `SPAPI_BASE_URL` | `https://sandbox.sellingpartnerapi-na.amazon.com` | `https://sellingpartnerapi-na.amazon.com` |
| `LWA_CLIENT_ID` | Sandbox App Client ID | Production App Client ID |
| `LWA_CLIENT_SECRET` | Sandbox App Client Secret | Production App Client Secret |
| `LWA_REFRESH_TOKEN` | Sandbox Refresh Token | Production Refresh Token |
| `AMAZON_SHIPPING_BUSINESS_ID` | `AmazonShipping_US` (or sandbox region) | Your Production Carrier Business ID (e.g. `AmazonShipping_IN` or `AmazonShipping_US`) |
| `AMAZON_SANDBOX_USE_SAMPLE_ADDRESS` | `true` | `false` (ignored automatically when `SPAPI_MODE=production`) |
| `WAREHOUSE_*` | Sandbox test address | Registered physical pickup warehouse address |
| `AMAZON_CURRENCY` | `USD` (or test currency) | `INR` (for India) or destination currency |
| `AMAZON_WEIGHT_UNIT` | `POUND` | `KILOGRAM` / `GRAM` / `POUND` |
| `AMAZON_DIMENSION_UNIT`| `INCH` | `CENTIMETER` / `INCH` |

