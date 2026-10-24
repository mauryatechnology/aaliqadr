import type { Metadata } from "next";
import { SignFinder } from "@/components/zodiac/SignFinder";
import { PageHero } from "@/components/layout/PageHero";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/jsonld";

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
    <>
      <PageHero
        eyebrow="Find Your Sign · Astrological Match"
        title="Which fragrance is written for you?"
        align="center"
      />
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <SignFinder />
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Find My Sign", path: "/find-my-sign" },
        ])}
      />
      <JsonLd data={faqLd(FINDER_FAQS)} />
    </>
  );
}
