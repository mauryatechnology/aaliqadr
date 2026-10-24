import type { Note } from "@/config/zodiac";
import { Reveal } from "@/components/motion/Reveal";

const TIERS = [
  {
    key: "top",
    label: "Top notes",
    phase: "Opening · First 15 minutes",
    widthClass: "w-full sm:max-w-[72%]",
    pillBorder: "border-amber-400/30 hover:border-amber-300/70",
    glow: "rgba(245,158,11,0.08)",
  },
  {
    key: "heart",
    label: "Heart notes",
    phase: "Core · 2 to 6 hours",
    widthClass: "w-full sm:max-w-[86%]",
    pillBorder: "border-rose-400/30 hover:border-rose-300/70",
    glow: "rgba(244,63,94,0.08)",
  },
  {
    key: "base",
    label: "Base notes",
    phase: "Drydown · 8 to 14+ hours",
    widthClass: "w-full sm:max-w-full",
    pillBorder: "border-gold/35 hover:border-gold-light/70",
    glow: "rgba(196,160,68,0.1)",
  },
] as const;

export function NotesPyramid({ notes }: { notes: { top: Note[]; heart: Note[]; base: Note[] } }) {
  return (
    <ol className="flex flex-col items-center gap-4 sm:gap-5">
      {TIERS.map((tier, i) => {
        const tierNotes = notes[tier.key] ?? [];
        if (tierNotes.length === 0) return null;

        return (
          <Reveal as="li" key={tier.key} delay={i * 0.12} className="w-full flex justify-center" y={16}>
            <div
              className={`surface relative flex flex-col items-center gap-3.5 px-6 py-6 text-center ${tier.widthClass} transition-all duration-300 hover:shadow-xl`}
              style={{
                background: `radial-gradient(100% 120% at 50% 0%, ${tier.glow}, transparent 75%), color-mix(in oklab, var(--color-surface) 80%, transparent)`,
              }}
            >
              {/* Header with high-contrast label and clear timing phase */}
              <div className="flex flex-col items-center gap-1">
                <span className="font-caps text-xs sm:text-sm font-semibold uppercase tracking-[0.24em] text-gold-light drop-shadow-[0_1px_8px_rgba(212,175,55,0.3)]">
                  {tier.label}
                </span>
                <span className="text-xs sm:text-sm font-medium text-ivory/85">
                  {tier.phase}
                </span>
              </div>

              {/* Note pills: clearly legible with high contrast, background fill, and luminous indicator */}
              <ul className="flex flex-wrap justify-center gap-2.5 pt-1">
                {tierNotes.map((n) => (
                  <li
                    key={n.name}
                    className={`group relative rounded-full border ${tier.pillBorder} bg-black/45 px-4 py-2 text-sm sm:text-base font-medium text-ivory shadow-[0_2px_12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 hover:scale-[1.03] hover:bg-gold/10 hover:text-white`}
                    title={n.family ? `Olfactive Family: ${n.family}` : undefined}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-gold-light/90 shadow-[0_0_6px_var(--color-gold)]" aria-hidden />
                      {n.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        );
      })}
    </ol>
  );
}
