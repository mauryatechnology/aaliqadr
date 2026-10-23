# 09 — Frontend Design System

**Design thesis:** *quiet luxury with a living colour soul.* The chrome (typography, spacing, gold hairlines) is identical everywhere; the **atmosphere** (palette, material, ambient motion) changes per sign. Premium comes from restraint, precise timing, and light. It does not come from heavy assets.

---

## 1. UI library stack

| Library | Role | Loaded where | Approx. cost |
|---|---|---|---|
| **Tailwind CSS v4** | All styling; `@theme` tokens; container queries | Everywhere | CSS only |
| **shadcn/ui** (Radix primitives) | Complex widgets only (Select, Popover, Tooltip, Slider), mostly in admin | As used | Prefer native elements first: `<dialog>` for menus/sheets, `<details>` for accordions (zero JS) |
| **Motion** (`motion/react`, formerly Framer Motion) | Only for complex interactions (add-to-bag flight, drag gestures), dynamically imported | Client islands, lazy | Measured at ~38 KB gzip, so it is **not** used for scroll reveals: `components/motion/Reveal` uses one IntersectionObserver + CSS (~1 KB) |
| **GSAP + ScrollTrigger** | Scroll-driven storytelling on home and sign pages (pinned sections, scrubbed timelines) | **Only** pages with scroll stories, dynamically imported | ~45 KB, lazy |
| **Lenis** | Smooth scroll (desktop, pointer: fine only) | Root client provider, disabled on touch and reduced motion | ~4 KB |
| **Embla Carousel** | Product gallery, review carousels | Product page | ~7 KB |
| **Vaul** | Mobile bottom-sheet cart and filters | Mobile | ~5 KB |
| **Magic UI / Aceternity UI** (copy-in components) | Selected effects only: border beam, spotlight, shimmer text, aurora background, meteors, number ticker | Hero/marketing sections | Per component |
| **lucide-react** | Icons | — | Tree-shaken |
| Custom SVG | Aaliqadr logo lockups (doc 02 §1.1), 12 zodiac glyphs, constellation line art, note icons | Inline SVG (logo) + sprite | ~10 KB total |
| `react-hook-form` + Zod resolver | Forms (checkout, account) | Client islands | ~12 KB |
| Fuse.js | Client-side search | Search overlay (lazy) | ~6 KB |
| (v2, optional) React Three Fiber | 3D bottle viewer, desktop only, behind a feature flag | Product page, lazy + poster fallback | Heavy, so opt-in |

**Rule:** Aceternity/Magic UI components are copied in and **audited**. Remove unused variants, swap their colour literals for tokens, and respect reduced motion.

## 2. Token architecture

Three layers:

```
Brand tokens (fixed)        → fonts, spacing, radii, gold, ivory, obsidian, easing curves, durations
Zodiac tokens (12 sets)     → --z-* colours, gradient, glow, element material params (doc 02 §6)
Semantic tokens (derived)   → --color-bg, --color-surface, --color-cta, --color-ring … mapped to --z-*
```

```css
/* globals.css (Tailwind v4) */
@import "tailwindcss";

@theme {
  --font-display: var(--font-cormorant), serif;
  --font-caps: var(--font-cinzel), serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;

  --color-gold: #C4A044;  --color-gold-light: #E8CF8A;  --color-gold-deep: #9C7A2E;  --color-ivory: #F5F0E6;  --color-obsidian: #0B0A0F;

  --color-bg: var(--z-bg, #0B0A0F);
  --color-surface: var(--z-surface, #14121C);
  --color-primary: var(--z-primary, #C4A044);
  --color-secondary: var(--z-secondary, #8A8494);
  --color-accent: var(--z-accent, #C4A044);
  --color-fg: var(--z-text, #F5F0E6);
  --color-muted: var(--z-muted, #8A8494);
  --color-on-primary: var(--z-on-primary, #0B0A0F);

  --ease-lux: cubic-bezier(.22, 1, .36, 1);
  --ease-ember: cubic-bezier(.34, 1.56, .64, 1);
  --radius-card: 1.25rem;
}

[data-zodiac="aries"] { --z-bg:#12060A; --z-surface:#1E0B10; --z-primary:#C8102E; --z-secondary:#FF6B35; --z-accent:#E8B04A; --z-text:#FBEDE6; --z-muted:#C9A8A2; --z-on-primary:#FFFFFF; --z-glow:#FF3D2E; --z-g1:#3A0A12; --z-g2:#C8102E; --z-g3:#FF6B35; }
/* …11 more, GENERATED from src/config/zodiac.ts by a build script (single source of truth) */

[data-element="fire"]  { --glass-blur: 14px; --glass-alpha: .55; --glass-border: color-mix(in oklab, var(--z-accent) 45%, transparent); --shadow-material: 0 0 40px -10px var(--z-glow); }
[data-element="earth"] { --glass-blur: 0px;  --glass-alpha: .92; --shadow-material: 8px 8px 24px rgb(0 0 0 / .45), -6px -6px 18px rgb(255 255 255 / .04); }
[data-element="air"]   { --glass-blur: 24px; --glass-alpha: .28; --glass-border: rgb(255 255 255 / .22); --shadow-material: 0 8px 32px rgb(0 0 0 / .18); }
[data-element="water"] { --glass-blur: 18px; --glass-alpha: .38; --glass-border: color-mix(in oklab, var(--z-secondary) 35%, transparent); --shadow-material: inset 0 1px 0 rgb(255 255 255 / .18), 0 20px 50px -20px var(--z-glow); }
```

