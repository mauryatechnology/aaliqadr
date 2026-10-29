import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/config/site";
import { getBusiness } from "@/server/queries/business";
import { SIGNS, type ZodiacSlug } from "@/config/zodiac";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { routes } from "@/lib/routes";
import { NewsletterIngress } from "./NewsletterIngress";

const RASHI_DEVANAGARI: Record<string, string> = {
  aries: "मेष",
  taurus: "वृषभ",
  gemini: "मिथुन",
  cancer: "कर्क",
  leo: "सिंह",
  virgo: "कन्या",
  libra: "तुला",
  scorpio: "वृश्चिक",
  sagittarius: "धनु",
  capricorn: "मकर",
  aquarius: "कुम्भ",
  pisces: "मीन",
};

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function PinterestIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M12 9a4 4 0 1 1 4 4c-1.5 0-2.5-.5-3.5-1.5" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function YouTubeIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    handle: "@aaliqadrofficial",
    href: site.social.instagram || "https://instagram.com/aaliqadrofficial",
    icon: InstagramIcon,
    label: "Follow Aaliqadr on Instagram",
  },
  {
    name: "WhatsApp Concierge",
    handle: "+91 89826 75004",
    href: "https://wa.me/918982675004?text=Hello%20Aaliqadr%20Atelier%2C%20I%20would%20like%20guidance%20on%20my%20fragrance%20selection.",
    icon: WhatsAppIcon,
    label: "Connect with Atelier VIP Concierge on WhatsApp",
  },
  {
    name: "Pinterest",
    handle: "aaliqadrparfum",
    href: "https://pinterest.com/aaliqadrofficial",
    icon: PinterestIcon,
    label: "Explore Olfactory Moodboards on Pinterest",
  },
  {
    name: "YouTube",
    handle: "@aaliqadrmaison",
    href: site.social.youtube || "https://youtube.com/@aaliqadrofficial",
    icon: YouTubeIcon,
    label: "Watch Flacon Craft & Maceration Films on YouTube",
  },
  {
    name: "X (Twitter)",
    handle: "@aaliqadrofficial",
    href: "https://x.com/aaliqadrofficial",
    icon: XIcon,
    label: "Follow Maison Announcements on X",
  },
];

/**
 * Haute-Parfumerie Luxury Footer
 * 1. The Four Pillars of the House (Extrait 28%, Climate Transit, 256-Bit Checkout, Gift Presentation)
 * 2. The Celestial Ingress (Private Allocation & Solstice Salon)
 * 3. 4-Column Directory: Maison Identity & Social Sanctuary, 12 Signatures with Glyphs, Creations, Concierge Care
 * 4. Regal Colophon with Hand-poured Inscription & Trust Seals
 */
