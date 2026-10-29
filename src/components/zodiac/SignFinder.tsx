"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ZODIAC, SIGNS, type ZodiacSlug, type ZodiacSign } from "@/config/zodiac";
import { sunSignFor, formatSignDates } from "@/lib/zodiac-math";
import { calculateVedicMoon, NAKSHATRAS, type VedicMoonCalculation } from "@/lib/vedic-astro";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { ZodiacGoldGlyph } from "@/components/zodiac/ZodiacGoldGlyph";
import { CelestialSignReveal } from "@/components/zodiac/CelestialSignReveal";
import { EASINGS } from "@/config/motion";
import { routes } from "@/lib/routes";

function ArrowRight({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Sparkles({ className = "size-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function Sun({ className = "size-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function Moon({ className = "size-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function RotateCcw({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function Layers({ className = "size-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

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

/**
 * Luxury 3-Step "Find My Sign" Astrological Fragrance Flow
 * Step 1: Astral Coordinates (Calculate by birth moment OR direct 12-Rashi instant picker)
 * Step 2: Western Sun Sign + Vedic Chandra Rashi dual alignment reveal
 * Step 3: Primary Extrait signature + Harmonic astrological layering pair
 */
export function SignFinder() {
  const id = useId();

  // Flow Step: 1 = Input/Grid, 2 = Astrological Reveal, 3 = Fragrance & Layering
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState(1);

  // Discovery Mode: "calculate" (date form) vs "browse" (direct 12-rashi cards)
  const [mode, setMode] = useState<"calculate" | "browse">("calculate");

  const goToStep = (next: 1 | 2 | 3) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  // Form State
  const [dob, setDob] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tob, setTob] = useState("12:00");
  const [city, setCity] = useState("New Delhi");

  // Calculated Results
  const [westernSign, setWesternSign] = useState<ZodiacSign | null>(null);
  const [vedicCalc, setVedicCalc] = useState<VedicMoonCalculation | null>(null);
  const [activeSign, setActiveSign] = useState<ZodiacSign | null>(null);

  function handleCalculate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!dob) return;

    const [y, m, d] = dob.split("-").map(Number);
    if (!y || !m || !d) return;

    // 1. Calculate Western Sun Sign
    const western = sunSignFor(m, d);
    setWesternSign(western);

    // 2. Calculate Vedic Moon Sign using high-precision ephemeris
    const [h, mi] = (tob || "12:00").split(":").map(Number);
    const vedic = calculateVedicMoon(y, m, d, h || 12, mi || 0, 5.5);
    setVedicCalc(vedic);

    // Default primary focus to the Vedic Moon Sign
    setActiveSign(vedic.sign);

    // Advance to Step 2
    setDirection(1);
    setStep(2);
  }

  function handleSelectSignDirectly(slug: ZodiacSlug) {
    const chosenSign = ZODIAC[slug];
    const signIdx = Math.max(0, SIGNS.findIndex((s) => s.slug === slug));
    const nakshatraIndex = Math.min(26, Math.floor(signIdx * 2.25));
    const nakshatra = NAKSHATRAS[nakshatraIndex] ?? NAKSHATRAS[0]!;

    const syntheticVedic: VedicMoonCalculation = {
      sign: chosenSign,
      rashiEnglish: chosenSign.rashi,
      nakshatra,
      pada: 1,
      degreesInSign: 15,
      degreesInSignFormatted: "15° 00'",
      siderealLongitude: signIdx * 30 + 15,
      tropicalLongitude: (signIdx * 30 + 39) % 360,
      ayanamsa: 24.1,
      isCusp: false,
    };

    setWesternSign(chosenSign);
    setVedicCalc(syntheticVedic);
    setActiveSign(chosenSign);

    setDirection(1);
    setStep(2);
  }

  function handleReset() {
    setDob("");
    setWesternSign(null);
    setVedicCalc(null);
    setActiveSign(null);
    setDirection(-1);
    setStep(1);
  }

  const primarySign = activeSign ?? vedicCalc?.sign ?? westernSign ?? ZODIAC.aries;
  const layeringSignSlug = primarySign.compatible[0] ?? "leo";
  const layeringSign = ZODIAC[layeringSignSlug as ZodiacSlug];

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* 3-Step Luxury Progress Stepper */}
      <nav aria-label="Progress" className="mb-10 sm:mb-12">
        <div className="flex items-center justify-between rounded-2xl border border-gold/20 bg-surface/70 px-4 py-3.5 sm:px-8 sm:py-4 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {[
            { num: 1, label: "Birth Moment", sub: "Astral Coordinates" },
            { num: 2, label: "Celestial Mirror", sub: "Sun & Moon Alignment" },
            { num: 3, label: "Signature Scent", sub: "Layering Duo" },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                disabled={step < s.num}
                onClick={() => {
                  if (step > s.num) goToStep(s.num as 1 | 2 | 3);
                }}
                className={`flex items-center gap-2 sm:gap-3 transition-all text-left ${
                  isActive
                    ? "text-gold"
                    : isDone
                    ? "text-ivory/80 hover:text-gold cursor-pointer"
                    : "text-muted/40 cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full font-display text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gold text-obsidian shadow-[0_0_18px_rgba(201,169,110,0.45)] ring-2 ring-gold/40"
                      : isDone
                      ? "border border-gold/60 bg-gold/15 text-gold"
                      : "border border-white/15 bg-white/5 text-muted/40"
                  }`}
                >
                  {isDone ? "✓" : s.num}
                </span>
                <span className="hidden sm:flex flex-col">
                  <span className="font-caps text-[11px] uppercase tracking-[0.18em] font-medium leading-tight">
                    {s.label}
                  </span>
                  <span className="text-[10px] text-muted font-light">{s.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* STEP CONTAINER: Animated slide transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 30 }}
          transition={{ duration: 0.5, ease: EASINGS.luxury }}
        >
          {/* STEP 1: Astral Coordinates (Calculate by birth moment OR direct 12-Rashi instant picker) */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Dual Mode Switcher */}
              <div className="flex justify-center">
                <div className="inline-flex items-center rounded-full border border-gold/25 bg-surface/90 p-1.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                  <button
                    type="button"
                    onClick={() => setMode("calculate")}
                    className={`min-h-[40px] rounded-full px-5 sm:px-6 font-caps text-[11px] uppercase tracking-[0.18em] transition-all flex items-center gap-2 cursor-pointer ${
                      mode === "calculate"
                        ? "bg-gold text-obsidian font-semibold shadow-[0_0_16px_rgba(201,169,110,0.35)]"
                        : "text-ivory/70 hover:text-ivory"
                    }`}
                  >
                    <span>✦ Calculate by Birth Moment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("browse")}
                    className={`min-h-[40px] rounded-full px-5 sm:px-6 font-caps text-[11px] uppercase tracking-[0.18em] transition-all flex items-center gap-2 cursor-pointer ${
                      mode === "browse"
                        ? "bg-gold text-obsidian font-semibold shadow-[0_0_16px_rgba(201,169,110,0.35)]"
                        : "text-ivory/70 hover:text-ivory"
                    }`}
                  >
                    <span>✦ Pick My Rashi Directly</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Calculate by Birth Date */}
              {mode === "calculate" && (
                <div className="mx-auto max-w-xl rounded-2xl border border-gold/25 bg-surface/85 p-7 sm:p-11 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md">
                  <p className="eyebrow text-gold font-medium tracking-[0.24em] mb-3">
                    STEP 1 · ASTRONOMICAL EPHEMERIS
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                    When did you enter the cosmos?
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm text-muted font-light leading-relaxed max-w-md mx-auto">
                    Enter your birth date. Our astronomical engine calculates both your Western Sun sign and your Vedic Chandra Rashi with high mathematical precision.
                  </p>

                  <form onSubmit={handleCalculate} className="mt-8 space-y-6 text-left">
                    <div>
                      <label
                        htmlFor={`${id}-dob`}
                        className="block font-caps text-[10px] uppercase tracking-[0.2em] text-gold mb-2 font-medium"
                      >
                        Date of Birth
                      </label>
                      <input
                        id={`${id}-dob`}
                        type="date"
                        required
                        min="1920-01-01"
                        max="2026-12-31"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full min-h-[50px] rounded-xl border border-gold/30 bg-obsidian/95 px-4 py-3 font-sans text-base text-ivory [color-scheme:dark] focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/60 transition-all"
                      />
                    </div>

                    {/* Optional Vedic Precision Toggle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="font-caps text-[10px] uppercase tracking-[0.18em] text-muted hover:text-gold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>
                          {showAdvanced
                            ? "— Hide Exact Birth Time & City"
                            : "+ Add Exact Birth Time & City (Vedic Chandra Precision)"}
                        </span>
                      </button>

                      {showAdvanced && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gold/15 pt-4">
                          <div>
                            <label
                              htmlFor={`${id}-tob`}
                              className="block font-caps text-[10px] uppercase tracking-[0.2em] text-muted mb-1.5"
                            >
                              Time of Birth
                            </label>
                            <input
                              id={`${id}-tob`}
                              type="time"
                              value={tob}
                              onChange={(e) => setTob(e.target.value)}
                              className="w-full min-h-[46px] rounded-xl border border-gold/25 bg-obsidian/95 px-3 py-2.5 font-sans text-sm text-ivory [color-scheme:dark] focus:border-gold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`${id}-city`}
                              className="block font-caps text-[10px] uppercase tracking-[0.2em] text-muted mb-1.5"
                            >
                              City of Birth
                            </label>
                            <input
                              id={`${id}-city`}
                              type="text"
                              placeholder="e.g. New Delhi, Mumbai"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full min-h-[46px] rounded-xl border border-gold/25 bg-obsidian/95 px-3 py-2.5 font-sans text-sm text-ivory focus:border-gold focus:outline-none placeholder:text-muted/40"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!dob}
                      className="w-full min-h-[52px] rounded-full bg-gold py-4 font-caps text-xs uppercase tracking-[0.22em] text-obsidian transition-all hover:bg-[#D8BA80] shadow-[0_4px_24px_rgba(201,169,110,0.3)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 font-medium"
                    >
                      <span>Reveal Celestial Alignment</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </form>

                  {/* Switch to direct 12-rashi selection prompt */}
                  <div className="mt-8 border-t border-gold/15 pt-5">
                    <button
                      type="button"
                      onClick={() => setMode("browse")}
                      className="font-caps text-[10px] uppercase tracking-[0.18em] text-muted hover:text-gold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Already know your Rashi or Sun sign? Pick directly from the 12 Rashis →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode B: Direct 12-Rashi Interactive Grid */}
              {mode === "browse" && (
                <div className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <p className="eyebrow text-gold font-medium tracking-[0.24em] mb-2">
                      DIRECT ASTROLOGICAL ACCESS
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                      Select your sacred rashi
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-muted font-light leading-relaxed">
                      Choose your Vedic Chandra Rashi or Western Sun sign to reveal its 28% Extrait de Parfum signature and astrological pairing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                    {SIGNS.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => handleSelectSignDirectly(s.slug)}
                        className="group flex flex-col items-center rounded-2xl border border-gold/20 bg-surface/65 p-4 sm:p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:bg-surface hover:shadow-[0_10px_30px_rgba(201,169,110,0.22)] cursor-pointer"
                      >
                        {/* Embossed Gold Medallion */}
                        <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-gold/30 bg-obsidian/85 shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold group-hover:shadow-[0_0_18px_rgba(201,169,110,0.4)]">
                          <ZodiacGoldGlyph sign={s.slug} className="size-8" />
                        </div>

                        {/* Sanskrit Devanagari */}
                        <span className="font-rashi text-lg sm:text-xl text-gold group-hover:text-gold-soft transition-colors leading-tight">
                          {RASHI_DEVANAGARI[s.slug]} राशि
                        </span>

                        {/* English Sign Name */}
                        <span className="font-display text-base text-ivory font-light mt-0.5">
                          {s.name}
                        </span>

                        {/* Date Range */}
                        <span className="text-[10px] text-muted font-light mt-0.5">
                          {formatSignDates(s)}
                        </span>

                        {/* Fragrance Title */}
                        <span className="mt-2 text-[11px] text-gold-soft/90 font-light truncate max-w-full">
                          ✦ {s.fragrance.name}
                        </span>

                        {/* Element Badge */}
                        <span className="mt-2.5 inline-flex items-center rounded-full border border-gold/15 bg-obsidian/40 px-2.5 py-0.5 font-caps text-[9px] uppercase tracking-wider text-muted group-hover:border-gold/30 group-hover:text-ivory capitalize">
                          {s.element}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Dual Astrological Reveal (Western Sun + Vedic Chandra Rashi) */}
          {step === 2 && westernSign && vedicCalc && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center max-w-xl mx-auto">
                <p className="eyebrow text-gold font-medium tracking-[0.24em] mb-2">
                  STEP 2 · YOUR CELESTIAL MIRROR
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                  Two systems. One cosmic identity.
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted font-light leading-relaxed">
                  Western astrology reflects your solar vitality, while Vedic Jyotish traces your deeper emotional essence through your Chandra Rashi (Moon sign).
                </p>
              </div>

              {/* Interactive Celestial Wheel Decelerator, Constellation Lines & Rising Bottle */}
              <CelestialSignReveal sign={primarySign} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Western Sun Sign Card */}
                <div
                  onClick={() => setActiveSign(westernSign)}
                  className={`rounded-2xl border p-6 sm:p-8 cursor-pointer transition-all duration-300 relative ${
                    activeSign?.slug === westernSign.slug
                      ? "border-gold bg-surface shadow-[0_0_35px_rgba(201,169,110,0.2)] ring-1 ring-gold"
                      : "border-gold/20 bg-surface/65 hover:border-gold/45"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-caps text-[9px] uppercase tracking-[0.2em] text-gold">
                        <Sun className="size-3" /> Western Sun Sign
                      </span>
                      <h3 className="font-display text-3xl text-ivory mt-2">{westernSign.name}</h3>
                      <p className="font-rashi text-base text-gold mt-0.5">
                        {RASHI_DEVANAGARI[westernSign.slug]} ({westernSign.rashi})
                      </p>
                    </div>
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-obsidian/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                      <ZodiacGoldGlyph sign={westernSign.slug} className="size-8" />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gold/15 pt-4 space-y-2 text-xs text-muted font-light">
                    <p>
                      <span className="text-ivory font-normal">Element: </span>
                      <span className="capitalize">{westernSign.element}</span> · Ruling Planet: {westernSign.rulingPlanet}
                    </p>
                    <p>
                      <span className="text-ivory font-normal">Personality: </span>
                      {westernSign.traits.join(", ")}
                    </p>
                  </div>

                  <div className="mt-6 pt-2">
                    <span className="inline-flex items-center gap-1.5 font-caps text-[10px] uppercase tracking-[0.2em] text-gold">
                      {activeSign?.slug === westernSign.slug ? "✓ Selected for fragrance match" : "✦ Click to select this sign"}
                    </span>
                  </div>
                </div>

                {/* Vedic Moon Sign Card */}
                <div
                  onClick={() => setActiveSign(vedicCalc.sign)}
                  className={`rounded-2xl border p-6 sm:p-8 cursor-pointer transition-all duration-300 relative ${
                    activeSign?.slug === vedicCalc.sign.slug
                      ? "border-gold bg-surface shadow-[0_0_35px_rgba(201,169,110,0.2)] ring-1 ring-gold"
                      : "border-gold/20 bg-surface/65 hover:border-gold/45"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-caps text-[9px] uppercase tracking-[0.2em] text-gold">
                        <Moon className="size-3" /> Vedic Chandra Rashi
                      </span>
                      <h3 className="font-display text-3xl text-ivory mt-2">{vedicCalc.rashiEnglish}</h3>
                      <p className="font-rashi text-base text-gold mt-0.5">
                        {RASHI_DEVANAGARI[vedicCalc.sign.slug]} ({vedicCalc.sign.rashi})
                      </p>
                    </div>
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-obsidian/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                      <ZodiacGoldGlyph sign={vedicCalc.sign.slug} className="size-8" />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gold/15 pt-4 space-y-2 text-xs text-muted font-light">
                    <p>
                      <span className="text-ivory font-normal">Nakshatra: </span>
                      {vedicCalc.nakshatra.name} (Pada {vedicCalc.pada})
                    </p>
                    <p>
                      <span className="text-ivory font-normal">Ruling Graha: </span>
                      {vedicCalc.nakshatra.ruler} · {vedicCalc.nakshatra.gana} Gana
                    </p>
                    <p>
                      <span className="text-ivory font-normal">Degrees: </span>
                      {vedicCalc.degreesInSignFormatted} in sign
                    </p>
                  </div>

                  <div className="mt-6 pt-2">
                    <span className="inline-flex items-center gap-1.5 font-caps text-[10px] uppercase tracking-[0.2em] text-gold">
                      {activeSign?.slug === vedicCalc.sign.slug ? "✓ Selected for fragrance match" : "✦ Click to select this sign"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gold/20 pt-6">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="min-h-[46px] rounded-full border border-gold/30 bg-surface/60 px-6 py-2.5 font-caps text-[11px] uppercase tracking-[0.2em] text-muted hover:text-ivory hover:border-gold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Change Birth Date / Sign</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="w-full sm:w-auto min-h-[50px] rounded-full bg-gold px-8 py-3.5 font-caps text-xs uppercase tracking-[0.22em] text-obsidian hover:bg-[#D8BA80] transition-all shadow-[0_4px_24px_rgba(201,169,110,0.3)] flex items-center justify-center gap-2 cursor-pointer font-medium"
                >
                  <span>Explore Recommended Scent & Layering Pair</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Recommended Scent + Layering Suggestion */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="text-center max-w-xl mx-auto">
                <p className="eyebrow text-gold font-medium tracking-[0.24em] mb-2">
                  STEP 3 · THE OLFACTORY RESONANCE
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                  Your signature & bespoke layering duo
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted font-light leading-relaxed">
                  Formulated as 28% Extrait de Parfum to mirror your planetary vibration, with a complementary counterpart to amplify sillage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Primary Signature Perfume */}
                <div className="rounded-2xl border border-gold/30 bg-surface/90 p-7 sm:p-9 flex flex-col justify-between relative shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-md">
                  <div>
                    <div className="flex items-center justify-between border-b border-gold/15 pb-4">
                      <span className="font-caps text-[10px] uppercase tracking-[0.22em] text-gold flex items-center gap-1.5 font-medium">
                        <Sparkles className="size-3" /> Your Primary Signature
                      </span>
                      <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 font-caps text-[10px] uppercase tracking-[0.18em] text-gold">
                        28% Extrait
                      </span>
                    </div>

                    <div className="my-6 flex justify-center">
                      <div
                        className="relative w-36 sm:w-44"
                        style={{
                          filter: `drop-shadow(0 15px 30px rgba(0,0,0,0.85)) drop-shadow(0 0 35px ${primarySign.theme.primary}45)`,
                        }}
                      >
                        <BottleArt sign={primarySign.slug} preload className="w-full h-auto" />
                      </div>
                    </div>

                    <h3 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                      {primarySign.fragrance.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ZodiacGoldGlyph sign={primarySign.slug} className="size-5" />
                      <span className="font-rashi text-sm text-gold">
                        {RASHI_DEVANAGARI[primarySign.slug]} राशि
                      </span>
                      <span className="text-muted text-xs">
                        · House of {primarySign.name}
                      </span>
                    </div>
                    <p className="mt-3 text-xs sm:text-sm text-muted font-light italic leading-relaxed">
                      &ldquo;{primarySign.fragrance.tagline}&rdquo;
                    </p>

                    {/* Notes Breakdown */}
                    <div className="mt-5 space-y-2 border-t border-gold/15 pt-4 text-xs font-light text-ivory/85">
                      <p>
                        <span className="font-caps text-[9px] uppercase tracking-wider text-gold font-medium">TOP: </span>
                        {primarySign.fragrance.notes.top.map((n) => n.name).join(" · ")}
                      </p>
                      <p>
                        <span className="font-caps text-[9px] uppercase tracking-wider text-gold font-medium">HEART: </span>
                        {primarySign.fragrance.notes.heart.map((n) => n.name).join(" · ")}
                      </p>
                      <p>
                        <span className="font-caps text-[9px] uppercase tracking-wider text-gold font-medium">BASE: </span>
                        {primarySign.fragrance.notes.base.map((n) => n.name).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gold/15">
                    <Link
                      href={routes.product(primarySign.fragrance.slug)}
                      className="w-full min-h-[50px] rounded-full bg-gold py-3.5 font-caps text-xs uppercase tracking-[0.2em] text-obsidian hover:bg-[#D8BA80] transition-all flex items-center justify-center gap-2 font-medium shadow-[0_4px_20px_rgba(201,169,110,0.3)]"
                    >
                      <span>Discover {primarySign.fragrance.name}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>

                {/* Layering Companion Perfume */}
                <div className="rounded-2xl border border-gold/20 bg-surface/80 p-7 sm:p-9 flex flex-col justify-between relative shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
                  <div>
                    <div className="flex items-center justify-between border-b border-gold/15 pb-4">
                      <span className="font-caps text-[10px] uppercase tracking-[0.22em] text-muted flex items-center gap-1.5 font-medium">
                        <Layers className="size-3 text-gold" /> Astrological Layering Pair
                      </span>
                      <span className="rounded-full border border-gold/20 bg-surface px-3 py-1 font-caps text-[10px] uppercase tracking-[0.18em] text-ivory/60">
                        Harmonious Counterpart
                      </span>
                    </div>

                    <div className="my-6 flex justify-center">
                      <div
                        className="relative w-36 sm:w-44 opacity-90"
                        style={{
                          filter: `drop-shadow(0 15px 30px rgba(0,0,0,0.85)) drop-shadow(0 0 30px ${layeringSign.theme.primary}35)`,
                        }}
                      >
                        <BottleArt sign={layeringSign.slug} className="w-full h-auto" />
                      </div>
                    </div>

                    <h3 className="font-display text-3xl sm:text-4xl text-ivory font-light">
                      {layeringSign.fragrance.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ZodiacGoldGlyph sign={layeringSign.slug} className="size-5" />
                      <span className="font-rashi text-sm text-gold">
                        {RASHI_DEVANAGARI[layeringSign.slug]} राशि
                      </span>
                      <span className="text-muted text-xs">
                        · House of {layeringSign.name}
                      </span>
                    </div>
                    <p className="mt-3 text-xs sm:text-sm text-muted font-light italic leading-relaxed">
                      &ldquo;{layeringSign.fragrance.tagline}&rdquo;
                    </p>

                    {/* Layering Rationale */}
                    <div className="mt-5 border-t border-gold/15 pt-4 text-xs font-light text-muted leading-relaxed">
                      <p>
                        <span className="text-gold font-normal">Why layer together: </span>
                        {primarySign.element === "fire" || primarySign.element === "air"
                          ? "The radiant warmth of your primary signature balances with the airy brilliance of " +
                            layeringSign.name +
                            ", creating an intoxicating sillage that evolves from dusk to midnight."
                          : "The grounded, contemplative depths of your primary signature gain luminous sillage when paired with " +
                            layeringSign.name +
                            ", weaving a luxurious texture on skin."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gold/15">
                    <Link
                      href={routes.product(layeringSign.fragrance.slug)}
                      className="w-full min-h-[50px] rounded-full border border-gold/35 bg-surface/60 py-3.5 font-caps text-xs uppercase tracking-[0.2em] text-ivory hover:border-gold hover:bg-gold/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Explore {layeringSign.fragrance.name}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gold/20 pt-6">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[46px] rounded-full border border-gold/30 bg-surface/60 px-6 py-2.5 font-caps text-[11px] uppercase tracking-[0.2em] text-muted hover:text-ivory hover:border-gold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Calculate For Another Birth Date</span>
                </button>

                <Link
                  href={routes.product("zodiac-discovery-coffret")}
                  className="font-caps text-[11px] uppercase tracking-[0.2em] text-gold hover:text-ivory transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>Or Sample All 12 In The Zodiac Discovery Coffret →</span>
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
