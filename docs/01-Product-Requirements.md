# 01 — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | Aaliqadr: luxury zodiac perfume D2C store |
| Version | 1.0 (pre-development) |
| Market | India (INR, GST, Indian couriers). International shipping is out of scope for v1 |
| Channel | Web (mobile-first responsive) plus an installable PWA |

---

## 1. Vision

> *"A fragrance written in your stars."*

Aaliqadr sells 12 signature fragrances, one per rashi. The website is the flagship boutique. It should feel like walking into a dimly lit perfumery where the room changes colour and mood depending on which bottle you pick up.

Success means a visitor finds **their** sign within 10 seconds, feels the product page was designed for them, and checks out in under 90 seconds on a phone.

## 2. Goals & KPIs

| Goal | KPI | v1 target |
|---|---|---|
| Fast luxury experience | LCP (mobile, p75) | < 2.0 s |
| | INP (p75) | < 200 ms |
| | CLS | < 0.05 |
| Conversion | Visitor → order | ≥ 1.8 % |
| | Checkout start → paid | ≥ 55 % |
| Discovery | Visitors using "Find my sign" | ≥ 30 % |
| Trust | Orders with a verified review within 30 days | ≥ 8 % |
| Cost | Vercel + DB + storage monthly at 50k sessions | ≤ ₹4,000 (see doc 13) |
| SEO | Product + sign pages indexed | 100 % within 30 days of launch |

## 3. Personas

| Persona | Description | What they need |
|---|---|---|
| **The Believer** (25–40) | Follows astrology and knows their rashi (often the Vedic moon sign) | Instant route to their sign, rich sign storytelling |
| **The Gifter** (22–45) | Buying for a partner, friend, or family member's birthday | Date-of-birth → sign finder, gift wrap, message card, hidden prices on invoice, scheduled dispatch |
| **The Collector** | A fragrance enthusiast who doesn't care about astrology | Notes pyramid, concentration, longevity/sillage, discovery set |
| **The Skeptic** | Lands from an ad | Social proof, clear returns, COD, fast delivery promise |

## 4. Scope

### 4.1 In scope (v1, "Must")

**Catalogue & discovery**
- 12 signature fragrances, each mapped 1:1 to a zodiac sign
- Variants per fragrance: sizes (e.g. 10 ml travel, 50 ml, 100 ml). Price, stock, and SKU sit on each variant
- Bundles: **Zodiac Discovery Coffret** (12 × 2 ml), **Element Trios** (Fire / Earth / Air / Water, 3 × 10 ml), and gift sets
- Sign landing pages (`/zodiac/aries`) with sign story, traits, element, ruling planet, and the fragrance
- **Find My Sign**: enter a birth date to get the Western sun sign, with a toggle for "I follow Vedic / I know my rashi" that lets the visitor pick directly (see doc 02 §2)
- Collections: by element, by occasion, best-sellers, new
- Search across fragrance name, sign, note (e.g. "oud", "rose"), and element
- Filters: element, note family, size, price range, intensity
- Product page: themed per sign, gallery, notes pyramid (top/heart/base), intensity/longevity/sillage meters, how to wear, ingredients/INCI, legal declarations, reviews, FAQs, "pairs well with" (compatible signs)

**Cart & checkout**
- Guest checkout plus optional account
- Persistent cart (guest: local storage; logged in: server, merged on login)
- Pincode serviceability check and delivery ETA on the product page and in the cart
- Coupons (one per order) and automatic offers (e.g. free 2 ml sample above ₹X)
- Gift options: gift wrap (paid add-on), message card (≤ 200 chars), "hide price on invoice"
- Payment: Razorpay (UPI, cards, netbanking, wallets) and COD (with limits and a fee, configurable)
- Order confirmation page plus email and SMS/WhatsApp

**Account**
- Login by email OTP or phone OTP, plus Google sign-in. No passwords in v1
- Profile with optional date of birth and sign (drives birthday offers)
- Address book, order history, order tracking, invoice download, return request
- Wishlist, recently viewed, back-in-stock alerts

**Post-purchase**
- Order tracking timeline (Shiprocket webhook-driven)
- Returns and replacements: only damaged, leaked, or wrong item, raised within 48 hours with an unboxing video (perfume hygiene policy, see doc 08)
- Verified-purchase reviews with optional photo, moderated

