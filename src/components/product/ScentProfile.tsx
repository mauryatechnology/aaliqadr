import type { ProductDTO } from "@/server/catalog/types";

function Meter({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ivory font-medium">{label}</span>
        <span className="text-gold-light font-medium text-xs sm:text-sm">{caption}</span>
      </div>
      <div className="flex gap-1" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={value}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-full transition-colors"
            style={{
              background: i < value ? "var(--z-primary)" : "rgba(255, 255, 255, 0.16)",
              boxShadow: i < value ? "0 0 8px var(--z-primary)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const WORDS = ["", "Whisper", "Soft", "Moderate", "Strong", "Commanding"];

export function ScentProfile({ profile }: { profile: NonNullable<ProductDTO["profile"]> }) {
  const [lo, hi] = profile.longevityHours;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <Meter label="Intensity" value={profile.intensity} caption={WORDS[profile.intensity] ?? ""} />
      <Meter label="Longevity" value={Math.min(5, Math.ceil(hi / 2.4))} caption={`${lo}–${hi} hours`} />
      <Meter label="Sillage" value={profile.sillage} caption={WORDS[profile.sillage] ?? ""} />
    </div>
  );
}
