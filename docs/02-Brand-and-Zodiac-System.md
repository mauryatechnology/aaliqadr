# 02 — Brand & Zodiac System

This document is the **single source of truth** for the 12 signs: their astrological facts, fragrance brief, colour palette, material ("morphism") language, and motion personality. Engineering turns §6 into a typed constant (`src/config/zodiac.ts`). Design turns it into Figma variables.

> Fragrance names and note briefs below are **working briefs** for the perfumer and copywriter, not final product claims. Colour hex values are a designed starting palette derived from traditional sign colours and should be validated against final packaging.

---

## 1. Brand foundations

| | |
|---|---|
| **Name** | Aaliqadr |
| **Positioning** | Indian luxury perfume house. Astrology is the doorway; craft is the reason to stay |
| **Voice** | Poetic, confident, never mystical-cheesy. Short sentences. Sensory verbs |
| **Master palette** (brand chrome, used on neutral pages) | Obsidian `#0B0A0F` · Midnight Ink `#14121C` · **Aaliqadr Gold `#C4A044`** (sampled from the official logo) · Gold Light `#E8CF8A` · Gold Deep `#9C7A2E` · Ivory `#F5F0E6` · Smoke `#8A8494` |
| **Typography** | Display: *Cormorant Garamond* (or *Playfair Display*) · Accent caps: *Cinzel* (closest web match to the logo's classical Roman wordmark; sign names, numerals) · Arabic accent (decorative only, e.g. the monogram story): *Amiri* or *Aref Ruqaa* · UI/Body: *Manrope* (or *Inter*). Self-hosted via `next/font` |
| **Logo usage** | Gold on obsidian or ivory; ivory/white on saturated sign colours. The logo never sits on a busy gradient without a scrim. Full rules in §1.1 |
| **Signature motifs** | (1) The **drop monogram** from the logo: alif + qaf calligraphy (اق) forming a perfume drop / flame, used as the loader, favicon, and section divider. (2) The zodiac wheel: 12 segments, each glowing in its sign colour; used as navigation on home |
| **Legal entity** (from the existing product label) | **Aaliqadr Organics Pvt. Ltd.**, Bhopal, Madhya Pradesh (GST state code **23**). Address and helpline are seeded into `settings` (doc 04 §4.16) |

### 1.1 Logo system

Source files live in `Aaliqadr/` (the brand assets folder in this project):

| File | What it is | Web use |
|---|---|---|
| `Aaliqadr logo.pdf` / `Aaliqadr logo.cdr` / `Logo.cdr` | **Vector master** | Export to **SVG** (monogram-only + full lockup); this is the source for every web logo |
| `Logo.jpg` (2480×3507) | Flat gold `#C4A044` monogram + AALIQADR wordmark on white | Reference for colour; email header fallback (PNG export) |
| `logo-2.png` (2000×2000, transparent) | Embossed gold on a textured ivory card | Hero / "About" brand moment, OG fallback background, packaging-style imagery |
| `golden logo.png`, `golden logo-2.png` (2000×2000, transparent) | Embossed monogram on a solid gold-foil card | Gift-card / premium banner art, loading splash, box mockups |
| `24.png`, `24-2.png`, `Mockup.psd`, `mockup-2.psd` | Product/label mockups | Content team only |

**Lockups to export from the vector master** (SVG; `fill="currentColor"` so CSS tokens control colour):

1. `logo-full.svg`: monogram above the wordmark (the official vertical lockup). Used in the footer, about page, emails, invoices, and packing slips.
2. `logo-horizontal.svg`: monogram left, wordmark right, divided by a hairline (as on the lotion label). Used in the header on desktop.
3. `logo-mark.svg`: monogram only. Used in the mobile header, favicon, app icon, loader, and watermark.
4. `logo-wordmark.svg`: AALIQADR only. Used in the compact sticky header.

**Rules**
- Clear space = the height of the monogram's diamond dot on every side. Minimum size: monogram 24 px tall; full lockup 96 px tall.
- Colours: `#C4A044` gold (default), `#F5F0E6` ivory on dark/sign backgrounds, `#0B0A0F` obsidian on light. On sign themes the logo stays **gold or ivory**, never the sign colour; it is the constant across all 12 atmospheres.
- Embossed/foil PNGs are **imagery**, not logos. Never use them at small sizes or in the header (raster, heavy, poor contrast).
- Don't recreate the wordmark with a web font. Always use the SVG.
- Favicon/app icons are generated from `logo-mark.svg` on an obsidian rounded square: `app/icon.svg`, `app/apple-icon.png` (180), manifest icons 192/512 + a maskable 512 with safe padding.
- Motion: the loader draws the monogram stroke (SVG `stroke-dashoffset`) then fills it with a gold shimmer sweep (≤ 1.2 s, disabled under reduced motion).

## 2. Sun sign vs. rashi: an important product decision

Indian customers often say "rashi" to mean their **Vedic (sidereal) moon sign**, which differs from the Western **(tropical) sun sign** that most "zodiac by birth date" tools compute. Sidereal dates are shifted by roughly 23–24 days, and the moon sign needs birth time and place.

**Rule for the product:**
1. *Find by birth date* computes the **Western sun sign** (instant, client-side, no data stored).
2. A visible toggle, "I follow Vedic astrology / I know my rashi", shows the 12 rashi with Sanskrit names so the visitor picks directly.
3. Copy never claims the date finder gives the Vedic rashi.
4. Optional v2: a moon-sign calculator using birth time and place (needs an ephemeris library and must run client-side for privacy).

## 3. The twelve signs: reference table

| # | Sign (slug) | Rashi | Glyph | Western dates | Element | Modality | Ruling planet (traditional) | Gemstone (Vedic) |
|---|---|---|---|---|---|---|---|---|
| 1 | Aries (`aries`) | Mesh | ♈ | 21 Mar – 19 Apr | Fire | Cardinal | Mars | Red Coral |
| 2 | Taurus (`taurus`) | Vrishabh | ♉ | 20 Apr – 20 May | Earth | Fixed | Venus | Diamond / White Sapphire |
| 3 | Gemini (`gemini`) | Mithun | ♊ | 21 May – 20 Jun | Air | Mutable | Mercury | Emerald |
| 4 | Cancer (`cancer`) | Kark | ♋ | 21 Jun – 22 Jul | Water | Cardinal | Moon | Pearl |
| 5 | Leo (`leo`) | Simha | ♌ | 23 Jul – 22 Aug | Fire | Fixed | Sun | Ruby |
| 6 | Virgo (`virgo`) | Kanya | ♍ | 23 Aug – 22 Sep | Earth | Mutable | Mercury | Emerald |
| 7 | Libra (`libra`) | Tula | ♎ | 23 Sep – 22 Oct | Air | Cardinal | Venus | Diamond / Opal |
| 8 | Scorpio (`scorpio`) | Vrishchik | ♏ | 23 Oct – 21 Nov | Water | Fixed | Mars (modern: Pluto) | Red Coral |
| 9 | Sagittarius (`sagittarius`) | Dhanu | ♐ | 22 Nov – 21 Dec | Fire | Mutable | Jupiter | Yellow Sapphire |
| 10 | Capricorn (`capricorn`) | Makar | ♑ | 22 Dec – 19 Jan | Earth | Cardinal | Saturn | Blue Sapphire |
| 11 | Aquarius (`aquarius`) | Kumbh | ♒ | 20 Jan – 18 Feb | Air | Fixed | Saturn (modern: Uranus) | Blue Sapphire / Amethyst |
| 12 | Pisces (`pisces`) | Meen | ♓ | 19 Feb – 20 Mar | Water | Mutable | Jupiter (modern: Neptune) | Yellow Sapphire |

> Boundary dates vary by ±1 day year to year. The finder uses this table; copy says "approximately".

## 4. Element families: scent and material language

Element is the **first layer** of the design system. Each sign then adds its own palette and accents.

| Element | Scent direction (research consensus) | Morphism / material | Motion personality | Ambient effect |
|---|---|---|---|---|
| **Fire** (Aries, Leo, Sagittarius) | Bold, spicy, warm: saffron, pink pepper, cinnamon, incense, tuberose, amber | **Ember glassmorphism**: dark smoked glass, warm inner glow, gold rim light | Fast-in, confident: `spring(stiffness 260, damping 22)`, short 300–450 ms | Rising ember particles (CSS/canvas, ≤ 40 particles), heat-shimmer gradient |
| **Earth** (Taurus, Virgo, Capricorn) | Woody, rich, grounded: vetiver, sandalwood, patchouli, leather, iris, tonka | **Soft neumorphism / claymorphism**: matte stone surfaces, soft dual shadows, paper grain texture | Slow, weighted: ease `cubic-bezier(.22,1,.36,1)`, 600–900 ms | Drifting grain noise, slow parallax of botanical line-art |
| **Air** (Gemini, Libra, Aquarius) | Light, floral, airy: bergamot, neroli, orris, violet leaf, white musk, aldehydes | **Frosted glassmorphism**: high-blur light panes, pastel refraction edges | Floaty, playful: gentle float loops, stagger 60 ms | Soft cloud/aurora gradient, slow-drifting light orbs |
| **Water** (Cancer, Scorpio, Pisces) | Aquatic, deep, sensual: sea salt, lotus, ambergris accord, oud (Scorpio), fig, rain | **Liquid glass**: refractive blobs, caustic light, wet-sheen highlights | Fluid: long eases 700–1000 ms, morphing blob paths | Caustic shimmer (CSS gradient animation), ripple on hover |

## 5. Sign-by-sign brief

Each row is the perfumer, copy, and design brief. `Compatible` drives "pairs well with" and gifting duos.

### ♈ Aries · Mesh: *"Ember Crown"*
- **Character:** Pioneer, courageous, impulsive, magnetic
- **Notes:** Top: pink pepper, blood orange · Heart: saffron, red rose · Base: smoked amber, cedar
- **Intensity:** Strong · **Mood:** Ignition
- **Compatible:** Leo, Sagittarius, Gemini, Aquarius

### ♉ Taurus · Vrishabh: *"Velvet Earth"*
- **Character:** Sensual, loyal, indulgent, patient
- **Notes:** Top: pear, cardamom · Heart: rose absolute, iris · Base: tonka, sandalwood, suede
- **Intensity:** Moderate-rich · **Mood:** Comfort luxury
- **Compatible:** Virgo, Capricorn, Cancer, Pisces

### ♊ Gemini · Mithun: *"Twin Breeze"*
- **Character:** Curious, witty, dual, social
- **Notes:** Top: bergamot, yuzu, mint · Heart: neroli, lemongrass · Base: white musk, vetiver
- **Intensity:** Light-moderate · **Mood:** Spark
- **Compatible:** Libra, Aquarius, Aries, Leo

### ♋ Cancer · Kark: *"Moon Tide"*
- **Character:** Nurturing, intuitive, protective, nostalgic
- **Notes:** Top: sea salt, white peach · Heart: lotus, jasmine sambac · Base: ambrette, cashmere musk
- **Intensity:** Soft · **Mood:** Moonlit home
- **Compatible:** Scorpio, Pisces, Taurus, Virgo

### ♌ Leo · Simha: *"Solar Sovereign"*
- **Character:** Regal, generous, dramatic, warm
- **Notes:** Top: mandarin, saffron · Heart: tuberose, honeyed orange blossom · Base: golden amber, benzoin, labdanum
- **Intensity:** Strong · **Mood:** Spotlight
- **Compatible:** Aries, Sagittarius, Gemini, Libra

### ♍ Virgo · Kanya: *"Quiet Harvest"*
- **Character:** Precise, grounded, thoughtful, pure
- **Notes:** Top: green fig leaf, chamomile · Heart: iris, wheat accord · Base: vetiver, hinoki, clean musk
- **Intensity:** Moderate · **Mood:** Clarity
- **Compatible:** Taurus, Capricorn, Cancer, Scorpio

### ♎ Libra · Tula: *"Harmony Veil"*
- **Character:** Balanced, romantic, aesthetic, diplomatic
- **Notes:** Top: lychee, pink grapefruit · Heart: peony, violet, rose · Base: white amber, sheer woods
- **Intensity:** Light-moderate · **Mood:** Grace
- **Compatible:** Gemini, Aquarius, Leo, Sagittarius

### ♏ Scorpio · Vrishchik: *"Noir Abyss"*
- **Character:** Intense, mysterious, transformative, loyal
- **Notes:** Top: black plum, black pepper · Heart: dark rose, leather · Base: oud, patchouli, incense
- **Intensity:** Very strong · **Mood:** Seduction
- **Compatible:** Cancer, Pisces, Virgo, Capricorn

### ♐ Sagittarius · Dhanu: *"Wanderflame"*
- **Character:** Adventurous, optimistic, philosophical, free
- **Notes:** Top: grapefruit, juniper · Heart: cinnamon, cardamom, davana · Base: tobacco leaf, guaiac wood
- **Intensity:** Moderate-strong · **Mood:** Expedition
- **Compatible:** Aries, Leo, Libra, Aquarius

### ♑ Capricorn · Makar: *"Summit Oud"*
- **Character:** Ambitious, disciplined, timeless, reserved
- **Notes:** Top: bergamot, black tea · Heart: cypress, iris root · Base: oud, leather, vetiver
- **Intensity:** Strong · **Mood:** Authority
- **Compatible:** Taurus, Virgo, Scorpio, Pisces

### ♒ Aquarius · Kumbh: *"Electric Aether"*
- **Character:** Visionary, independent, eccentric, humane
- **Notes:** Top: aldehydes, ginger, ozonic accord · Heart: violet leaf, lavender · Base: ambroxan, mineral musk
- **Intensity:** Moderate · **Mood:** Future
- **Compatible:** Gemini, Libra, Aries, Sagittarius

### ♓ Pisces · Meen: *"Dream Lagoon"*
- **Character:** Dreamy, empathetic, artistic, spiritual
- **Notes:** Top: water lily, pear · Heart: magnolia, sea fennel · Base: driftwood, ambergris accord, soft vanilla
- **Intensity:** Soft-moderate · **Mood:** Reverie
- **Compatible:** Cancer, Scorpio, Taurus, Capricorn

## 6. Colour palettes & theme tokens

Every sign defines the **same token names**. Components only ever reference tokens, never hex values.

| Token | Purpose |
|---|---|
| `--z-bg` | Page background (dark-first; the luxury default) |
| `--z-surface` | Cards / panels (used with alpha for glass) |
| `--z-primary` | Sign's signature colour (CTA, highlights) |
| `--z-secondary` | Supporting colour |
| `--z-accent` | Metallic / jewel accent (borders, rim light) |
| `--z-text` | Primary text on `--z-bg` |
| `--z-muted` | Secondary text |
| `--z-on-primary` | Text on `--z-primary` buttons |
| `--z-glow` | Glow / shadow colour (used with alpha) |
| `--z-gradient` | Hero gradient (3 stops) |

| Sign | bg | surface | primary | secondary | accent | text | glow | Gradient (hero) |
|---|---|---|---|---|---|---|---|---|
| Aries | `#12060A` | `#1E0B10` | `#C8102E` | `#FF6B35` | `#E8B04A` | `#FBEDE6` | `#FF3D2E` | `#3A0A12 → #C8102E → #FF6B35` |
| Taurus | `#0C120C` | `#152016` | `#3E7C4F` | `#C9A9A6` | `#D4B483` | `#F3EFE6` | `#7FB685` | `#132417 → #3E7C4F → #C9A9A6` |
| Gemini | `#0F0E08` | `#1C1A10` | `#F2C230` | `#9BD0E8` | `#E8E2C9` | `#FFFBEA` | `#FFE27A` | `#2B2810 → #F2C230 → #9BD0E8` |
| Cancer | `#0A0D14` | `#141A26` | `#C7CED9` | `#8FB7C9` | `#E6E2D8` | `#F4F6FA` | `#CFE3F2` | `#101828 → #8FB7C9 → #E6E2D8` |
| Leo | `#120C04` | `#1F1608` | `#D4A017` | `#E86A17` | `#F6D58B` | `#FFF7E6` | `#FFC24A` | `#2A1A05 → #D4A017 → #E86A17` |
| Virgo | `#0E0F0B` | `#191B14` | `#7A8B5C` | `#B79F7C` | `#DCD3BE` | `#F2F0E8` | `#A7B98A` | `#1C2016 → #7A8B5C → #DCD3BE` |
| Libra | `#100B12` | `#1C1420` | `#E3A6C0` | `#A9B8E8` | `#F1D7C8` | `#FCF3F6` | `#F2BCD4` | `#2A1A2E → #E3A6C0 → #A9B8E8` |
| Scorpio | `#0A0507` | `#16090E` | `#C2264F` | `#2B0F3A` | `#B08D57` | `#F2E6EA` | `#A3133F` | `#07030A → #2B0F3A → #6E0E2A` |
| Sagittarius | `#0E0814` | `#1A1024` | `#8A5BC7` | `#E07A3F` | `#E6C27A` | `#F6EEFB` | `#9E6BDB` | `#1C0E2C → #6B3FA0 → #E07A3F` |
| Capricorn | `#0B0C0A` | `#151713` | `#5E7A6A` | `#6B5440` | `#A8A29A` | `#EEEDE8` | `#5E7A6A` | `#0F130F → #2F3E36 → #6B5440` |
| Aquarius | `#060B14` | `#0E1626` | `#2E8BFF` | `#7DF9FF` | `#C0C8D8` | `#EEF5FF` | `#4FA8FF` | `#08132B → #2E8BFF → #7DF9FF` |
| Pisces | `#06100F` | `#0E1C1B` | `#3FB8AF` | `#9C8CD9` | `#D8F1EC` | `#EFFBF9` | `#66D9CF` | `#0A2422 → #3FB8AF → #9C8CD9` |

> **Implemented:** `src/config/zodiac.ts` is now the source of truth (it also defines `muted` and `onPrimary` per sign). During build-out the WCAG test (`tests/zodiac.test.ts`) changed four values: Scorpio, Sagittarius and Capricorn primaries were brightened (the originals were < 3:1 against their backgrounds, so buttons were nearly invisible), and Virgo uses dark text on its button. Hero gradients are unchanged.

**Rules**
- Light variants (`[data-mode="light"]`) are derived by swapping `bg/surface` for ivory tints of `secondary`, and `text` for the sign's darkest shade. Dark is the default luxury mode.
- `--z-on-primary` is chosen per sign to reach **≥ 4.5:1** contrast. Light primaries (Gemini, Cancer, Libra, Pisces) use dark text on buttons. A CI script checks every pair (doc 15).
- Gradients and glows are decorative. Text never sits directly on the brightest gradient stop without a scrim.

## 7. Per-sign motion & ambient spec

| Sign | Ambient layer (hero) | Signature micro-interaction | Glyph animation |
|---|---|---|---|
| Aries | Ember particles rising | CTA "ignites" (glow sweep) on hover | Ram horns draw-on (SVG stroke) |
| Taurus | Slow grain + floating petals | Cards press in (neumorphic) | Glyph settles with weight |
| Gemini | Two orbs orbiting each other | Content toggles between two "faces" | Glyph splits and rejoins |
| Cancer | Moon phase cycling, tide line | Ripple on tap | Crescent fills |
| Leo | Sun rays rotating slowly (CSS conic) | Gold shimmer sweep on price | Mane radiates |
| Virgo | Botanical line-art parallax | Clean underline draws | Precise stroke draw |
| Libra | Balanced scale sway, pastel aurora | Elements balance into place | Scale tips and centers |
| Scorpio | Smoke (low-opacity noise) + deep vignette | Reveal-on-hover from darkness | Stinger curl |
| Sagittarius | Star-trail arcs | Arrow-flight page transitions | Arrow fires |
| Capricorn | Mountain silhouette parallax | Stone-slab card lift | Glyph carved in |
| Aquarius | Electric wave lines, glitch shimmer | Pour/flow transitions | Waves pulse |
| Pisces | Two fish circling in liquid blob | Liquid blob cursor on desktop | Fish swim loop |

All ambient layers are **CSS or tiny canvas**, paused when off-screen (`IntersectionObserver`) and disabled entirely under `prefers-reduced-motion` or `Save-Data`.

## 8. Packaging & photography direction (for the content team)

- One hero photo per sign shot on its own palette backdrop, plus a neutral ivory "catalogue" shot for marketplace feeds and OG fallbacks.
- Required assets per fragrance: hero (4:5 and 16:9), bottle front, bottle angle, box, texture/ingredient still life (2), lifestyle (2), and a 6–10 s silent loop video (≤ 2 MB, WebM/MP4, poster image).
- Deliver masters as 3000 px PNG/TIFF. The upload pipeline produces web formats (doc 12).
- The existing label system (`2nd label.jpg`, `Final Labels.pdf`) shows the established layout of monogram, wordmark, and legal block. Reuse its legal block content for the product page "Details & Legal" section so listing and pack match (doc 14 §3).

## 9. Engineering contract

```ts
// src/config/zodiac.ts (shape only; values from §3–§7)
export type Element = "fire" | "earth" | "air" | "water";
export type ZodiacSlug =
  | "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo"
  | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";

export interface ZodiacSign {
  slug: ZodiacSlug;
  name: string;            // "Aries"
  rashi: string;           // "Mesh"
  glyph: string;           // "♈"
  dateRange: { start: [month: number, day: number]; end: [number, number] };
  element: Element;
  modality: "cardinal" | "fixed" | "mutable";
  rulingPlanet: string;
  gemstone: string;
  traits: string[];
  compatible: ZodiacSlug[];
  theme: {
    bg: string; surface: string; primary: string; secondary: string; accent: string;
    text: string; muted: string; onPrimary: string; glow: string; gradient: [string, string, string];
  };
  motion: { ambient: string; easing: string; durationMs: number };
}
export const ZODIAC: Record<ZodiacSlug, ZodiacSign> = { /* … */ };
```

The themes live **in code**, not the database: there are exactly 12, they change rarely, and keeping them in code means zero DB reads, type safety, and build-time CSS. Admins choose a sign for a product; they cannot invent a 13th theme. Optional per-product overrides (e.g. a limited-edition accent) live on the product document (doc 04).
