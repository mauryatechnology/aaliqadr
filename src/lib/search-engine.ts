/**
 * Storefront search (plan.md §9.2), phase 1: an in-memory index over the cached catalogue.
 * Pure, so it is unit-tested and runs anywhere. Phase 2 (Atlas Search) can sit behind the same
 * `search()` shape without page changes.
 *
 *  - normalise: lower-case, accents and punctuation removed, light stemming ("woods" → "wood");
 *  - synonyms: rashi ↔ sign, Hindi ↔ English notes, plus any the store adds in Admin › Content;
 *  - typos: edit distance 1 for words of 4–7 letters, 2 for 8+;
 *  - weights: name > sign/rashi > tags > notes > category > description;
 *  - boosts: in stock, bestseller, rating.
 */

export interface SearchDoc {
  id: string;
  name: string;
  sign: string;
  tags: string;
  notes: string;
  category: string;
  description: string;
  inStock: boolean;
  salesCount: number;
  ratingAvg: number;
}

type Field = Exclude<keyof SearchDoc, "id" | "inStock" | "salesCount" | "ratingAvg">;
const WEIGHTS: Record<Field, number> = { name: 10, sign: 8, tags: 6, notes: 5, category: 3, description: 1 };

/** Built-in synonym groups; each word in a group finds the others. */
export const DEFAULT_SYNONYMS: string[][] = [
  ["aries", "mesh", "mesha"],
  ["taurus", "vrishabh", "vrishabha", "vrushabh"],
  ["gemini", "mithun", "mithuna"],
  ["cancer", "kark", "karka"],
  ["leo", "simha", "singh", "sinh"],
  ["virgo", "kanya"],
  ["libra", "tula", "tul"],
  ["scorpio", "vrishchik", "vrishchika", "vrischik"],
  ["sagittarius", "dhanu", "dhanus"],
  ["capricorn", "makar", "makara"],
  ["aquarius", "kumbh", "kumbha"],
  ["pisces", "meen", "meena"],
  ["saffron", "kesar", "zafran"],
  ["sandalwood", "chandan", "sandal"],
  ["rose", "gulab"],
  ["oud", "agarwood", "agar"],
  ["jasmine", "mogra", "chameli", "jasmin"],
  ["vetiver", "khus", "khas"],
  ["cardamom", "elaichi", "elaichi"],
  ["incense", "loban", "frankincense", "agarbatti"],
  ["musk", "kasturi"],
  ["citrus", "nimbu", "lemon"],
  ["perfume", "attar", "ittar", "fragrance", "scent", "parfum"],
  ["gift", "gifting", "present"],
];

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very light stemming: plural endings only, so "woods" and "wood" meet. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

export const tokens = (s: string) => normalise(s).split(" ").filter(Boolean).map(stem);

/** Levenshtein distance, giving up early once it exceeds `max`. */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]!);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

const allowance = (w: string) => (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0);

export interface SearchIndex {
  docs: { doc: SearchDoc; fields: Record<Field, Set<string>> }[];
  vocabulary: string[];
  synonyms: Map<string, string[]>;
}

export function buildIndex(docs: SearchDoc[], extraSynonyms: string[][] = []): SearchIndex {
  const synonyms = new Map<string, string[]>();
  for (const group of [...DEFAULT_SYNONYMS, ...extraSynonyms]) {
    const words = [...new Set(group.flatMap(tokens))];
    for (const w of words) synonyms.set(w, [...new Set([...(synonyms.get(w) ?? []), ...words.filter((x) => x !== w)])]);
  }
  const vocab = new Set<string>();
  const indexed = docs.map((doc) => {
    const fields = Object.fromEntries((Object.keys(WEIGHTS) as Field[]).map((f) => [f, new Set(tokens(doc[f]))])) as Record<Field, Set<string>>;
    for (const f of Object.values(fields)) for (const t of f) if (t.length > 2) vocab.add(t);
    return { doc, fields };
  });
  return { docs: indexed, vocabulary: [...vocab], synonyms };
}

/** How well one query word matches a field's words: exact 1, prefix 0.8, synonym 0.9, typo 0.6. */
function matchWord(q: string, words: Set<string>, synonyms: Map<string, string[]>): number {
  if (words.has(q)) return 1;
  for (const s of synonyms.get(q) ?? []) if (words.has(s)) return 0.9;
  let best = 0;
  const max = allowance(q);
  for (const w of words) {
    if (q.length >= 3 && w.startsWith(q)) best = Math.max(best, 0.8);
    else if (max && distance(q, w, max) <= max) best = Math.max(best, 0.6);
  }
  return best;
}

export interface Hit {
  id: string;
  score: number;
}

export function search(index: SearchIndex, query: string, limit = 60): Hit[] {
  const q = tokens(query).filter((t) => t.length > 1 || /\d/.test(t));
  if (!q.length) return [];
  const maxSales = Math.max(1, ...index.docs.map((d) => d.doc.salesCount));
  const hits: Hit[] = [];
  for (const { doc, fields } of index.docs) {
    let total = 0;
    let matched = 0;
    for (const word of q) {
      let best = 0;
      for (const f of Object.keys(WEIGHTS) as Field[]) best = Math.max(best, matchWord(word, fields[f], index.synonyms) * WEIGHTS[f]);
      if (best > 0) matched++;
      total += best;
    }
    // Every word must match somewhere (AND), so "rose oud" doesn't return all roses.
    if (matched < q.length) continue;
    const boost = 1 + (doc.inStock ? 0.15 : 0) + 0.1 * (doc.salesCount / maxSales) + 0.02 * doc.ratingAvg;
    hits.push({ id: doc.id, score: total * boost });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** "Did you mean": the closest catalogue word for each query word that matched nothing exactly. */
export function didYouMean(index: SearchIndex, query: string): string | null {
  const words = tokens(query);
  let changed = false;
  const fixed = words.map((w) => {
    if (index.vocabulary.includes(w) || index.synonyms.has(w)) return w;
    let best: { w: string; d: number } | null = null;
    for (const v of index.vocabulary) {
      const d = distance(w, v, 2);
      if (d <= 2 && (!best || d < best.d)) best = { w: v, d };
    }
    if (best) {
      changed = true;
      return best.w;
    }
    return w;
  });
  return changed ? fixed.join(" ") : null;
}