**Applying a theme (no flash):** the product/sign page's server component renders `<ZodiacScope sign="aries">`, which outputs `<div data-zodiac="aries" data-element="fire">` around the page. CSS variables resolve at first paint, so no client JS is needed for theming. Page-level `<meta name="theme-color">` is set from `generateViewport()` to the sign's `bg`.

## 3. Morphism recipes (the "material" layer)

One `<Surface>` component reads the element variables, so each sign automatically gets its material.

| Effect | Recipe | Used for |
|---|---|---|
| **Glassmorphism** (air, fire, water) | `background: color-mix(in oklab, var(--color-surface) calc(var(--glass-alpha)*100%), transparent); backdrop-filter: blur(var(--glass-blur)) saturate(140%); border: 1px solid var(--glass-border);` | Nav bar, cards, cart drawer, filter panel |
| **Neumorphism / claymorphism** (earth) | Dual soft shadows (`--shadow-material`), matte surface, subtle grain overlay (`background-image: url(noise.svg)` at 4 % opacity) | Product cards, quantity steppers, size selector |
| **Liquid glass** (water) | Glass + an animated SVG `feTurbulence`/`feDisplacementMap` refraction on hover (desktop only), inset highlight | Hero CTA, featured card |
| **Ember glass** (fire) | Smoked glass + animated conic-gradient rim (`@property --angle`) + glow shadow | CTA, price block |
| **Aurora gradient** | 3 blurred radial gradients from `--z-g1..3`, slow drift via `@keyframes` (transform only) | Hero backgrounds |
| **Grain / noise** | Static SVG noise overlay, `mix-blend-mode: overlay` | Global luxury texture (2–4 %) |
| **Gold hairline** | `1px` border with `linear-gradient(var(--color-accent), transparent)` via `border-image` or mask | Section dividers, card edges |

**Performance guardrails for morphism**
- `backdrop-filter` is expensive on low-end Android. Limit it to ≤ 3 simultaneously visible elements, never on scrolling lists of cards; fall back to solid `surface` at 92 % alpha under `@media (prefers-reduced-transparency: reduce)` and on devices flagged low-end (`navigator.deviceMemory ≤ 4` → `data-perf="lite"` on `<html>`).
- Animate only `transform`, `opacity`, `filter: blur()` (sparingly), and custom properties registered with `@property`. **Never** animate layout properties, box-shadow (fake it with an opacity-animated pseudo-element), or backdrop-filter values.

## 4. Motion system

### 4.1 Principles
1. **Purposeful.** Motion explains hierarchy (reveal), continuity (shared element), and feedback (press). It is never decoration that blocks reading.
2. **Sign personality** via easing and duration tokens (doc 02 §4): fire snappy, earth weighted, air floaty, water fluid.
3. **Fast to interactive.** Nothing animates before LCP, and the hero image/text are never hidden behind a JS-driven intro.
4. **Reduced motion:** with `prefers-reduced-motion: reduce`, ambient layers are off, Lenis is off, transitions become 0–150 ms fades, and parallax is off.

### 4.2 Duration & easing tokens

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 120 ms | Press, toggle |
| `--dur-quick` | 240 ms | Hover, small reveal |
| `--dur-base` | 420 ms | Card/section reveal |
| `--dur-slow` | 800 ms | Hero, page transition |
| `--ease-lux` | `cubic-bezier(.22,1,.36,1)` | Default |
| Fire spring | `{ type:"spring", stiffness:260, damping:22 }` | Fire signs |
| Water | `cubic-bezier(.45,0,.2,1)` 700–1000 ms | Water signs |

### 4.3 Signature interactions