export async function Footer() {
  const b = await getBusiness();

  return (
    <footer className="relative border-t border-gold/20 bg-bg text-ivory overflow-hidden">
      {/* Soft celestial starlight ambient veil across top of footer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(201,169,110,0.07)_0%,transparent_75%)]"
      />

      {/* 1. The Four Pillars of the House */}
      <div className="relative z-10 border-b border-gold/15 bg-surface/20">
        <div className="mx-auto grid max-w-[1360px] px-4 sm:px-6 lg:px-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gold/15">
          {/* Pillar 1 */}
          <div className="group flex items-start gap-4 p-6 sm:py-8 transition-colors duration-300 hover:bg-gold/[0.03]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] text-gold shadow-[0_0_14px_rgba(201,169,110,0.12)] transition-all duration-300 group-hover:border-gold group-hover:bg-gold/15">
              <svg
                className="size-4.5 stroke-[1.25]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory font-medium transition-colors group-hover:text-gold">
                Extrait de Parfum (28%)
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-ivory/75 font-light leading-relaxed">
                Artisanal high maceration for 12+ hour celestial sillage
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="group flex items-start gap-4 p-6 sm:py-8 transition-colors duration-300 hover:bg-gold/[0.03]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] text-gold shadow-[0_0_14px_rgba(201,169,110,0.12)] transition-all duration-300 group-hover:border-gold group-hover:bg-gold/15">
              <svg
                className="size-4.5 stroke-[1.25]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10" />
                <circle cx="17" cy="18.5" r="2.5" />
                <circle cx="7" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory font-medium transition-colors group-hover:text-gold">
                Pan-India Climate Transit
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-ivory/75 font-light leading-relaxed">
                Complimentary temperature-guarded door delivery
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="group flex items-start gap-4 p-6 sm:py-8 transition-colors duration-300 hover:bg-gold/[0.03]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] text-gold shadow-[0_0_14px_rgba(201,169,110,0.12)] transition-all duration-300 group-hover:border-gold group-hover:bg-gold/15">
              <svg
                className="size-4.5 stroke-[1.25]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory font-medium transition-colors group-hover:text-gold">
                256-Bit Encrypted Sanctuary
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-ivory/75 font-light leading-relaxed">
                Secure UPI, Netbanking & Private Cards
              </p>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="group flex items-start gap-4 p-6 sm:py-8 transition-colors duration-300 hover:bg-gold/[0.03]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] text-gold shadow-[0_0_14px_rgba(201,169,110,0.12)] transition-all duration-300 group-hover:border-gold group-hover:bg-gold/15">
              <svg
                className="size-4.5 stroke-[1.25]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M12 8v13" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory font-medium transition-colors group-hover:text-gold">
                Presentation Ready
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-ivory/75 font-light leading-relaxed">
                Rigid gold-foil box with astrological birth chart
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. The Celestial Ingress (Private Salon Newsletter) */}
      <div className="relative z-10 border-b border-gold/10 px-6 py-12 sm:py-14">
        <div className="mx-auto flex max-w-[1360px] px-4 sm:px-6 lg:px-10 flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="space-y-1.5 text-center lg:text-left">
            <p className="eyebrow flex items-center justify-center lg:justify-start gap-2 text-gold font-medium tracking-[0.26em] text-xs">
              <span className="text-[10px]">✦</span>
              <span>The Celestial Ingress</span>
              <span className="text-[8px]">✦</span>
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-light text-ivory tracking-tight">
              Private batch allocations & seasonal solstices
            </h3>
            <p className="font-sans text-xs sm:text-sm text-muted font-light max-w-lg">
              Receive private bottling allocations, planetary transit insights, and bespoke fragrance consultations.
            </p>
          </div>

          {/* Interactive Champagne Hairline Email Input with UX Feedback */}
          <NewsletterIngress />
        </div>
      </div>

      {/* 3. Four Editorial Columns */}
      <div className="relative z-10 mx-auto grid max-w-[1360px] grid-cols-1 gap-10 sm:gap-12 px-4 sm:px-6 lg:px-10 py-16 sm:py-20 md:grid-cols-2 lg:grid-cols-4">
        {/* Column 1: Maison Wordmark, Lore & Social Sanctuary */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Logo variant="mark" className="h-9 w-auto text-gold drop-shadow-[0_0_16px_rgba(201,169,110,0.4)]" />
            <span aria-hidden="true" className="h-7 w-px bg-gold/30" />
            <div className="flex flex-col">
              <Logo variant="wordmark" className="h-5.5 w-auto text-ivory" />
              <span className="font-caps text-[10px] uppercase tracking-[0.24em] text-gold font-medium mt-1">
                Maison de Parfum · 28% Extrait
              </span>
            </div>
          </div>
          <p className="max-w-xs font-sans text-xs sm:text-sm text-ivory/85 font-normal leading-relaxed">
            A quiet niche perfume house crafting twelve Extrait de Parfum signatures, one for every zodiac sign and Vedic rashi. Hand-poured with noble botanicals in India.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 border border-gold/25 bg-gold/[0.04] px-3 py-1 font-caps text-xs uppercase tracking-[0.18em] text-gold font-medium">
              <span className="text-[7px]">✦</span>
              <span>Batch Numbered</span>
            </span>
            <span className="inline-flex items-center gap-1.5 border border-line bg-surface/50 px-3 py-1 font-caps text-xs uppercase tracking-[0.18em] text-muted font-normal">
              <span>IFRA Certified</span>
            </span>
          </div>

          {/* Social Sanctuary Links */}
          <div className="pt-3 border-t border-gold/15 space-y-2.5">
            <p className="font-caps text-[10px] uppercase tracking-[0.22em] text-gold font-medium flex items-center gap-1.5">
              <span className="text-[8px]">✦</span>
              <span>The Social Sanctuary</span>
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {SOCIAL_LINKS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.name}
                    className="flex size-9 items-center justify-center rounded-full border border-gold/30 bg-surface/70 text-gold transition-all duration-300 hover:scale-110 hover:border-gold hover:bg-gold/15 hover:text-gold-soft hover:shadow-[0_0_14px_rgba(201,169,110,0.35)]"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>

            {/* Direct WhatsApp Concierge Pill */}
            <div className="pt-1">
              <a
                href="https://wa.me/918982675004?text=Hello%20Aaliqadr%20Atelier%2C%20I%20would%20like%20guidance%20on%20my%20fragrance%20selection."
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 hover:bg-gold hover:text-obsidian px-3.5 py-1.5 font-caps text-[10px] uppercase tracking-wider text-gold transition-all duration-200 shadow-sm"
              >
                <WhatsAppIcon className="size-3.5" />
                <span>VIP Concierge: +91 89826 75004</span>
              </a>
            </div>
          </div>
        </div>

        {/* Column 2: The 12 Signs with Bespoke Gold Medallions & Rashis */}
        <div className="space-y-4">
          <h3 className="font-caps text-xs font-semibold uppercase tracking-[0.22em] text-gold flex items-center gap-2">
            <span>The 12 Signatures</span>
            <span aria-hidden="true" className="h-px flex-1 bg-gold/15" />
          </h3>
          <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs">
            {SIGNS.map((s) => (
              <Link
                key={s.slug}
                href={routes.sign(s.slug)}
                className="group flex items-center gap-2.5 rounded-lg py-1.5 px-2 -mx-2 transition-all duration-200 hover:bg-gold/[0.08]"
              >
                {/* Fine-line Gold Micro-Medallion with Authentic Gold Vector Glyph */}
                <span
                  aria-hidden="true"
                  className="relative flex size-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-[#1C1714] via-[#14100E] to-[#0D0B0A] text-gold shadow-[inset_0_1px_1px_rgba(255,245,225,0.1),0_2px_6px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:scale-110 group-hover:border-gold group-hover:shadow-[0_0_10px_rgba(201,169,110,0.4)]"
                >
                  <ZodiacGoldGlyph
                    sign={s.slug as ZodiacSlug}
                    className="size-3.5"
                  />
                </span>

                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="font-caps text-[12px] sm:text-[12.5px] font-medium tracking-[0.04em] text-ivory/95 transition-colors group-hover:text-gold truncate">
                    {s.name}
                  </span>
                  <span className="font-rashi text-[11.5px] font-normal text-gold-soft/90 transition-colors group-hover:text-gold whitespace-nowrap">
                    ({RASHI_DEVANAGARI[s.slug] ?? s.rashi})
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Column 3: Creations & Curated Journey */}
        <div className="space-y-4">
          <h3 className="font-caps text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-gold flex items-center gap-2">
            <span>Creations & Journey</span>
            <span aria-hidden="true" className="h-px flex-1 bg-gold/20" />
          </h3>
          <ul className="space-y-3 text-xs sm:text-[13.5px] font-normal text-ivory/85">
            <li>
              <Link href="/zodiac" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>The Astrological Zodiac</span>
              </Link>
            </li>
            <li>
              <Link href="/shop" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>All Extrait Creations</span>
              </Link>
            </li>
            <li>
              <Link href="/collections" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Curated Elemental Collections</span>
              </Link>
            </li>
            <li>
              <Link href={routes.product("zodiac-discovery-coffret")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Zodiac Discovery Coffret (12 x 2ml)</span>
              </Link>
            </li>
            <li>
              <Link href="/find-my-sign" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Find My Sign Calculator</span>
              </Link>
            </li>
            <li>
              <Link href="/about" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Our Craft & 28% Extrait Heritage</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Client Concierge & Policies */}
        <div className="space-y-4">
          <h3 className="font-caps text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-gold flex items-center gap-2">
            <span>Concierge & Policies</span>
            <span aria-hidden="true" className="h-px flex-1 bg-gold/20" />
          </h3>
          <ul className="space-y-3 text-xs sm:text-[13.5px] font-normal text-ivory/85">
            <li>
              <Link href="/contact" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Personal Concierge & Inquiries</span>
              </Link>
            </li>
            <li>
              <Link href="/faq" className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Atelier FAQ</span>
              </Link>
            </li>
            <li>
              <Link href={routes.policy("shipping")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Complimentary Climate Shipping</span>
              </Link>
            </li>
            <li>
              <Link href={routes.policy("returns")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Returns & Authenticity Guarantee</span>
              </Link>
            </li>
            <li>
              <Link href={routes.policy("privacy")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Privacy & Data Sanctuary</span>
              </Link>
            </li>
            <li>
              <Link href={routes.policy("terms")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Terms of Service</span>
              </Link>
            </li>
            <li>
              <Link href={routes.policy("grievance")} className="group flex items-center gap-2.5 transition-all duration-200 hover:text-gold hover:translate-x-1">
                <span className="text-gold text-[10px] shrink-0 transition-transform group-hover:scale-125">✦</span>
                <span>Grievance Redressal</span>
              </Link>
            </li>
          </ul>

          <div className="pt-2.5 flex items-center gap-2 text-xs sm:text-[12.5px] text-ivory/80 font-medium border-t border-gold/15">
            <span className="size-1.5 rounded-full bg-gold/80 animate-pulse" />
            <span>Atelier Inquiries: {site.support.hours}</span>
          </div>
        </div>
      </div>

      {/* 4. Hairline Divider & Legal Colophon */}
      <div className="relative z-10 border-t border-gold/15 bg-black/50">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 sm:px-6 lg:px-10 py-8 text-xs font-light text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <p className="font-caps text-xs uppercase tracking-[0.18em] text-ivory/90">
              © {site.name} · MMXXVI
            </p>
            <span aria-hidden="true" className="hidden sm:inline-block text-gold/30">·</span>
            <p className="text-muted/90">
              {b.legalName}, {b.city}, {b.state}, {site.legal.country}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-gold font-caps text-xs uppercase tracking-[0.18em]">
            <span>28% Extrait de Parfum</span>
            <span aria-hidden="true" className="text-gold/30">·</span>
            <span>All Taxes Included</span>
            <span aria-hidden="true" className="text-gold/30">·</span>
            <span>Hand-Poured in Bharat</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
