"use client";

import Link from "next/link";
import { useId, useState, useRef } from "react";
import { ArrowRight, Sparkles, Moon, Sun, Compass, Clock, MapPin, AlertTriangle, CheckCircle2, Loader2, User, Map } from "lucide-react";
import { SIGNS, type ZodiacSign } from "@/config/zodiac";
import { formatSignDates, sunSignFor } from "@/lib/zodiac-math";
import { calculateVedicMoon, type VedicMoonCalculation } from "@/lib/vedic-astro";
import { GoogleTranslateWidget } from "@/components/zodiac/GoogleTranslateWidget";
import { fetchExternalAstrologyAction, type ExternalAstrologyData } from "@/actions/astrology";
import { FINDER_I18N, type SupportedLang } from "@/lib/finder-i18n";
import { PlaceSearch, type SelectedLocation } from "@/components/zodiac/PlaceSearch";
import { MapLocationPicker } from "@/components/zodiac/MapLocationPicker";
import { routes } from "@/lib/routes";

export function SignFinder() {
  const id = useId();
  const [lang, setLang] = useState<SupportedLang>("en");
  const t = FINDER_I18N[lang] || FINDER_I18N.en;

  const [mode, setMode] = useState<"vedic" | "western" | "direct">("vedic");

  // User personalization
  const [userName, setUserName] = useState("");

  // Map Picker Modal state
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Vedic inputs
  const [vedicDate, setVedicDate] = useState("");
  const [vedicTime, setVedicTime] = useState("12:00");
  const [unknownTime, setUnknownTime] = useState(false);
  const [location, setLocation] = useState<SelectedLocation>({
    name: "New Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.6139,
    lng: 77.209,
    tz: 5.5,
  });
  const [vedicResult, setVedicResult] = useState<VedicMoonCalculation | null>(null);

  // External API verification state
  const [externalData, setExternalData] = useState<ExternalAstrologyData | null>(null);
  const [isExternalLoading, setIsExternalLoading] = useState(false);

  // Western inputs
  const [westernDate, setWesternDate] = useState("");
  const [westernResult, setWesternResult] = useState<ZodiacSign | null>(null);

  // Selected sign for direct mode or view
  const [selectedSign, setSelectedSign] = useState<ZodiacSign | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  function handleVedicCalculate(
    dateStr: string,
    timeStr: string,
    isUnknown: boolean,
    loc = location,
    scrollDown = false
  ) {
    if (!dateStr) {
      setVedicResult(null);
      setExternalData(null);
      return;
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return;

    let hour = 12;
    let min = 0;
    if (!isUnknown && timeStr) {
      const parts = timeStr.split(":");
      const h = parts[0] ? Number(parts[0]) : NaN;
      const mi = parts[1] ? Number(parts[1]) : NaN;
      if (Number.isFinite(h)) hour = h;
      if (Number.isFinite(mi)) min = mi;
    }

    // 1. Instant mathematical calculation using accurate location timezone
    const calc = calculateVedicMoon(y, m, d, hour, min, loc.tz);
    setVedicResult(calc);
    setSelectedSign(calc.sign);

    if (scrollDown) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }

    // 2. Query keyless external Vedic API for live Panchang verification with exact coords
    setIsExternalLoading(true);

    fetchExternalAstrologyAction({
      date: dateStr,
      lat: loc.lat,
      lng: loc.lng,
      signSlug: calc.sign.slug,
    })
      .then((res) => {
        if (res.ok && res.data) {
          setExternalData(res.data);
        }
      })
      .catch(() => {
        // Safe fallback guaranteed
      })
      .finally(() => {
        setIsExternalLoading(false);
      });
  }

  function handleWesternDate(value: string) {
    setWesternDate(value);
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(value);
    if (m) {
      const sign = sunSignFor(Number(m[1]), Number(m[2]));
      setWesternResult(sign);
      setSelectedSign(sign);
    } else {
      setWesternResult(null);
      setSelectedSign(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Top Bar with Language Selector and Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
        {/* Mode Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Astrological Calculation System"
          className="flex flex-wrap justify-center gap-1.5 rounded-full border border-white/15 bg-surface/80 p-1.5 backdrop-blur-md"
        >
          <button
            role="tab"
            aria-selected={mode === "vedic"}
            onClick={() => {
              setMode("vedic");
              if (vedicResult) setSelectedSign(vedicResult.sign);
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 cursor-pointer ${
              mode === "vedic"
                ? "bg-gold text-obsidian shadow-lg shadow-gold/20"
                : "text-fg/75 hover:bg-white/5 hover:text-fg"
            }`}
          >
            <Moon className="size-3.5" />
            <span>{t.vedicTab}</span>
          </button>

          <button
            role="tab"
            aria-selected={mode === "western"}
            onClick={() => {
              setMode("western");
              if (westernResult) setSelectedSign(westernResult);
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 cursor-pointer ${
              mode === "western"
                ? "bg-gold text-obsidian shadow-lg shadow-gold/20"
                : "text-fg/75 hover:bg-white/5 hover:text-fg"
            }`}
          >
            <Sun className="size-3.5" />
            <span>{t.westernTab}</span>
          </button>

          <button
            role="tab"
            aria-selected={mode === "direct"}
            onClick={() => setMode("direct")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 cursor-pointer ${
              mode === "direct"
                ? "bg-gold text-obsidian shadow-lg shadow-gold/20"
                : "text-fg/75 hover:bg-white/5 hover:text-fg"
            }`}
          >
            <Compass className="size-3.5" />
            <span>{t.directTab}</span>
          </button>
        </div>

        {/* Translation Language Selector */}
        <div className="flex items-center gap-2">
          <GoogleTranslateWidget currentLang={lang} onLanguageChange={setLang} />
        </div>
      </div>

      {/* Mode 1: Vedic Moon Sign Calculation */}
      {mode === "vedic" && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-3xl border border-white/10 bg-surface/50 p-6 sm:p-8 backdrop-blur-md shadow-xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-gold">
              <Sparkles className="size-3" /> Vedic Astrology
            </span>
            <h2 className="mt-3 font-display text-2xl text-fg sm:text-3xl">{t.vedicHeading}</h2>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              {t.vedicSubheading}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Name Input (Personalization) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-user-name`} className="flex items-center justify-between text-xs font-medium text-fg/90">
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5 text-gold" /> {t.nameLabel}
                </span>
                <span className="text-[0.68rem] text-muted">{t.optionalLabel}</span>
              </label>
              <input
                id={`${id}-user-name`}
                type="text"
                placeholder={t.namePlaceholder}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="surface h-13 w-full rounded-xl border border-white/15 px-4 text-base text-fg placeholder:text-muted/50 focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            {/* Date Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-vedic-date`} className="flex items-center gap-1.5 text-xs font-medium text-fg/90">
                <Sparkles className="size-3.5 text-gold" /> {t.dobLabel}
              </label>
              <input
                id={`${id}-vedic-date`}
                type="date"
                min="1920-01-01"
                max="2026-12-31"
                value={vedicDate}
                onChange={(e) => {
                  setVedicDate(e.target.value);
                  handleVedicCalculate(e.target.value, vedicTime, unknownTime, location);
                }}
                className="surface h-13 w-full rounded-xl border border-white/15 px-4 text-base text-fg [color-scheme:dark] focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            {/* Time of Birth & Place of Birth Search */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-vedic-time`} className="flex items-center gap-1.5 text-xs font-medium text-fg/90">
                  <Clock className="size-3.5 text-gold" /> {t.tobLabel}
                </label>
                <input
                  id={`${id}-vedic-time`}
                  type="time"
                  disabled={unknownTime}
                  value={vedicTime}
                  onChange={(e) => {
                    setVedicTime(e.target.value);
                    handleVedicCalculate(vedicDate, e.target.value, unknownTime, location);
                  }}
                  className={`surface h-13 w-full rounded-xl border px-4 text-base text-fg [color-scheme:dark] focus:border-gold focus:outline-none transition-colors ${
                    unknownTime ? "border-white/5 opacity-40 cursor-not-allowed" : "border-white/15"
                  }`}
                />
              </div>

              {/* Place of Birth with Worldwide Autocomplete Search & Map Picker */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={`${id}-vedic-city`} className="flex items-center gap-1.5 text-xs font-medium text-fg/90">
                    <MapPin className="size-3.5 text-gold" /> {t.pobLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    className="flex items-center gap-1 text-[0.7rem] text-gold hover:text-gold-light transition-colors font-medium cursor-pointer"
                  >
                    <Map className="size-3" />
                    <span>{t.pickOnMapBtn}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <PlaceSearch
                      id={`${id}-vedic-city`}
                      value={location}
                      placeholder={t.placeSearchPlaceholder}
                      onChange={(newLoc) => {
                        setLocation(newLoc);
                        if (vedicDate) {
                          handleVedicCalculate(vedicDate, vedicTime, unknownTime, newLoc);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    title={t.pickOnMapBtn}
                    className="flex size-13 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold shadow-md shadow-gold/5 transition-all cursor-pointer"
                  >
                    <Map className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Unknown Time Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-muted hover:text-fg select-none">
              <input
                type="checkbox"
                checked={unknownTime}
                onChange={(e) => {
                  setUnknownTime(e.target.checked);
                  handleVedicCalculate(vedicDate, vedicTime, e.target.checked, location);
                }}
                className="size-4 rounded border-white/20 bg-surface accent-gold cursor-pointer"
              />
              <span>{t.unknownTimeLabel}</span>
            </label>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={() => handleVedicCalculate(vedicDate, vedicTime, unknownTime, location, true)}
              disabled={!vedicDate}
              className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gold font-medium text-sm text-obsidian shadow-lg shadow-gold/15 transition-all hover:bg-gold-light hover:shadow-gold/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isExternalLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t.calculatingBtn}</span>
                </>
              ) : (
                <>
                  <span>{t.calculateBtn}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <p className="text-center text-[0.7rem] text-muted/70">
            {t.privacyNote}
          </p>
        </div>
      )}

      {/* Interactive Map Picker Modal */}
      <MapLocationPicker
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        currentLocation={location}
        onConfirm={(newLoc) => {
          setLocation(newLoc);
          if (vedicDate) {
            handleVedicCalculate(vedicDate, vedicTime, unknownTime, newLoc);
          }
        }}
      />

      {/* Mode 2: Western Sun Sign Mode */}
      {mode === "western" && (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-surface/50 p-6 sm:p-8 backdrop-blur-md text-center shadow-xl">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-gold">
              <Sun className="size-3" /> Tropical Solar Calendar
            </span>
            <h2 className="mt-3 font-display text-2xl text-fg sm:text-3xl">{t.westernHeading}</h2>
            <p className="mt-2 text-xs sm:text-sm text-muted">
              {t.westernSubheading}
            </p>
          </div>

          <div className="w-full max-w-xs space-y-2">
            <label htmlFor={`${id}-western-date`} className="text-xs text-muted">
              {t.dobLabel}
            </label>
            <input
              id={`${id}-western-date`}
              type="date"
              min="1920-01-01"
              max="2026-12-31"
              value={westernDate}
              onChange={(e) => handleWesternDate(e.target.value)}
              className="surface h-14 w-full rounded-xl border border-white/15 px-4 text-center text-lg text-fg [color-scheme:dark] focus:border-gold focus:outline-none transition-colors"
            />
          </div>

          <p className="max-w-md text-xs text-muted/80 leading-relaxed">
            Western astrology assigns your zodiac sign based solely on your solar calendar birthday. For deeper alignment, switch to the <strong>{t.vedicTab}</strong> tab above.
          </p>
        </div>
      )}

      {/* Mode 3: Direct Sign Selector */}
      {mode === "direct" && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="font-display text-2xl sm:text-3xl text-fg">{t.directHeading}</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              {t.directSubheading}
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {SIGNS.map((s) => {
              const isCurrent = selectedSign?.slug === s.slug;
              return (
                <li key={s.slug} data-zodiac={s.slug} data-element={s.element}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSign(s);
                      setTimeout(() => {
                        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}
                    className={`surface flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 cursor-pointer ${
                      isCurrent
                        ? "border-gold bg-gold/10 ring-1 ring-gold shadow-lg"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span
                      className="text-3xl transition-transform duration-300 group-hover:scale-110"
                      style={{ color: "var(--z-primary)" }}
                      aria-hidden
                    >
                      {s.glyph}
                      {"︎"}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-display text-lg leading-tight text-fg">
                        {s.rashi}
                      </span>
                      <span className="text-xs text-muted">{s.name}</span>
                      <span className="mt-0.5 text-[0.65rem] uppercase tracking-wider text-muted/70">
                        {s.element} · {s.rulingPlanet}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Results Display */}
      {selectedSign && (
        <div ref={resultRef} aria-live="polite" className="w-full scroll-mt-24">
          <FragranceResultCard
            sign={selectedSign}
            userName={userName}
            vedicCalculation={mode === "vedic" ? vedicResult : null}
            externalData={mode === "vedic" ? externalData : null}
            mode={mode}
            t={t}
          />
        </div>
      )}

      {/* Subtle, tasteful luxury disclaimer at the very bottom (NOT highlighted or intrusive) */}
      <footer className="mx-auto max-w-xl text-center py-6 border-t border-white/10">
        <p className="text-xs text-muted/70 leading-relaxed">
          {t.disclaimer}
        </p>
      </footer>
    </div>
  );
}

/**
 * Detailed Result Card for the Matched Sign & Signature Extrait de Parfum
 */
function FragranceResultCard({
  sign,
  userName,
  vedicCalculation,
  externalData,
  mode,
  t,
}: {
  sign: ZodiacSign;
  userName?: string;
  vedicCalculation: VedicMoonCalculation | null;
  externalData: ExternalAstrologyData | null;
  mode: "vedic" | "western" | "direct";
  t: (typeof FINDER_I18N)["en"];
}) {
  return (
    <div
      data-zodiac={sign.slug}
      data-element={sign.element}
      className="surface mx-auto flex w-full max-w-2xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/15 p-6 sm:p-10 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-300"
    >
      {/* Decorative ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--z-glow)" }}
      />

      {/* Glyph & Badge */}
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-7xl leading-none" style={{ color: "var(--z-primary)" }} aria-hidden>
          {sign.glyph}
          {"︎"}
        </span>

        {mode === "vedic" && vedicCalculation && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-1 text-xs text-gold">
            <Moon className="size-3" />
            <span>{t.vedicTab}: {vedicCalculation.rashiEnglish}</span>
          </div>
        )}

        {mode === "western" && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs text-fg/80">
            <Sun className="size-3" />
            <span>{t.westernTab}: {formatSignDates(sign)}</span>
          </div>
        )}

        {mode === "direct" && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs text-fg/80">
            <Compass className="size-3" />
            <span>House of {sign.rashi} ({sign.name})</span>
          </div>
        )}
      </div>

      {/* Sign Header */}
      <div className="space-y-1">
        <h3 className="font-display text-3xl sm:text-4xl text-fg">
          {userName?.trim() ? (
            <>
              <span className="text-gold font-normal">{userName.trim()}</span>, you are{" "}
            </>
          ) : (
            "You are "
          )}
          <span style={{ color: "var(--z-secondary)" }}>{sign.name}</span> · {sign.rashi}
        </h3>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Element: <span className="text-fg font-medium">{sign.element}</span> · Ruling Planet:{" "}
          <span className="text-fg font-medium">{sign.rulingPlanet}</span>
        </p>
      </div>

      {/* External API Verification Badge (Subtle, refined luxury styling) */}
      {externalData && (
        <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-left text-xs text-emerald-200/90 backdrop-blur-md">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>{t.verifiedBadge}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.72rem] text-emerald-200/80">
            {externalData.panchang?.nakshatra && (
              <span>
                <strong>Live Star:</strong> {externalData.panchang.nakshatra}
              </span>
            )}
            {externalData.panchang?.tithi && (
              <span>
                <strong>Tithi:</strong> {externalData.panchang.tithi}
              </span>
            )}
            {externalData.horoscope?.luckyColor && (
              <span>
                <strong>Lucky Astrological Color:</strong> {externalData.horoscope.luckyColor}
              </span>
            )}
            {externalData.horoscope?.luckyNumber ? (
              <span>
                <strong>Lucky Number:</strong> {externalData.horoscope.luckyNumber}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Cusp Alert if birth happened near boundary */}
      {vedicCalculation?.isCusp && vedicCalculation.cuspWarning && (
        <div className="w-full rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3.5 text-left text-xs text-yellow-200/90 flex items-start gap-2.5">
          <AlertTriangle className="size-4 text-yellow-400 shrink-0 mt-0.5" />
          <p>{vedicCalculation.cuspWarning}</p>
        </div>
      )}

      {/* Vedic Kundali Breakdown (if calculated via Vedic) */}
      {vedicCalculation && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <div>
            <span className="text-[0.65rem] uppercase tracking-wider text-muted">{t.moonSignLabel}</span>
            <p className="text-sm font-semibold text-fg">{sign.rashi}</p>
          </div>
          <div>
            <span className="text-[0.65rem] uppercase tracking-wider text-muted">{t.birthStarLabel}</span>
            <p className="text-sm font-semibold text-fg">
              {vedicCalculation.nakshatra.name} <span className="text-xs text-gold">Pada {vedicCalculation.pada}</span>
            </p>
          </div>
          <div>
            <span className="text-[0.65rem] uppercase tracking-wider text-muted">{t.rulingGrahaLabel}</span>
            <p className="text-sm font-semibold text-fg">{vedicCalculation.nakshatra.ruler}</p>
          </div>
          <div>
            <span className="text-[0.65rem] uppercase tracking-wider text-muted">{t.moonDegreesLabel}</span>
            <p className="text-sm font-semibold text-fg">{vedicCalculation.degreesInSignFormatted}</p>
          </div>
        </div>
      )}

      {/* Additional Vedic Attributes: Gana, Yoni, Nadi */}
      {vedicCalculation && (
        <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left">
          <div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted">{t.temperamentLabel}</span>
            <p className="text-xs font-medium text-fg/90">{vedicCalculation.nakshatra.gana}</p>
          </div>
          <div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted">{t.yoniLabel}</span>
            <p className="text-xs font-medium text-fg/90">{vedicCalculation.nakshatra.yoni}</p>
          </div>
          <div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted">{t.nadiLabel}</span>
            <p className="text-xs font-medium text-fg/90">{vedicCalculation.nakshatra.nadi}</p>
          </div>
        </div>
      )}

      {/* Fragrance Highlight */}
      <div className="w-full rounded-2xl border border-white/10 bg-surface/90 p-5 sm:p-6 text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold">
                {t.fragranceHeading}
              </span>
              {userName?.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[0.65rem] text-gold font-medium tracking-wide">
                  <Sparkles className="size-2.5" />
                  {t.personalizedFor} {userName.trim()}
                </span>
              )}
            </div>
            <h4 className="font-display text-2xl text-fg mt-0.5">{sign.fragrance.name}</h4>
            <p className="text-xs text-muted">Extrait de Parfum · Pure Concentration (30-35%)</p>
          </div>
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-muted">
            <span>{t.intensityLabel}</span>
            <span className="text-gold">{"★".repeat(sign.fragrance.intensity)}</span>
          </div>
        </div>

        <p className="italic text-sm text-fg/90">&ldquo;{sign.fragrance.tagline}&rdquo;</p>

        {/* Notes Pyramid Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[0.65rem] uppercase tracking-wider text-gold/80 block mb-1">{t.topNotesLabel}</span>
            <p className="text-xs text-fg/90">
              {sign.fragrance.notes.top.map((n) => n.name).join(", ")}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[0.65rem] uppercase tracking-wider text-gold/80 block mb-1">{t.heartNotesLabel}</span>
            <p className="text-xs text-fg/90">
              {sign.fragrance.notes.heart.map((n) => n.name).join(", ")}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[0.65rem] uppercase tracking-wider text-gold/80 block mb-1">{t.baseNotesLabel}</span>
            <p className="text-xs text-fg/90">
              {sign.fragrance.notes.base.map((n) => n.name).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Link
          href={routes.product(sign.fragrance.slug)}
          className="inline-flex h-13 w-full sm:w-1/2 items-center justify-center gap-2 rounded-full font-caps text-xs uppercase tracking-[0.2em] transition-transform hover:-translate-y-0.5 shadow-lg active:scale-95"
          style={{ background: "var(--z-primary)", color: "var(--z-on-primary)" }}
        >
          <span>{t.discoverFragranceBtn}: {sign.fragrance.name}</span>
          <ArrowRight className="size-4" />
        </Link>

        <Link
          href={routes.sign(sign.slug)}
          className="inline-flex h-13 w-full sm:w-1/2 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 font-caps text-xs uppercase tracking-[0.2em] text-fg transition-all hover:bg-white/10 hover:border-white/35 active:scale-95"
        >
          <span>{t.exploreHouseBtn}: {sign.name}</span>
        </Link>
      </div>
    </div>
  );
}
