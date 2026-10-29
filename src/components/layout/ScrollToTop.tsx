"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * ScrollToTop
 * - Ultra-luxury Haute-Parfumerie floating button to return to the top of the page.
 * - Visible on all pages whenever the user scrolls down past 380px.
 * - Sits gracefully above the mobile bottom nav on mobile (bottom-20) and bottom-8 on desktop.
 * - Smooth luxury ease-out scroll with keyboard accessibility and circular gold medallion styling.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;

          setVisible(scrollY > 380);

          if (docHeight > 0) {
            const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
            setScrollProgress(progress);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  // Circular progress math (circumference for r=19 is ~119.4)
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      className={`fixed right-4 sm:right-7 bottom-20 sm:bottom-8 z-40 transition-all duration-400 ease-lux ${
        visible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-90 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll back to top of page"
        className="group relative flex size-12 sm:size-13 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#241A12] via-[#14100B] to-[#0A0806] shadow-[0_8px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,230,160,0.35)] transition-all duration-300 hover:scale-108 hover:border-gold hover:shadow-[0_0_24px_rgba(201,169,110,0.5),0_8px_30px_rgba(0,0,0,0.8)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0A0F]"
      >
        {/* Subtle background starlight glow on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: "radial-gradient(circle, rgba(201,169,110,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Circular Scroll Progress Ring */}
        <svg
          viewBox="0 0 44 44"
          className="pointer-events-none absolute inset-0 size-full -rotate-90 select-none"
          aria-hidden="true"
        >
          {/* Faint track */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#C9A96E"
            strokeOpacity="0.15"
            strokeWidth="1.5"
          />
          {/* Active progress stroke */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="url(#scroll-top-gold-gradient)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
          <defs>
            <linearGradient id="scroll-top-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4D0" />
              <stop offset="50%" stopColor="#C9A96E" />
              <stop offset="100%" stopColor="#9E7324" />
            </linearGradient>
          </defs>
        </svg>

        {/* Arrow Up Icon with subtle hover leap */}
        <ArrowUp className="size-5 text-gold transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-gold-soft" />
      </button>
    </div>
  );
}
