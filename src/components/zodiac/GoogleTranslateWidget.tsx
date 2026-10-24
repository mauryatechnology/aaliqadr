"use client";

import { useEffect, useState, useRef } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import type { SupportedLang } from "@/lib/finder-i18n";

export const SUPPORTED_LANGUAGES: readonly { code: SupportedLang; label: string; nativeName: string }[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "gu", label: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "ur", label: "Urdu", nativeName: "اردو" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "de", label: "German", nativeName: "Deutsch" },
] as const;

export function GoogleTranslateWidget({
  currentLang = "en",
  onLanguageChange,
}: {
  currentLang?: SupportedLang;
  onLanguageChange?: (langCode: SupportedLang) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLanguage(code: SupportedLang) {
    setIsOpen(false);
    onLanguageChange?.(code);
  }

  const selectedObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]!;

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Luxury Language Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-surface/90 px-4 py-2 text-xs font-medium text-fg shadow-md backdrop-blur-md transition-all hover:border-gold hover:bg-surface active:scale-95 cursor-pointer"
        aria-label="Select translation language"
        aria-expanded={isOpen}
      >
        <Globe className="size-3.5 text-gold" />
        <span className="font-sans">Language: {selectedObj.nativeName}</span>
        <ChevronDown className={`size-3 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-white/15 bg-obsidian/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="px-3 py-1.5 border-b border-white/10 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
            Translate Page
          </div>
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => switchLanguage(lang.code)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    active ? "bg-gold/15 text-gold font-medium" : "text-fg/80 hover:bg-white/5 hover:text-fg"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.nativeName}</span>
                    <span className="text-[0.68rem] text-muted">({lang.label})</span>
                  </span>
                  {active && <Check className="size-3.5 text-gold" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
