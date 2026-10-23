import type { Note } from "@/config/zodiac";
import { Reveal } from "@/components/motion/Reveal";

const TIERS = [
  { key: "top", label: "Top notes", hint: "The first 15 minutes" },
  { key: "heart", label: "Heart notes", hint: "The next few hours" },
  { key: "base", label: "Base notes", hint: "What stays on your skin" },
] as const;

export function NotesPyramid({ notes }: { notes: { top: Note[]; heart: Note[]; base: Note[] } }) {
  return (
    <ol className="flex flex-col items-center gap-4">
      {TIERS.map((tier, i) => (
        <Reveal as="li" key={tier.key} delay={i * 0.12} className="w-full" y={16}>
          <div className="surface mx-auto flex flex-col items-center gap-3 px-6 py-5 text-center" style={{ maxWidth: `${60 + i * 20}%` }}>
            <div>
              <p className="eyebrow">{tier.label}</p>
              <p className="mt-1 text-xs text-muted">{tier.hint}</p>
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {notes[tier.key].map((n) => (
                <li key={n.name} className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-sm" title={n.family}>
                  {n.name}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
