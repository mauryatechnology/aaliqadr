import type { Metadata } from "next";
import { SignFinder } from "@/components/zodiac/SignFinder";
import { PageHero } from "@/components/layout/PageHero";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Find Your Zodiac Sign & Perfume Match | Birth Date & Rashi Calculator",
  description:
    "Discover your signature scent in seconds. Enter your birth date or Vedic rashi to reveal the luxury Extrait de Parfum crafted for your astrological element and ruling planet.",
  keywords: [
    "find my zodiac perfume",
    "rashi perfume calculator",
    "astrology fragrance finder",
    "perfume for my birth date",
    "zodiac scent quiz",
    "rashi ke mutabiq perfume",
  ],
  alternates: { canonical: "/find-my-sign" },
  openGraph: {
    title: "Find Your Zodiac Sign & Perfume Match | Aaliqadr",
    description: "Enter your birth date or rashi to find the Extrait de Parfum written in your stars.",
    url: "/find-my-sign",
    type: "website",
  },
};

const FINDER_FAQS = [
  {
    question: "How does the Aaliqadr Zodiac Perfume Finder work?",
    answer:
      "Our calculator matches your solar birth date to its tropical zodiac sign and corresponding Vedic rashi. Each sign is mapped to its classical elemental group (Fire, Earth, Air, Water) and ruling planet, identifying your bespoke Extrait de Parfum signature.",
  },
  {
    question: "Can I find my fragrance using my Indian Vedic Chandra Rashi?",
    answer:
      "Yes! You can either enter your calendar birth date or pick your Vedic Rashi (Mesh, Vrishabha, Mithun, Kark, Simha, Kanya, Tula, Vrishchik, Dhanu, Makar, Kumbh, Meen) directly from the zodiac selector.",
  },
  {
    question: "Is my birth date stored or tracked when I use this tool?",
    answer:
      "No. The calculation runs entirely in your local browser. No personal birth details or dates are sent to or stored on our servers.",
  },
];

export default function FindMySignPage() {
  return (
    <>
      <PageHero eyebrow="Find my sign" title="Which fragrance is written for you?" align="center" />
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
