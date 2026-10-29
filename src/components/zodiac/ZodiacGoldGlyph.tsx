import { useId } from "react";
import type { ZodiacSlug } from "@/config/zodiac";
import { cn } from "@/lib/cn";

interface ZodiacGoldGlyphProps {
  sign: ZodiacSlug;
  className?: string;
  isSelected?: boolean;
}

export function ZodiacGoldGlyph({ sign, className, isSelected = false }: ZodiacGoldGlyphProps) {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9-_]/g, "");
  const gradId = `gold-grad-${safeId}`;
  const activeGradId = `gold-grad-active-${safeId}`;
  const filterId = `gold-shadow-${safeId}`;

  const currentGrad = isSelected ? `url(#${activeGradId})` : `url(#${gradId})`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke={currentGrad}
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={`url(#${filterId})`}
      className={cn(
        "shrink-0 transition-transform duration-300",
        isSelected ? "scale-105" : "group-hover:scale-105",
        className || "size-6"
      )}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle Metallic Champagne Gold Gradient for Default State */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F9F4E8" />
          <stop offset="35%" stopColor="#D8B55C" />
          <stop offset="75%" stopColor="#A88338" />
          <stop offset="100%" stopColor="#E5CB8C" />
        </linearGradient>

        {/* Luminous Warm Champagne Gold Gradient for Hover & Selected State */}
        <linearGradient id={activeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FCE088" />
          <stop offset="70%" stopColor="#C99F3B" />
          <stop offset="100%" stopColor="#F7E6B8" />
        </linearGradient>

        {/* Micro-engraving drop shadow (creates tactile embossed effect on dark espresso) */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.75" stdDeviation="0.45" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 12 Bespoke Fine-line Luxury Celestial Glyphs */}
      {sign === "aries" && (
        <g>
          <path d="M16 26.5V10" />
          <path d="M16 10C15.5 6.5 12 4 8 4C4.5 4 3 6.5 3 9.5C3 13 6.5 14.5 9.5 14.5" />
          <path d="M16 10C16.5 6.5 20 4 24 4C27.5 4 29 6.5 29 9.5C29 13 25.5 14.5 22.5 14.5" />
          <circle cx="9.5" cy="14.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="22.5" cy="14.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="16" cy="26.5" r="0.9" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "taurus" && (
        <g>
          <circle cx="16" cy="19.5" r="6.5" />
          <path d="M6 6.5C8 12 11.5 14 16 14C20.5 14 24 12 26 6.5" />
          <circle cx="6" cy="6.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="26" cy="6.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="16" cy="19.5" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "gemini" && (
        <g>
          <path d="M5 6C10.5 9 21.5 9 27 6" />
          <path d="M5 26C10.5 23 21.5 23 27 26" />
          <path d="M11 7.2V24.8" />
          <path d="M21 7.2V24.8" />
          <circle cx="11" cy="16" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="21" cy="16" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="5" cy="6" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="27" cy="6" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="5" cy="26" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="27" cy="26" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "cancer" && (
        <g>
          <circle cx="9.5" cy="11.5" r="4" />
          <path d="M13.5 11.5C13.5 7.5 17.5 5.5 24 6.5" />
          <circle cx="22.5" cy="20.5" r="4" />
          <path d="M18.5 20.5C18.5 24.5 14.5 26.5 8 25.5" />
          <circle cx="24" cy="6.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="8" cy="25.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="9.5" cy="11.5" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="22.5" cy="20.5" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "leo" && (
        <g>
          <circle cx="8.5" cy="21.5" r="3.5" />
          <path d="M12 21C12 14.5 16.5 5 22 5C25 5 27 7 27 9.5C27 15 22.5 18 22.5 22C22.5 25 24 26.5 26.5 26.5" />
          <circle cx="26.5" cy="26.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="8.5" cy="21.5" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "virgo" && (
        <g>
          <path d="M5 7V18.5C5 22.5 8 22.5 9.5 18.5V7" />
          <path d="M9.5 11C11 8.5 13.5 7 15.5 7C18 7 18.5 9.5 18.5 12V18.5C18.5 22.5 21.5 22.5 23 18.5V7" />
          <path d="M23 12C24.5 10 27 11.5 27 15C27 19.5 22 24.5 19 26" />
          <path d="M18 21.5L24.5 26" />
          <circle cx="19" cy="26" r="0.9" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "libra" && (
        <g>
          <path d="M4 26.5H28" />
          <path d="M4 20H9.5C10.5 14 13.5 11.5 16 11.5C18.5 11.5 21.5 14 22.5 20H28" />
          <circle cx="16" cy="6" r="1.75" />
          <circle cx="4" cy="26.5" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="28" cy="26.5" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="4" cy="20" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="28" cy="20" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "scorpio" && (
        <g>
          <path d="M4.5 7V18C4.5 22 7.5 22 9 18V7" />
          <path d="M9 11C10.5 8.5 13 7 15 7C17.5 7 18 9.5 18 12V18C18 22 21 22 22.5 18V8" />
          <path d="M22.5 13C24.5 11.5 26.5 13 26.5 16V25.5" />
          <path d="M23.5 23.5L26.5 26.5L29.5 23.5" />
          <circle cx="4.5" cy="7" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="9" cy="7" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="15" cy="7" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="22.5" cy="8" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "sagittarius" && (
        <g>
          <path d="M6 26L26 6" />
          <path d="M17 6H26V15" />
          <path d="M11 15L17 21" />
          <circle cx="6" cy="26" r="1" fill={currentGrad} stroke="none" />
          <circle cx="11" cy="15" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="17" cy="21" r="0.8" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "capricorn" && (
        <g>
          <path d="M5 7V18.5C5 22.5 8 22.5 9.5 18.5V7" />
          <path d="M9.5 11C11 8.5 13.5 7 15.5 7C18 7 18.5 9.5 18.5 12V19C18.5 22.5 21 24 23.5 22C25.5 20 27 21.5 27 23.5C27 26 24 27 21 27C18 27 17 24.5 19 21.5" />
          <circle cx="5" cy="7" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="9.5" cy="7" r="0.8" fill={currentGrad} stroke="none" />
          <circle cx="21" cy="27" r="0.9" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "aquarius" && (
        <g>
          <path d="M4 11L8.8 6.8L13.6 11L18.4 6.8L23.2 11L28 6.8" />
          <path d="M4 21L8.8 16.8L13.6 21L18.4 16.8L23.2 21L28 16.8" />
          <circle cx="4" cy="11" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="28" cy="6.8" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="4" cy="21" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="28" cy="16.8" r="0.9" fill={currentGrad} stroke="none" />
        </g>
      )}

      {sign === "pisces" && (
        <g>
          <path d="M8.5 4.5C5 11 5 21 8.5 27.5" />
          <path d="M23.5 4.5C27 11 27 21 23.5 27.5" />
          <path d="M3.5 16H28.5" />
          <circle cx="8.5" cy="4.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="23.5" cy="4.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="8.5" cy="27.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="23.5" cy="27.5" r="0.9" fill={currentGrad} stroke="none" />
          <circle cx="16" cy="16" r="1.1" fill={currentGrad} stroke="none" />
        </g>
      )}
    </svg>
  );
}
