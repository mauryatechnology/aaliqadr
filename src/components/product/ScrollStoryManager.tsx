"use client";

import { useEffect, useState } from "react";
import { useReducedMotionPreference } from "@/lib/use-motion";

export function ScrollStoryManager({
  signAccent = "#C9A96E",
}: {
  signAccent?: string;
}) {
  const reduced = useReducedMotionPreference();
  const [, setStage] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (reduced) return;

    const sections = [
      { id: "section-story", stage: 1 as const },
      { id: "section-notes", stage: 2 as const },
      { id: "section-ritual", stage: 3 as const },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const found = sections.find((s) => s.id === entry.target.id);
            if (found) {
              setStage(found.stage);
              // Update CSS variables on documentElement or root container
              const root = document.querySelector<HTMLElement>("[data-scroll-story-root]");
              if (root) {
                const rotation = found.stage === 1 ? "0deg" : found.stage === 2 ? "3.5deg" : "-2.5deg";
                const glowOpacity = found.stage === 1 ? "0.22" : found.stage === 2 ? "0.38" : "0.28";
                root.style.setProperty("--story-bottle-rotate", rotation);
                root.style.setProperty("--story-glow-opacity", glowOpacity);
                root.style.setProperty("--story-glow-accent", signAccent);
              }
            }
          }
        }
      },
      { threshold: 0.35, rootMargin: "-10% 0px -40% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reduced, signAccent]);

  return null;
}
