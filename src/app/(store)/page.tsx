import type { Metadata } from "next";
import Link from "next/link";
import { faqLd, JsonLd, organizationLd, websiteLd } from "@/lib/jsonld";
import { getProductCards } from "@/server/queries/catalog";
import { Reveal } from "@/components/motion/Reveal";
import { HeroLuxury } from "@/components/home/HeroLuxury";
import { EditorialMarqueeTicker } from "@/components/home/EditorialMarqueeTicker";
import { CosmicRashiStrip } from "@/components/home/CosmicRashiStrip";
import { FeaturedLuxuryFragrances } from "@/components/home/FeaturedLuxuryFragrances";
import { ShopByElement } from "@/components/home/ShopByElement";
import { BrandStorySplit } from "@/components/home/BrandStorySplit";
import { FirstOrderPromoBanner } from "@/components/home/FirstOrderPromoBanner";
import { BrandCraftSection } from "@/components/home/BrandCraftSection";

export const metadata: Metadata = {
  title: "Aaliqadr: Luxury Zodiac Perfumes & Extrait de Parfum | Crafted for Your Rashi",
  description:
    "Twelve luxury Extrait de Parfum signatures crafted for the twelve zodiac signs and Vedic rashis. 28% oil concentration for 12+ hour longevity. Free shipping across India.",
  keywords: [
    "zodiac perfume",
    "rashi perfume",
    "luxury perfume India",
    "extrait de parfum",
    "long lasting perfume",
    "astrology fragrance",
    "zodiac birthday gift",
    "discovery coffret perfume",
    "scent for your rashi",
    "niche fragrance India",
    "perfume for aries leo scorpio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aaliqadr: Luxury Zodiac Perfumes & Extrait de Parfum",
    description:
      "Twelve bespoke signatures, one for every rashi. Extrait de Parfum with 28% concentration made in India.",
    url: "/",
    type: "website",
  },
};

const HOME_FAQS = [
  {
    question: "How do I choose the right perfume for my zodiac sign or Vedic rashi?",
    answer:
      "Every Aaliqadr fragrance is formulated around the element (Fire, Earth, Air, Water), ruling planet, and temperament of its sign. You can find your fragrance by selecting your Western sun sign or your Vedic Chandra rashi using our Find My Sign calculator, or simply by exploring the notes of your ruling element.",
  },
  {
    question: "What is an Extrait de Parfum and how does 28% concentration compare?",
    answer:
      "An Extrait de Parfum contains 20% to 40% aromatic fragrance oils. At 28% oil concentration, Aaliqadr sits at the highest tier of luxury perfumery (substantially richer than standard Eau de Parfum at 15–20%). This ensures intimate projection, slow unfolding, and 12+ hours of lingering presence on skin and fabric.",
  },
  {
    question: "Are your fragrance oils natural, IFRA-compliant, and artisanal?",
    answer:
      "Yes. We compose using wild-harvested botanicals, noble absolutes, and responsibly aged resins alongside safe, bio-identical aroma molecules. All formulas are rigorously IFRA-certified, cruelty-free, hand-poured in small batches, and aged for forty-five days to achieve celestial balance.",
  },
  {
    question: "How does complimentary climate-controlled shipping work across India?",
    answer:
      "Fine natural fragrances are sensitive to extreme heat and transit shocks. Every Aaliqadr order is packaged in insulated, thermal-protected outer cartons and shipped via express air partners across Pan-India with real-time GPS tracking and signature on delivery.",
  },
  {
    question: "Can I sample all twelve signatures before buying a 50ml flacon?",
    answer:
      "Yes! Our Zodiac Discovery Coffret features luxury miniature flacons of all twelve signatures. It allows you to explore the full astrological wheel, layer compatible signs, and find your favorite signature from home.",
  },
  {
    question: "What is the return and authenticity guarantee policy?",
    answer:
      "Every bottle arrives with a tamper-evident gold seal and a matching 2ml sample vial. You can test the sample first; if the fragrance does not resonate with your spirit, you may return the unopened 50ml flacon within 7 days for a full refund.",
  },
];

