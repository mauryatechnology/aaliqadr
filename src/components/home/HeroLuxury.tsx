"use client";

import { useState } from "react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const HERO_SLIDES = [
  {
    eyebrow: "LUXURY PERFUMES × ZODIAC ENERGY",
    titleLine1: "Your Rashi.",
    titleLine2: "Your Signature Scent.",
    description:
      "Discover luxury perfumes crafted with celestial wisdom, blending the power of natural ingredients with the energy of your zodiac sign. Find the fragrance that aligns with your soul, your mood, your universe.",
    ctaText: "EXPLORE YOUR RASHI",
    ctaHref: "#cosmic-rashi-selector",
    sideQuote: "MORE THAN A FRAGRANCE — IT'S YOUR ENERGY.",
  },
  {
    eyebrow: "EXTRAIT DE PARFUM · 28% OIL CONCENTRATION",
    titleLine1: "Vedic Alchemy.",
    titleLine2: "Eternal Longevity.",
    description:
      "Hand-poured in small numbered batches with artisanal maceration. Formulated with 28% pure perfume oils for 12+ hours of majestic sillage on skin and natural textiles.",
    ctaText: "DISCOVER THE CRAFT",
    ctaHref: "/about",
    sideQuote: "HAUTE PARFUMERIE MEETS ASTROLOGICAL SCIENCE.",
  },
  {
    eyebrow: "THE FOUR COSMIC ELEMENTS",
    titleLine1: "Fire, Earth,",
    titleLine2: "Air & Water.",
    description:
      "Twelve bespoke creations composed around planetary rulers, gemological placements, and emotional archetypes of the twelve zodiac signs.",
    ctaText: "FIND MY SIGN",
    ctaHref: "/find-my-sign",
    sideQuote: "FIND THE NOTE THAT CALLS YOUR SOUL.",
  },
];

export function HeroLuxury() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === HERO_SLIDES.length - 1 ? 0 : prev + 1));
  };

  const slide = HERO_SLIDES[currentSlide]!;

  return (
    <section className="relative isolate min-h-[92dvh] overflow-clip bg-[#060508] pt-24 pb-14 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
      {/* Background: Atmospheric Cosmic Glow & Stars */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Soft amber / gold radial aura behind the bottle on the right */}
        <div className="absolute right-[10%] top-[25%] h-[550px] w-[550px] rounded-full bg-gold/15 blur-[160px]" />
        <div className="absolute left-[5%] top-[40%] h-[400px] w-[400px] rounded-full bg-amber-600/10 blur-[140px]" />

        {/* Delicate cosmic star points */}
        <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:64px_64px] opacity-15" />
      </div>

      <div className="mx-auto flex w-full max-w-[1360px] flex-col justify-center px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          {/* Left Column: Hero Editorial Typography */}
          <div className="flex flex-col items-start text-left z-10">
            <Reveal key={`eyebrow-${currentSlide}`}>
              <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-5 sm:mb-7 flex items-center gap-2">
                <span className="text-gold/80 text-[10px]">✦</span>
                <span>{slide.eyebrow}</span>
              </p>
            </Reveal>

            <Reveal key={`title-${currentSlide}`} delay={0.06}>
              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-light text-ivory tracking-tight leading-[1.08] mb-6">
                <span className="block">{slide.titleLine1}</span>
                <span className="block italic text-gold-soft">{slide.titleLine2}</span>
              </h1>
            </Reveal>

            <Reveal key={`desc-${currentSlide}`} delay={0.12}>
              <p className="max-w-xl text-base sm:text-lg text-ivory/85 font-light leading-relaxed mb-8 sm:mb-10">
                {slide.description}
              </p>
            </Reveal>

            {/* CTA Button */}
            <Reveal key={`cta-${currentSlide}`} delay={0.18}>
              <div className="flex flex-wrap items-center gap-4">
                {slide.ctaHref.startsWith("#") ? (
                  <a
                    href={slide.ctaHref}
                    className="group inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-[#E3C79B] px-8 py-3.5 font-caps text-xs sm:text-[13px] uppercase tracking-[0.20em] text-[#16120D] font-semibold transition-all duration-200 hover:bg-[#F2DCBA] hover:shadow-[0_0_24px_rgba(227,199,155,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                ) : (
                  <Link
                    href={slide.ctaHref as Route}
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[#E3C79B] px-8 py-4 font-caps text-xs sm:text-[13px] uppercase tracking-[0.20em] text-[#16120D] font-semibold transition-all duration-300 hover:bg-[#F2DCBA] hover:shadow-[0_0_24px_rgba(227,199,155,0.4)] active:scale-98"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
                <Link
                  href={"/zodiac" as Route}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] text-ivory transition-all duration-200 hover:border-gold hover:bg-gold/10 hover:text-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  <span>All 12 Signs</span>
                  <ArrowUpRight className="size-4 text-gold" />
                </Link>
              </div>
            </Reveal>

            {/* Slider Navigation Bar: 01 02 03 + Arrows */}
            <div className="mt-12 sm:mt-16 flex items-center gap-6 text-sm text-ivory/80 font-mono">
              <div className="flex items-center gap-1">
                {HERO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    className={`grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:scale-95 ${i === currentSlide
                        ? "text-gold font-bold bg-gold/15 border border-gold/40 scale-105 shadow-[0_0_12px_rgba(201,169,110,0.3)]"
                        : "text-ivory/75 hover:text-ivory hover:bg-white/10"
                      }`}
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    0{i + 1}
                  </button>
                ))}
              </div>

              {/* Progress Line */}
              <div className="relative h-[2px] w-16 sm:w-28 bg-white/15 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gold transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentSlide + 1) / HERO_SLIDES.length) * 100}%`,
                  }}
                />
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                  className="grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full border border-white/20 text-ivory/80 transition-all duration-200 hover:border-gold hover:text-gold hover:bg-gold/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 cursor-pointer"
                >
                  <ArrowLeft className="size-4.5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full border border-white/20 text-ivory/80 transition-all duration-200 hover:border-gold hover:text-gold hover:bg-gold/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 cursor-pointer"
                >
                  <ArrowRight className="size-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual + Quote Side Badge */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <Reveal delay={0.15} className="relative w-full max-w-[540px]">
              {/* Grand Glowing Perfume Bottle on Volcanic Rock */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-gold/20 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
                <Image
                  src="/brand/hero-zodiac-perfume.jpg"
                  alt="Aaliqadr Luxury Zodiac Perfume bottle with glowing cosmic wheel"
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 90vw"
                  className="object-cover transition-transform duration-700 hover:scale-102"
                />

                {/* Subtle dark vignette overlay around edges */}
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 [box-shadow:inset_0_0_80px_rgba(0,0,0,0.6)]" />
              </div>

              {/* Side Vertical Editorial Quote */}
              <div className="absolute -right-4 sm:-right-8 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center">
                <div className="rounded-xl border border-gold/20 bg-surface/85 px-3 py-5 backdrop-blur-md shadow-2xl text-center max-w-[140px]">
                  <p className="font-caps text-[9px] uppercase tracking-[0.24em] text-gold/90 font-medium leading-relaxed">
                    MORE THAN A FRAGRANCE —
                  </p>
                  <p className="mt-1 font-display text-xs text-ivory font-light italic">
                    It&apos;s Your Energy.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