| Interaction | Implementation |
|---|---|
| **Zodiac wheel** (home nav) | SVG wheel; rotate on scroll (GSAP scrub) or drag (Motion `drag` with inertia); hovering a segment previews that sign's palette as a full-page aurora crossfade (CSS var transition on `@property` colours) |
| **Page transitions** | React 19.2 `<ViewTransition>` + the View Transitions API: product card image morphs into the product hero (`view-transition-name: product-{slug}`). Fallback: instant |
| **Theme crossfade** | Navigating between signs animates `--z-*` registered `@property <color>` values over 600 ms |
| **Notes pyramid** | Three tiers reveal top → heart → base with staggered blur-in; each note chip has its icon; hover shows a description |
| **Scent-trail cursor** (desktop) | A small glow following the pointer in `--z-glow` (one `transform` per frame, `pointer: fine` only) |
| **Magnetic CTA** | Button translates toward the pointer (≤ 6 px) with a spring |
| **Add to cart** | Bottle thumbnail flies to the cart icon (Motion layout animation) + cart count tick |
| **Scroll story** (sign page) | Pinned section: constellation draws (SVG stroke-dashoffset), then the bottle rises, then notes appear (GSAP ScrollTrigger, `scrub: true`) |
| **Loading** | Skeletons with a soft shimmer in `--color-surface`; no spinners on content |

### 4.4 Parallax & depth system (implemented)

| Layer | Implementation | JS |
|---|---|---|
| Scroll parallax | `components/motion/Parallax` (`data-parallax`, `--px-speed`): CSS scroll-driven animation on the `translate` property with `animation-timeline: view()`, so it runs on the compositor. Negative speed lags (background), positive leads (foreground) | 0 KB (fallback `ParallaxRuntime` ~1 KB, only in browsers without `animation-timeline`) |
| Site-wide sky | `layout/CelestialBackdrop`: fixed, sign-tinted nebula, two star layers drifting at different speeds (`scroll(root)` timeline), a faint zodiac ring that turns as you scroll. Stars are SVG `<pattern>` tiles, quieter on phones | 0 KB |
| Pointer depth | `motion/PointerDepth` + `Depth strength`: desktop mice only, writes `--mx/--my` once per frame; the motion is a CSS transition | <1 KB |
| Page headers | `layout/PageHero`: drifting aurora plus a lagging title block, used on every non-product page | 0 KB |

Rules learned during build-out:
- Any ancestor that crops a parallax layer must use `overflow-clip`, never `overflow-hidden`. `hidden` creates a scroll container, and the `view()` timeline then tracks that never-scrolling box, so the layer freezes.
- The page colour lives on `html`; `body` is transparent. An opaque body would paint over the fixed backdrop, which sits at a negative z-index.
- Sign and product pages use `<ZodiacScope page>`, which themes the whole document through `:root:has(.zodiac-page[data-zodiac=…])`: header, backdrop and body.
- Reduced motion and `data-perf="lite"` disable every parallax animation.

### 4.5 Bottle artwork (implemented)

