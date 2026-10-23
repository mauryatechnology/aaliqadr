import type { Metadata } from "next";
import { SignFinder } from "@/components/zodiac/SignFinder";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Find My Sign: Which Perfume Matches Your Zodiac?",
  description: "Enter your birth date or choose your rashi to discover the Aaliqadr fragrance written for you.",
  alternates: { canonical: "/find-my-sign" },
};

export default function FindMySignPage() {
  return (
    <>
      <PageHero eyebrow="Find my sign" title="Which fragrance is written for you?" align="center" />
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <SignFinder />
      </div>
    </>
  );
}
