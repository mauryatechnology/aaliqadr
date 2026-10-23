/**
 * SKU format shared by the catalogue, cart and checkout: `AQ-` + a product code + one or two
 * option codes, e.g. AQ-ARI-50, AQ-TRI-FIR, AQ-MST-100-RSE. Upper case, digits, dashes.
 */
export const SKU_RE = /^AQ-[A-Z0-9]{2,8}(?:-[A-Z0-9]{1,8}){1,2}$/;

/** "50 ml" → "50", "Rose Gold" → "RSG", "Limited Edition" → "LMT". */
export function skuPart(text: string, max = 4): string {
  const s = text.toUpperCase().normalize("NFKD").replace(/[^A-Z0-9 ]/g, " ").trim();
  if (!s) return "X";
  const digits = s.match(/\d+/)?.[0];
  if (digits) return digits.slice(0, max);
  const words = s.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").slice(0, max);
  const w = words[0]!;
  const consonants = w[0] + w.slice(1).replace(/[AEIOU]/g, "");
  return (consonants.length >= 3 ? consonants : w).slice(0, Math.min(max, 3));
}

/** Product code from a name: "Ember Crown" → "EMC", "Velvet Earth Body Mist" → "VEBM". */
export function productCode(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "PRD";
  if (words.length === 1) return skuPart(words[0]!, 3).padEnd(3, "X");
  return words.map((w) => w[0]).join("").slice(0, 4).padEnd(3, "X");
}

export function suggestSku(code: string, optionValues: string[]): string {
  const base = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRD";
  const parts = optionValues.filter(Boolean).slice(0, 2).map((v) => skuPart(v));
  return ["AQ", base, ...(parts.length ? parts : ["1"])].join("-");
}
