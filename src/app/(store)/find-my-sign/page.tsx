import type { Metadata } from "next";
import { SignFinder } from "@/components/zodiac/SignFinder";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/jsonld";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Find Your Zodiac Sign & Perfume Match | Vedic Moon Sign & Sun Sign Calculator",
  description:
    "Discover your signature scent with high astronomical precision. Enter your birth date, time, and city to calculate your Vedic Moon Sign (Chandra Rashi), Nakshatra, and Pada, or explore your Western Sun sign.",
  keywords: [
    "find my zodiac perfume",
    "vedic moon sign calculator",
    "chandra rashi perfume finder",
    "nakshatra fragrance finder",
    "astrology fragrance finder",
    "perfume for my birth date",
    "zodiac scent quiz",
    "luxury astrological perfumes",
  ],
  alternates: { canonical: "/find-my-sign" },
  openGraph: {
    title: "Find Your Zodiac Sign & Perfume Match | Aaliqadr",
    description: "Calculate your Vedic Moon Sign (Chandra Rashi) or Western Sun Sign to reveal your signature Extrait de Parfum.",
    url: "/find-my-sign",
    type: "website",
  },
};

const FINDER_FAQS = [
  {
    question: "What is the difference between Vedic Moon Sign and Western Sun Sign?",
    answer:
      "Western astrology determines your zodiac sign by the position of the Sun on your birth date. In Indian Vedic astrology (Jyotish), your primary sign is your Moon Sign (Chandra Rashi), calculated from the exact position of the Moon at your birth time. Since the Moon changes constellations every 2.25 days, the Vedic Moon sign offers deeper emotional and spiritual alignment.",
  },
  {
    question: "How does the Aaliqadr Vedic Moon Sign calculator work?",
    answer:
      "Our calculator uses 35-term astronomical lunar ephemeris equations combined with the standard Lahiri (Chitra Paksha) Ayanamsa. By calculating your exact Julian Day and planetary perturbation factors, it determines your Chandra Rashi, Janam Nakshatra (1 of 27), Pada (1 of 4), and constitutional attributes.",
  },
  {
    question: "Why should I verify system-generated astrological calculations with an astrologer?",
    answer:
      "System-generated calculations use mathematical algorithms that approximate planetary positions. Variations in exact birth timing (even a few minutes on cusp dates), geographical latitude/longitude adjustments, and different ayanamsa systems (Lahiri, Raman, KP) can result in differences. We always recommend confirming with your personal astrologer or panditji for formal horoscope readings.",
  },
  {
    question: "Is my birth date or time stored or tracked when I use this tool?",
    answer:
      "No. The entire calculation executes purely inside your local browser. No personal birth details, dates, times, or cities are recorded, transmitted, or stored on our servers.",
  },
];

export default function FindMySignPage() {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate flex min-h-[46vh] sm:min-h-[52vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-14 text-center bg-[#060508]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[500px] w-[500px] sm:h-[650px] sm:w-[650px] rounded-full bg-gold/[0.12] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-4 sm:mb-5 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>ASTRONOMICAL EPHEMERIS · ALCHEMICAL MATCH</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Which fragrance is written for you?{" "}
              <span className="italic font-light text-[#E0C892]">
                In your stars.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Enter your birth moment to calculate your precise Vedic Moon Sign (Chandra Rashi), Janam Nakshatra, and ruling element — or explore by your Western Sun sign.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 2. CALCULATOR WORKSPACE (DEEP OBSIDIAN) ── */}
      <section className="relative bg-[#060508] pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SignFinder />
        </div>
      </section>

      {/* ── 3. WARM PARCHMENT WHITE SECTION: ASTROLOGICAL FAQS ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-t border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.26em] text-[#73531F] font-semibold uppercase mb-2 flex items-center justify-center gap-2">
              <span className="size-1 rounded-full bg-[#73531F]" />
              <span>ASTRONOMICAL SCIENCE</span>
              <span className="size-1 rounded-full bg-[#73531F]" />
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#17130F]">
              Ephemeris & Vedic Knowledge
            </h2>
          </Reveal>

          <div className="space-y-4">
            {FINDER_FAQS.map((faq, i) => (
              <Reveal key={faq.question} delay={i * 0.05}>
                <div className="rounded-2xl border border-[#E8E2D5] bg-white p-6 sm:p-7 shadow-[0_4px_20px_rgba(23,19,15,0.04)]">
                  <h3 className="font-display text-lg sm:text-xl font-normal text-[#17130F] mb-2.5">
                    {faq.question}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Find My Sign", path: "/find-my-sign" },
        ])}
      />
      <JsonLd data={faqLd(FINDER_FAQS)} />
    </div>
  );
}