export default async function HomePage() {
  const products = (await getProductCards()).filter((p) => p.type === "fragrance");

  return (
    <div className="relative overflow-clip text-ivory bg-[#060508]">
      {/* 1. Ultra-Luxury Hero: "Your Rashi. Your Signature Scent." */}
      <HeroLuxury />

      {/* 2. Editorial Kinetic Marquee Ticker (zodiacperfumes.com high-fashion style) */}
      <EditorialMarqueeTicker />

      {/* 3. Choose Your Rashi: 12 Rashi Quick Selector Strip in Warm Parchment */}
      <CosmicRashiStrip />

      {/* 4. Featured Collection: Luxury Fragrances with Element Tabs & direct Add-to-Cart */}
      <FeaturedLuxuryFragrances products={products} />

      {/* 5. Shop by Element: Fire, Earth, Air, Water (White/Warm Parchment Theme) */}
      <ShopByElement />

      {/* 6. Brand Story & 4 Pillars Split: Where Fragrance Meets Astrology */}
      <BrandStorySplit />

      {/* 7. First Order Promotion Banner: Get 10% Off with WELCOME10 */}
      <FirstOrderPromoBanner />

      {/* 8. Brand Craft & Monogram Heritage: The Drop that Holds a Sky (Black Luxury Theme) */}
      <BrandCraftSection />

      {/* 9. Haute-Parfumerie Atelier Inquiries & FAQ (White / Warm-Parchment Theme) */}
      <HomeFaq />

      {/* Structured SEO Schema */}
      <JsonLd data={websiteLd()} />
      <JsonLd data={organizationLd()} />
      <JsonLd data={faqLd(HOME_FAQS)} />
    </div>
  );
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

/**
 * Frequently Asked Questions (Haute-Parfumerie Atelier Inquiries)
 * - White / Warm-Parchment Luxury Theme (#FAF7F2)
 * - Pure white cards with delicate champagne borders (#E8E2D5)
 * - Warm antique gold Roman numerals & high-contrast typography
 */
function HomeFaq() {
  return (
    <section className="relative overflow-hidden bg-[#FAF7F2] text-[#17130F] py-16 sm:py-20 lg:py-28 border-t border-[#E8E2D5]">
      {/* Subtle warm champagne ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-full max-w-[1000px] bg-gradient-to-r from-transparent via-[#73531F]/[0.06] to-transparent blur-[70px]" />
      </div>

      <div className="relative mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 z-10">
        {/* Editorial Section Header */}
        <Reveal className="mb-14 sm:mb-16 text-center">
          <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#73531F] font-semibold uppercase mb-3 flex items-center justify-center gap-2">
            <span aria-hidden className="text-[#73531F] text-[10px]">✦</span>
            <span>ATELIER INQUIRIES</span>
            <span aria-hidden className="text-[#73531F] text-[10px]">✦</span>
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight">
            Understanding Aaliqadr
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#423B33] font-normal max-w-[65ch] mx-auto leading-relaxed">
            Essential knowledge regarding our 28% Extrait de Parfum signatures, astrological alchemy, and artisanal bottling.
          </p>
        </Reveal>

        {/* Crisp White Luxury Accordion Cards */}
        <div className="space-y-4">
          {HOME_FAQS.map((faq, i) => (
            <Reveal key={faq.question} delay={i * 0.05}>
              <details
                className="group relative overflow-hidden rounded-2xl border border-[#E8E2D5] bg-white p-6 sm:p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all duration-300 ease-lux hover:border-[#73531F]/40 hover:shadow-[0_8px_24px_rgba(115,83,31,0.08)] open:border-[#73531F]/60 open:shadow-[0_12px_32px_rgba(115,83,31,0.12)]"
                open={i === 0}
              >
                {/* Subtle warm cream-gold ambient gradient on open */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FFFDF9] to-white opacity-0 transition-opacity duration-300 group-open:opacity-100"
                />

                {/* Summary / Question Header */}
                <summary className="relative z-10 flex cursor-pointer list-none items-center justify-between gap-4 text-left [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3.5 sm:gap-4.5">
                    {/* Roman Numeral Index */}
                    <span className="font-caps text-xs sm:text-[13px] font-semibold tracking-[0.25em] text-[#73531F] select-none shrink-0">
                      {ROMAN_NUMERALS[i] ?? `0${i + 1}`}
                    </span>
                    <span aria-hidden className="hidden sm:inline-block h-3.5 w-px bg-[#73531F]/25 shrink-0" />
                    {/* Question text */}
                    <span className="font-display text-lg sm:text-xl font-normal text-[#17130F] transition-colors duration-200 group-hover:text-[#73531F]">
                      {faq.question}
                    </span>
                  </div>

                  {/* Circular Gold Toggle Button */}
                  <span className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full border border-[#73531F]/30 bg-[#73531F]/10 text-[#73531F] transition-all duration-300 group-hover:border-[#73531F] group-hover:bg-[#73531F] group-hover:text-white group-open:rotate-180 group-open:bg-[#73531F] group-open:text-white shadow-xs">
                    <svg
                      className="size-3.5 stroke-[2]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </summary>

                {/* Answer Content */}
                <div className="relative z-10 mt-4.5 pt-4.5 border-t border-[#E8E2D5]">
                  <p className="text-base font-normal text-[#2E2822] leading-relaxed pl-1 sm:pl-7 max-w-[65ch]">
                    {faq.answer}
                  </p>
                </div>
              </details>
            </Reveal>
          ))}
        </div>

        {/* Concierge Inquiries Note */}
        <Reveal delay={0.25} className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D5] bg-white px-6 sm:px-8 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <span className="text-xs sm:text-sm text-[#423B33] font-normal">
              Have a question regarding your astrological placement or bespoke gifting?
            </span>
            <Link
              href="/contact"
              className="text-xs sm:text-sm font-medium text-[#73531F] hover:text-[#5E4723] underline underline-offset-4 decoration-[#73531F]/40 hover:decoration-[#73531F] transition-colors"
            >
              Consult our Concierge →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
