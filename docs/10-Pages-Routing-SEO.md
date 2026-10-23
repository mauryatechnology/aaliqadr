# 10 — Pages, Routing & SEO

## 1. Sitemap (public pages)

| Route | Page | Render | Theme | Index |
|---|---|---|---|---|
| `/` | Home | PPR (static shell + cached sections) | Brand (neutral) + "current season" sign accent | ✔ |
| `/zodiac` | All 12 signs (wheel + grid) | Static | Brand | ✔ |
| `/zodiac/[sign]` ×12 | Sign landing: story, traits, element, planet, gemstone, the fragrance, compatible signs, journal posts | Static (`generateStaticParams`) | **Sign** | ✔ |
| `/perfume/[slug]` | Product detail | Static + dynamic islands | **Product's sign** (+ optional override) | ✔ |
| `/shop` | All products, filters | Cached shell + Suspense filter island | Brand | ✔ (canonical without params) |
| `/collections/[slug]` | Element collections, gift sets, best-sellers | Static | Element / collection theme | ✔ |
| `/discovery-set` | Discovery Coffret story page (is a product too) | Static | Multi-sign wheel | ✔ |
| `/find-my-sign` | Sign finder tool | Static (client calc) | Brand → animates to the result sign | ✔ |
| `/search` | Search results | Dynamic | Brand | `noindex, follow` |
| `/journal`, `/journal/[slug]` | Blog | Static | Post's sign or brand | ✔ |
| `/about`, `/craft`, `/contact`, `/faq` | Brand pages | Static | Brand | ✔ |
| `/policies/[policy]` | shipping, returns, privacy, terms, cancellation, grievance | Static | Brand | ✔ |
| `/cart`, `/checkout`, `/order/[id]/confirmation` | Commerce | Dynamic | Brand | `noindex` |
| `/track` | Guest order tracking | Dynamic | Brand | `noindex` |
| `/login`, `/account/**` | Auth & account | Dynamic | Brand (user's sign accent if set) | `noindex` |
| `/admin/**` | Back office | Dynamic | Admin theme | `noindex` + blocked in robots |

URL rules: lowercase, hyphenated, no trailing slash, no IDs in public URLs. The product slug includes the sign for SEO intent (`/perfume/ember-crown-aries`). Changing a slug creates a **301** via a `redirects` collection checked in `proxy.ts` (cached map).

## 2. Per-page metadata (`generateMetadata`)

```ts
// app/(store)/perfume/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);            // cached, tag product:{slug}
  if (!p) return { title: "Not found", robots: { index: false } };
  const sign = ZODIAC[p.zodiacSign!];
  const title = p.seo.title ?? `${p.name}: ${sign.name} (${sign.rashi}) Perfume | Extrait de Parfum`;
  const description = p.seo.description ?? `${p.tagline}. ${noteLine(p.notes)}. Crafted for ${sign.name}. Free shipping above ₹1,499.`;
  return {
    title, description,
    alternates: { canonical: `/perfume/${p.slug}` },
    openGraph: { type: "website", title, description, url: `/perfume/${p.slug}`, images: [{ url: `/perfume/${p.slug}/opengraph-image`, width: 1200, height: 630, alt: p.name }] },
    twitter: { card: "summary_large_image" },
    other: { "product:price:amount": rupees(p.minPriceP), "product:price:currency": "INR" },
  };
}
export async function generateViewport({ params }) { /* themeColor = sign.theme.bg */ }
```

**Title & description patterns**

| Page | Title (≤ 60 chars) | Description (≤ 155 chars) |
|---|---|---|
| Home | `Aaliqadr: Luxury Zodiac Perfumes, Crafted for Your Rashi` | Brand promise + 12 signs + free shipping |
| Sign | `Aries (Mesh) Perfume: Bold, Spicy Fragrance for Aries · Aaliqadr` | Traits + notes + CTA |
| Product | `{Name}: {Sign} ({Rashi}) Perfume, {Concentration}` | Tagline + key notes + offer |
| Collection | `Fire Sign Perfumes: Aries, Leo & Sagittarius · Aaliqadr` | — |
| Journal | `{Post title} · Aaliqadr Journal` | Excerpt |

Root `layout.tsx` sets `metadataBase`, `title.template: "%s · Aaliqadr"`, default OG, `applicationName`, icons, `manifest`, `verification` (Google Search Console), `formatDetection: { telephone: false }`.

## 3. Dynamic OG images (themed per sign)

- `app/(store)/perfume/[slug]/opengraph-image.tsx` and `zodiac/[sign]/opengraph-image.tsx` use `ImageResponse` from `next/og`: sign gradient background, glyph, product bottle cut-out (PNG from Blob), name in the display font (font loaded as an ArrayBuffer), and price.
- They are generated at build or on first request, then cached (static params known), so the cost is negligible.
- Fallback brand OG at the root: `logo-2.png` (embossed ivory card) composited on obsidian with the tagline.
- `Organization` JSON-LD `logo` points to a 512×512 PNG export of `logo-mark.svg` on obsidian (Google requires a crawlable raster logo).

## 4. Structured data (JSON-LD)

Rendered server-side in a `<script type="application/ld+json">` via a typed helper (`lib/jsonld.ts`, using `schema-dts` types). **Values must exactly match visible content** (price, availability, rating). Google treats mismatches as spam.

| Page | Types |
|---|---|
| All | `Organization` (logo, sameAs socials, contactPoint), `WebSite` with `SearchAction` (home only) |
| Product | `Product` + `ProductGroup` (variants by size via `hasVariant`, `variesBy: "size"`), `Offer` per variant (`price`, `priceCurrency: INR`, `availability`, `itemCondition: NewCondition`, `priceValidUntil`), `shippingDetails` (`OfferShippingDetails`: rate, `deliveryTime` handling + transit), `hasMerchantReturnPolicy` (`MerchantReturnPolicy`: country IN, category, days, method), `aggregateRating` + top `review`s (only when ratingCount ≥ 1, from approved reviews), `brand: Aaliqadr`, `sku`, `gtin13` if registered, `image[]`, `additionalProperty` (concentration, volume, notes) |
| Sign page | `CollectionPage` + `ItemList` of products + `BreadcrumbList` + `FAQPage` (sign FAQs; note FAQ rich results are now limited, but it is still useful for AI answers) |
| Collection / shop | `CollectionPage`, `ItemList`, `BreadcrumbList` |
| Journal post | `BlogPosting` (author, datePublished, image), `BreadcrumbList` |
| FAQ | `FAQPage` |
| Contact | `Organization` + `ContactPoint` (customer service, grievance) |

The return policy is also declared once at the `Organization` level (`hasMerchantReturnPolicy`) since it is uniform.

## 5. Crawling & indexing

- `app/sitemap.ts`: home, zodiac (12), products, collections, journal, policies, with `lastModified` from `updatedAt`. Products include `images` entries. Cached and revalidated via tag `products`/`posts`.
- `app/robots.ts`: allow `/`; disallow `/admin`, `/account`, `/checkout`, `/cart`, `/api`, `/search?*`, `/*?sort=`, `/*?filter=`; sitemap URL.
- Faceted URLs (`/shop?element=fire`) are `noindex, follow` with canonical to `/shop`. Important facets get **real static pages** instead (`/collections/fire-signs`).
- Pagination via `?page=` with self-canonicals; prefer "Load more" plus static collection pages since the catalogue is small.
- 404s return a real 404 status (`notFound()`); archived products return **410**-like behaviour: render "No longer available" with alternatives, `noindex`, status 404 (or 301 to the replacement if one exists).
- **Google Merchant Center**: product feed at `/api/feeds/google-merchant.xml` (free listings + Shopping ads), and structured data kept in parity.
- IndexNow / Search Console sitemap ping on product publish (optional).

## 6. Content SEO strategy (zodiac is a search goldmine)

| Cluster | Pages | Example queries |
|---|---|---|
| Sign × perfume (money pages) | 12 sign pages + 12 products | "best perfume for aries", "scorpio perfume", "mesh rashi perfume" |
| Element | 4 collections | "fire sign perfumes", "perfume for water signs" |
| Gifting | Gift guides per sign and per occasion | "birthday gift for leo woman", "gift for capricorn man" |
| Seasonal | "Aries season" posts published yearly before each sun ingress (12/yr) | "aries season 2027" |
| Education | Notes glossary (oud, saffron, iris…), how to layer, longevity tips | "what is oud", "how to make perfume last longer" |
| Compatibility | 78 sign-pair pages (v2; generate only with real editorial content, never thin) | "leo and libra compatibility gift" |
| Vernacular | Hindi versions of sign pages (v1.1, `hreflang="hi-IN"`) | "मेष राशि परफ्यूम" |

Internal linking: product ↔ sign ↔ element collection ↔ related journal posts ↔ compatible signs. Breadcrumbs everywhere.

## 7. Core Web Vitals = SEO

Budgets in doc 09 §9. In addition:
- LCP image: `priority`, `fetchPriority="high"`, correct `sizes`, AVIF.
- No layout shift from fonts (`next/font` with `adjustFontFallback`), from images (explicit dimensions), or from the theme (SSR tokens).
- INP: no long tasks > 50 ms during interaction; heavy animation libs are lazy and idle-loaded.
- Field monitoring through Vercel Speed Insights, with alerts if p75 regresses.

## 8. Analytics & tracking

- Vercel Web Analytics (privacy-friendly, cookie-less) for traffic.
- GA4 + Meta Pixel **only after consent** (consent banner with granular toggles; Google Consent Mode v2), loaded via `@next/third-parties` and `afterInteractive`/`lazyOnload`.
- E-commerce events: `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase` (fired from the confirmation page with an idempotency guard so a refresh doesn't double count). Server-side Meta Conversions API (v1.1) for accuracy.
- Custom events: `sign_finder_used {system, sign}`, `theme_viewed {sign}`, `notes_pyramid_interacted`.