**Content & brand**
- Home: hero, the zodiac wheel, featured sign of the current season (auto-selects by today's date), best-sellers, story, press, reviews
- About / Our Craft, Journal (blog), FAQs, Contact, store policies
- Newsletter with double opt-in

**Admin (back office)**
- Products, variants, bundles, inventory with batch numbers and manufacture dates
- Orders, fulfilment (create shipment, label, AWB), cancellations, refunds
- Returns, customers, coupons/offers, reviews moderation
- CMS: home sections, banners, journal posts, FAQs, policy pages, sign content
- Settings: shipping slabs, COD rules, gift wrap price, tax, store info
- Audit log and role-based staff access

### 4.2 Should (v1.1)
- Birthday-month automatic coupon and "It's your season" campaign emails (when the sun enters a sign)
- Discovery-set credit: the price of a discovery set is returned as a coupon toward a full bottle
- Abandoned-cart reminders (email/WhatsApp, with consent)
- Gift cards (closed-loop, see doc 14 for prepaid instrument limits)
- Hindi language (`hi-IN`) for sign pages
- Engraving / personalised bottle name (if the supplier supports it)

### 4.3 Could (v2)
- Loyalty points ("Stardust"), referral programme
- Compatibility gifting ("Your partner is a Libra, here is your duo set")
- Subscription refills
- International shipping (needs DG air compliance, see doc 08)
- Lightweight 3D bottle viewer (lazy-loaded, desktop only)

### 4.4 Explicitly out of scope
Wholesale/B2B pricing, dropshipping, wallets/advance balances, POS, multi-vendor marketplace, multi-tenant SaaS, ERP purchasing, e-invoicing (IRN) until turnover requires it.

## 5. Key user stories (acceptance criteria abbreviated)

| ID | Story | Acceptance |
|---|---|---|
| US-01 | As a visitor, I enter my birth date and land on my sign's fragrance | Sun sign computed client-side with no request; Vedic toggle shows the 12-rashi picker; result deep-links to `/zodiac/[sign]` |
| US-02 | As a visitor on a product page, the whole page reflects that sign's theme | Theme tokens applied at the server render with no flash of the default theme; meets WCAG AA contrast |
| US-03 | As a shopper, I check pincode delivery before buying | Shows serviceable yes/no, ETA range, and COD availability; result cached 24 h per pincode |
| US-04 | As a shopper, I pay by UPI and see confirmation even if I close the tab | Webhook marks the order paid; confirmation email is sent once |
| US-05 | As a shopper, I apply a coupon | Server validates expiry, minimum order, per-customer usage, exclusions; shows the reason for failure |
| US-06 | As a gifter, I add gift wrap and a message and hide the price | The packing slip shows the message with no prices; the invoice still goes to the buyer's email |
| US-07 | As a customer, I raise a damaged-bottle claim | Allowed only within 48 h of delivery; video and photos required; status visible in account |
| US-08 | As an admin, I update a product price | The product page reflects it within seconds via tag revalidation; old orders keep their snapshot price |
| US-09 | As an admin, I mark an order shipped | AWB generated via Shiprocket; customer notified; timeline updated |
| US-10 | As a customer, I download my GST invoice | PDF generated on demand; the URL is authorised to the owner only |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Budgets in doc 09 §9; all catalogue pages served from cache |
| Availability | 99.9 % storefront; checkout degrades gracefully if Shiprocket is down (ETA hidden, order still accepted) |
| Security | OWASP ASVS L2 for auth, session, and payment flows (doc 06) |
| Privacy | DPDP Act 2023 / Rules 2025 consent and rights (doc 14) |
| Accessibility | WCAG 2.2 AA; `prefers-reduced-motion` respected everywhere |
| SEO | Per-page metadata, JSON-LD, OG images, sitemap (doc 10) |
| Devices | 320 px phones up to 2560 px desktops; touch and pointer; Safari 16.4+, Chrome/Edge/Firefox 111+ (Next.js 16 browser floor) |
| Cost | Vercel Pro plus on-demand usage within doc 13 budgets; spend management alerts set |
| Observability | Errors to Sentry; payment and webhook events logged with correlation IDs |

## 7. Assumptions & open decisions

| # | Decision | Default assumption |
|---|---|---|
| D1 | Sun sign (Western dates) or Vedic moon sign for "Find my sign"? | Both: the date finder uses sun sign, and a toggle lets Vedic followers pick a rashi directly. The **product is the same**, only the mapping UX differs |
| D2 | Fragrance concentration | Extrait de Parfum (20–30 %) for the signature line; EDP for travel sizes |
| D3 | COD | Enabled up to ₹5,000, ₹49 fee, disabled for discovery sets |
| D4 | Free shipping threshold | ₹1,499 |
| D5 | GST rate on perfume | 18 % (HSN 3303). **Verify with the CA against the current CBIC schedule before launch** |
| D6 | Brand spelling | "Aaliqadr" (confirmed) |
| D7 | Courier aggregator | Shiprocket (alternatives: Delhivery direct, iThink Logistics) |
| D8 | Logo | Official logo from `Aaliqadr/` (vector master `Aaliqadr logo.pdf`). Brand gold `#C4A044`. See doc 02 §1.1 |
| D9 | Existing body-care line (e.g. the Face & Body Lotion on the current label) | Sell it in the same store as type `body_care`, using the neutral brand theme (not a zodiac theme). Confirm whether it is in v1 scope |
