import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { mark, wordmark } from "@/components/brand/logo-paths";

/**
 * BrandCraftSection ("OUR CRAFT - The drop that holds a sky")
 * - Royal Black / Celestial Obsidian Theme (#07050A)
 * - Left column: 3D Metallic Gold Calligraphy Monogram (Alif + Qaf flame drop) & AALIQADR wordmark
 * - Right column: Haute-parfumerie heritage editorial copy & "READ OUR STORY" pill CTA
 * - Background: Dark cosmos with golden nebula glow, starlight dust and astrological compass watermark
 */
export function BrandCraftSection() {
  return (
    <section className="relative overflow-hidden bg-[#07050A] text-ivory py-16 sm:py-20 lg:py-28 border-t border-[#C9A96E]/20">
      {/* 1. Subtle Celestial Nebula Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Golden ambient glow concentrated behind the left monogram */}
        <div className="absolute left-[10%] top-1/2 -translate-y-1/2 h-[450px] w-[450px] sm:h-[600px] sm:w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.18)_0%,_rgba(180,130,40,0.06)_45%,_transparent_72%)] blur-[70px]" />

        {/* Soft secondary celestial aura on right */}
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(201,169,110,0.08)_0%,_transparent_70%)] blur-[80px]" />

        {/* Delicate Starlight Dust Specks */}
        <svg
          viewBox="0 0 1440 800"
          className="absolute inset-0 size-full opacity-60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle star nodes */}
          <circle cx="120" cy="140" r="1" fill="#FFF2BF" opacity="0.6" />
          <circle cx="280" cy="90" r="1.5" fill="#C9A96E" opacity="0.5" />
          <circle cx="410" cy="220" r="1" fill="#FAF5E8" opacity="0.4" />
          <circle cx="210" cy="520" r="1.2" fill="#E8D19F" opacity="0.7" />
          <circle cx="90" cy="680" r="1" fill="#C9A96E" opacity="0.3" />
          <circle cx="340" cy="710" r="1.5" fill="#FFF2BF" opacity="0.5" />
          <circle cx="580" cy="120" r="1" fill="#FFF" opacity="0.3" />
          <circle cx="670" cy="460" r="1.2" fill="#C9A96E" opacity="0.45" />
          <circle cx="780" cy="160" r="1.5" fill="#FAF5E8" opacity="0.6" />
          <circle cx="890" cy="620" r="1" fill="#E8D19F" opacity="0.35" />
          <circle cx="1020" cy="210" r="1.2" fill="#FFF2BF" opacity="0.5" />
          <circle cx="1140" cy="110" r="1" fill="#C9A96E" opacity="0.4" />
          <circle cx="1260" cy="280" r="1.5" fill="#FAF5E8" opacity="0.7" />
          <circle cx="1380" cy="190" r="1" fill="#FFF2BF" opacity="0.3" />
          <circle cx="1050" cy="710" r="1.2" fill="#C9A96E" opacity="0.5" />
          <circle cx="1210" cy="640" r="1" fill="#FFF" opacity="0.4" />
          <circle cx="1340" cy="580" r="1.5" fill="#E8D19F" opacity="0.6" />
          {/* Subtle cross starlight */}
          <path d="M780 156 L780 164 M776 160 L784 160" stroke="#FFF2BF" strokeWidth="0.75" opacity="0.7" />
          <path d="M1260 276 L1260 284 M1256 280 L1264 280" stroke="#FFF2BF" strokeWidth="0.75" opacity="0.75" />
          <path d="M280 86 L280 94 M276 90 L284 90" stroke="#C9A96E" strokeWidth="0.75" opacity="0.6" />
        </svg>

        {/* 2. Astrological Compass / Celestial Armillary Sphere Watermark */}
        <svg
          viewBox="0 0 800 800"
          className="pointer-events-none absolute right-[-10%] sm:right-[0%] lg:right-[4%] top-1/2 -translate-y-1/2 w-[540px] sm:w-[680px] lg:w-[820px] h-[540px] sm:h-[680px] lg:h-[820px] opacity-[0.14] select-none text-[#C9A96E]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Concentric Celestial Rings */}
          <circle cx="400" cy="400" r="380" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" />
          <circle cx="400" cy="400" r="350" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="400" cy="400" r="330" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.7" />
          <circle cx="400" cy="400" r="250" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="400" cy="400" r="180" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="400" cy="400" r="90" stroke="currentColor" strokeWidth="1" />

          {/* Coordinate Cardinal & Diagonal Ray Lines */}
          <line x1="400" y1="20" x2="400" y2="780" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="20" y1="400" x2="780" y2="400" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="131" y1="131" x2="669" y2="669" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 5" />
          <line x1="131" y1="669" x2="669" y2="131" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 5" />

          {/* Additional 30-degree Astrological House Cusps */}
          <line x1="225" y1="97" x2="575" y2="703" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />
          <line x1="97" y1="225" x2="703" y2="575" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />
          <line x1="575" y1="97" x2="225" y2="703" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />
          <line x1="703" y1="225" x2="97" y2="575" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />

          {/* Astronomical Degree Ticks around the outer circumference */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            const x1 = 400 + Math.cos(angle) * 350;
            const y1 = 400 + Math.sin(angle) * 350;
            const x2 = 400 + Math.cos(angle) * (i % 3 === 0 ? 362 : 356);
            const y2 = 400 + Math.sin(angle) * (i % 3 === 0 ? 362 : 356);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={i % 3 === 0 ? "1" : "0.5"}
                strokeOpacity="0.6"
              />
            );
          })}
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10 z-10">
        <div className="grid grid-cols-1 items-center gap-12 sm:gap-16 lg:grid-cols-12 lg:gap-20">
          {/* ── Left Column: 3D Metallic Gold Monogram & Wordmark ── */}
          <Reveal className="lg:col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative flex flex-col items-center justify-center p-4">
              {/* Radial Golden Halo Aura behind Monogram */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 sm:-inset-12 rounded-full bg-[radial-gradient(circle_at_center,_rgba(224,190,110,0.25)_0%,_rgba(180,130,40,0.08)_50%,_transparent_75%)] blur-2xl sm:blur-3xl"
              />

              {/* 3D Polished Gold Flame Monogram (Alif + Qaf drop) */}
              <svg
                viewBox={mark.viewBox}
                className="relative h-44 sm:h-56 md:h-64 lg:h-72 w-auto filter drop-shadow-[0_16px_32px_rgba(201,169,110,0.38)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:scale-103"
                role="img"
                aria-label="Aaliqadr Monogram Flame (Alif + Qaf)"
              >
                <defs>
                  {/* Rich 3D metallic gold gradient */}
                  <linearGradient id="craft-monogram-gold" x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#FFF4D0" />
                    <stop offset="16%" stopColor="#E9C87B" />
                    <stop offset="36%" stopColor="#B38232" />
                    <stop offset="54%" stopColor="#FDEAB2" />
                    <stop offset="72%" stopColor="#8F5E1A" />
                    <stop offset="88%" stopColor="#E0B763" />
                    <stop offset="100%" stopColor="#FFF3CE" />
                  </linearGradient>

                  {/* Chiseled 3D edge bevel stroke */}
                  <linearGradient id="craft-monogram-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6E440F" stopOpacity="0.85" />
                    <stop offset="48%" stopColor="#FFF6D8" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#5C3608" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {mark.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="url(#craft-monogram-gold)"
                    stroke="url(#craft-monogram-stroke)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>

              {/* 3D Polished Gold Wordmark: "AALIQADR" */}
              <svg
                viewBox={wordmark.viewBox}
                className="relative mt-7 sm:mt-9 h-6 sm:h-7 md:h-8 lg:h-9 w-auto filter drop-shadow-[0_8px_18px_rgba(201,169,110,0.32)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                role="img"
                aria-label="AALIQADR"
              >
                <defs>
                  <linearGradient id="craft-wordmark-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E2BD6D" />
                    <stop offset="25%" stopColor="#FFF7D6" />
                    <stop offset="50%" stopColor="#D29F3D" />
                    <stop offset="75%" stopColor="#FFF2BF" />
                    <stop offset="100%" stopColor="#C89635" />
                  </linearGradient>

                  <linearGradient id="craft-wordmark-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#633C0A" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#FFF9E0" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#543105" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {wordmark.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="url(#craft-wordmark-gold)"
                    stroke="url(#craft-wordmark-stroke)"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            </div>
          </Reveal>

          {/* ── Right Column: Editorial Craft Story & Action ── */}
          <Reveal delay={0.15} className="lg:col-span-7 flex flex-col items-start text-left lg:pl-6 xl:pl-10">
            {/* Eyebrow */}
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-[#C9A96E] font-semibold uppercase mb-4 flex items-center gap-2">
              <span aria-hidden className="text-[#C9A96E]/80 text-[10px]">✦</span>
              <span>OUR CRAFT</span>
            </p>

            {/* Editorial Serif Heading */}
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-normal text-[#FDFBF7] tracking-tight leading-[1.12] mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              The drop that holds a sky
            </h2>

            {/* Haute-Parfumerie Heritage Paragraph */}
            <p className="text-base sm:text-[17px] text-[#D8D2C8] font-normal leading-relaxed max-w-[65ch] mb-9">
              Our monogram joins the letters alif and qaf into a single drop of perfume, shaped like a flame. Aaliqadr means high esteem: we compose every signature as an Extrait de Parfum, with a concentration made to stay with you from morning to the last star.
            </p>

            {/* Pill CTA Button */}
            <Link
              href="/about"
              className="group inline-flex min-h-[48px] items-center gap-3 rounded-full border border-[#C9A96E]/45 bg-[#07050A]/60 px-8 sm:px-9 py-3.5 font-caps text-xs sm:text-[13px] tracking-[0.24em] uppercase text-[#EAD8B8] backdrop-blur-md transition-all duration-200 hover:text-[#07050A] hover:bg-[#C9A96E] hover:border-[#C9A96E] hover:shadow-[0_0_28px_rgba(201,169,110,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#07050A]"
            >
              <span>READ OUR STORY</span>
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
