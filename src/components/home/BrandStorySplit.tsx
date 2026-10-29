import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Gem, Gift, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const STORY_PILLARS = [
  {
    icon: Sparkles,
    title: "Premium",
    subtitle: "Natural Ingredients",
  },
  {
    icon: Award,
    title: "Astrology Inspired",
    subtitle: "Vedic Blends",
  },
  {
    icon: Gem,
    title: "Long Lasting",
    subtitle: "28% Extrait de Parfum",
  },
  {
    icon: Gift,
    title: "Luxury",
    subtitle: "Presentation Box",
  },
];

export function BrandStorySplit() {
  return (
    <section className="relative bg-[#060508] text-ivory py-16 sm:py-20 lg:py-24 overflow-hidden">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 items-stretch gap-0 overflow-hidden rounded-2xl border border-white/10 lg:grid-cols-2 shadow-[0_25px_70px_rgba(0,0,0,0.8)]">
          {/* Left Column: Editorial Atmospheric Photo */}
          <Reveal className="relative min-h-[300px] sm:min-h-[420px] lg:min-h-[520px] w-full overflow-hidden">
            <Image
              src="/brand/story-perfume-woman.jpg"
              alt="Artisanal perfume ritual in warm golden candlelight"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 hover:scale-103"
            />

            {/* Dark warm gradient overlay for moody luxury tone */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Editorial Overlay Typography Badge */}
            <div className="absolute bottom-8 left-8 sm:bottom-12 sm:left-12 z-10">
              <p className="font-caps text-xs sm:text-sm tracking-[0.3em] text-[#E3C79B] font-medium uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                SCENT YOUR DESTINY +
              </p>
            </div>
          </Reveal>

          {/* Right Column: Warm Champagne Parchment Story Panel */}
          <Reveal delay={0.1} className="relative flex flex-col justify-center bg-[#FAF7F2] p-6 sm:p-10 lg:p-14 text-[#1A1612]">
            {/* Subtle Starburst Watermark */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-6 top-6 size-24 opacity-[0.08]"
            >
              <svg viewBox="0 0 100 100" className="size-full stroke-current" fill="none">
                <path d="M50 0 L53 47 L100 50 L53 53 L50 100 L47 53 L0 50 L47 47 Z" strokeWidth="1" />
              </svg>
            </div>

            <div>
              <p className="font-caps text-xs sm:text-[13px] tracking-[0.24em] text-[#7A5E35] font-semibold uppercase mb-3">
                OUR STORY
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#17130F] tracking-tight leading-[1.15]">
                Where Fragrance Meets Astrology
              </h2>
              <p className="mt-4 text-base sm:text-[17px] text-[#29231D] font-light leading-relaxed max-w-prose">
                At Aaliqadr, we believe every soul has a scent. Inspired by the stars and the elements, our perfumes are more than just fragrances — they are a reflection of your inner world, your zodiac energy, and your unique story.
              </p>
            </div>

            {/* 4 Feature Pillars Grid */}
            <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#E8E2D5]">
              {STORY_PILLARS.map((pillar, idx) => {
                const IconComponent = pillar.icon;
                return (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <div className="mb-2.5 grid size-11 place-items-center rounded-full bg-[#17130F] text-[#E3C79B] shadow-sm">
                      <IconComponent className="size-5" />
                    </div>
                    <span className="font-display text-sm font-semibold text-[#17130F]">
                      {pillar.title}
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#423B33] font-normal mt-0.5">
                      {pillar.subtitle}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Discover Story Button */}
            <div className="mt-8 sm:mt-10">
              <Link
                href="/about"
                className="group inline-flex min-h-[48px] items-center gap-2.5 rounded-full border-2 border-[#17130F] bg-[#17130F] px-8 py-3.5 font-caps text-xs sm:text-[13px] uppercase tracking-[0.18em] font-semibold text-[#FAF7F2] transition-all duration-200 hover:bg-[#73531F] hover:border-[#73531F] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73531F] focus-visible:ring-offset-2"
              >
                <span>Discover Our Story</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
