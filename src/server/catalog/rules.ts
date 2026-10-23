import type { ProductDTO } from "./types";

/**
 * Smart-collection rules (docs/04 §4.3). Pure, so the admin preview, the storefront and the
 * tests evaluate a rule set identically. The catalogue is small (tens of products), so rules
 * run over the cached product list instead of being compiled into a database query.
 */

export const RULE_FIELDS = {
  tag: "Tag",
  badge: "Badge",
  category: "Category",
  sign: "Zodiac sign",
  element: "Element",
  type: "Product type",
  price: "Price (₹)",
  stock: "Total stock",
  title: "Name",
} as const;
export type RuleField = keyof typeof RULE_FIELDS;

export const RULE_OPS = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
} as const;
export type RuleOp = keyof typeof RULE_OPS;

export interface RuleCondition {
  field: RuleField;
  op: RuleOp;
  value: string;
}
export interface RuleSet {
  match: "all" | "any";
  conditions: RuleCondition[];
}

/** Category matching includes descendants: pass each product's category slug and its ancestors. */
export type CategoryTrail = (p: Pick<ProductDTO, "categoryId">) => string[];

function values(p: ProductDTO, field: RuleField, trail: CategoryTrail): (string | number)[] {
  const active = p.variants.filter((v) => v.isActive);
  switch (field) {
    case "tag":
      return p.tags;
    case "badge":
      return p.badges;
    case "category":
      return trail(p);
    case "sign":
      return p.zodiacSign ? [p.zodiacSign] : [];
    case "element":
      return p.element ? [p.element] : [];
    case "type":
      return [p.type];
    case "price":
      return active.length ? [Math.min(...active.map((v) => v.priceP)) / 100] : [];
    case "stock":
      return [active.reduce((n, v) => n + Math.max(0, v.stock), 0)];
    case "title":
      return [p.name];
  }
}

function test(actual: (string | number)[], op: RuleOp, raw: string): boolean {
  const want = raw.trim().toLowerCase();
  const num = Number(raw);
  switch (op) {
    case "equals":
      return actual.some((a) => String(a).toLowerCase() === want);
    case "not_equals":
      return actual.every((a) => String(a).toLowerCase() !== want);
    case "contains":
      return actual.some((a) => String(a).toLowerCase().includes(want));
    case "greater_than":
      return Number.isFinite(num) && actual.some((a) => typeof a === "number" && a > num);
    case "less_than":
      return Number.isFinite(num) && actual.some((a) => typeof a === "number" && a < num);
  }
}

export function matchesRules(p: ProductDTO, rules: RuleSet, trail: CategoryTrail): boolean {
  if (rules.conditions.length === 0) return false;
  const results = rules.conditions.map((c) => test(values(p, c.field, trail), c.op, c.value));
  return rules.match === "all" ? results.every(Boolean) : results.some(Boolean);
}

/** Builds a trail function from a flat category list (id, slug, parentId). */
export function categoryTrail(categories: { id: string; slug: string; parentId?: string }[]): CategoryTrail {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return ({ categoryId }) => {
    const out: string[] = [];
    let cur = categoryId ? byId.get(categoryId) : undefined;
    for (let depth = 0; cur && depth < 6; depth++) {
      out.push(cur.slug);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  };
}