Until photography exists, each sign's bottle is a vector SVG generated at build time (`src/lib/bottle-svg.ts` → `public/bottles/{sign}.svg`). It has a knurled gold cap with an embossed monogram, liquid with a meniscus, thick glass base, specular highlights, a label carrying the real vector logo and wordmark, and a floor reflection. It is loaded as an image: about 4.7 KB gzip per sign, cached once and shared by every page. The earlier inline version added ~6.7 KB per bottle to the HTML and again to the RSC payload. Standalone SVG images can't use web fonts or CSS variables, so colours are literal hex and the zodiac glyph is left off the label (emoji rendering can't be prevented inside an `<img>`).

## 5. Layout & responsive system

| Breakpoint | Width | Layout notes |
|---|---|---|
| `xs` | 320–479 | Single column, bottom nav (Home, Zodiac, Search, Cart, Account), sticky add-to-cart bar on product |
| `sm` | 480–767 | Larger type, 2-column product grid |
| `md` | 768–1023 | Tablet: 2–3 columns, side filter sheet |
| `lg` | 1024–1439 | Desktop: mega menu with zodiac wheel, 3–4 columns |
| `xl` | 1440–1919 | Max content width 1360 px, generous margins |
| `2xl` | ≥ 1920 | Content capped; ambient backgrounds extend full-bleed |

- Fluid type with `clamp()`: display `clamp(2.5rem, 6vw, 6rem)`; body `clamp(1rem, .95rem + .25vw, 1.125rem)`.
- Use **container queries** for cards (`@container`), so the same card works in grid, carousel, and drawer.
- Safe areas: `env(safe-area-inset-*)` for iOS bottom bars.
- Touch targets ≥ 44 × 44 px; hover effects are gated by `@media (hover: hover)`.
- Test devices: iPhone SE (375), iPhone 15 Pro, Pixel 7, Galaxy A-series (low-end Android), iPad, 13" laptop, 27" 1440p, 4K.

## 6. Key components

| Component | Notes |
|---|---|
| `ZodiacScope` | Server component; sets `data-zodiac`, `data-element` |
| `AmbientLayer` | Client; picks ember/grain/aurora/caustic/smoke by sign; pauses off-screen; `null` on reduced motion or lite mode |
| `Surface` | Material-aware panel (glass/neu/liquid/ember) |
| `ZodiacGlyph` | Animated SVG glyph (stroke draw) |
| `ZodiacWheel` | Home navigation hero |
| `SignFinder` | Date input (native `type="date"` on mobile) + Vedic toggle + 12-rashi grid |
| `ProductCard` | Image (4:5), name, sign glyph, price, quick-add; hover reveals the second image + note chips |
| `NotesPyramid` | Top/heart/base with icons |
| `ScentProfile` | Intensity/longevity/sillage meters (animated on view) |
| `VariantSelector` | Size pills with price per ml |
| `DeliveryEstimator` | Pincode input → ETA + COD |
| `StickyBuyBar` | Mobile sticky price + add to cart |
| `CartDrawer` | Vaul sheet on mobile, side drawer on desktop; free-shipping progress bar |
| `ReviewSummary` / `ReviewList` | Stars, distribution, photo reviews, "reviewer's sign" chip |
| `CompatibleSigns` | "Pairs well with" carousel using the compatibility map |
| `TrustStrip` | Authentic, secure payments, COD, easy damage claims |

## 7. Imagery & media

- `next/image` everywhere with explicit `sizes`, `placeholder="blur"` (blurDataURL stored in `media`), and `priority` only for the LCP image.
- Formats: AVIF then WebP (`images.formats: ["image/avif","image/webp"]`).
- Hero loop videos: `<video muted playsInline autoPlay loop preload="none" poster=…>`, started by IntersectionObserver, never on `Save-Data`, ≤ 2 MB.
- Product page gallery: the first image is server-rendered, the rest are lazy.

## 8. Accessibility (WCAG 2.2 AA)

- Contrast: every sign's text/bg and on-primary/primary pair ≥ 4.5:1 (CI-checked); large display text ≥ 3:1.
- Focus: a visible 2 px ring in `--color-accent` with an offset, never removed.
- Keyboard: the zodiac wheel is operable with arrow keys (it's a `radiogroup`); carousels have buttons; dialogs trap focus (Radix).
- Motion: reduced-motion support as above; no auto-playing content > 5 s without a pause control (hero loop has a pause button).
- Semantics: one `h1` per page; landmark regions; `aria-live="polite"` for cart updates; form errors linked with `aria-describedby`.
- Glyph-only signs always have text labels (screen readers say "Aries", not "♈").
- Language: `lang="en-IN"`; rashi names marked `lang="hi-Latn"` where useful.

## 9. Performance budgets (enforced in CI with Lighthouse CI + bundle analyzer)

| Page | JS (gzip, first load) | LCP mobile (4G, mid-range) | CLS | Image weight above fold |
|---|---|---|---|---|
| Home | ≤ 170 KB | ≤ 2.2 s | ≤ 0.05 | ≤ 250 KB |
| Sign page | ≤ 160 KB (GSAP lazy after LCP) | ≤ 2.0 s | ≤ 0.05 | ≤ 220 KB |
| Product page | ≤ 150 KB | ≤ 2.0 s | ≤ 0.05 | ≤ 200 KB |
| Shop / collection | ≤ 140 KB | ≤ 2.0 s | ≤ 0.05 | ≤ 300 KB |
| Checkout | ≤ 130 KB (+ Razorpay on demand) | ≤ 2.0 s | ≤ 0.02 | — |

Techniques: Server Components by default; client islands only for interactivity; `next/dynamic` for GSAP, Fuse, Embla, and the ambient canvas; fonts via `next/font` with `display: swap` and **subset to Latin** (≤ 3 font files on first load); `optimizePackageImports` for icon libraries; no client-side data-fetching libraries needed (RSC + actions).

## 10. Dark/light mode

- Dark is the default for the storefront (brand decision). A light "Ivory" mode is offered via a toggle (stored in a cookie so SSR renders correctly with no flash), implemented by `[data-mode="light"]` overrides derived from each sign (doc 02 §6).
- Admin uses a neutral light/dark theme with no zodiac atmosphere (productivity first).
