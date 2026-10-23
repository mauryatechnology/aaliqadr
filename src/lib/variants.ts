/**
 * Variant options (docs/04 §4.2). A product has up to two option axes (e.g. Size × Edition);
 * each variant carries one value per axis, in axis order. Pure: shared by the admin editor,
 * the server action and the storefront picker.
 */

export interface ProductOption {
  name: string;
  values: string[];
}

export const MAX_OPTIONS = 2;

/** Every combination of the option values, in axis order. No options → one empty combination. */
export function combinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v])), [[]]);
}

export const variantKey = (values: string[]) => values.map((v) => v.trim().toLowerCase()).join("|");

export const labelFor = (values: string[], fallback = "Standard") => values.filter(Boolean).join(" · ") || fallback;

/** For the storefront picker: is there an active variant with this value, given the other picks? */
export function isAvailable<V extends { optionValues: string[]; isActive: boolean }>(variants: V[], axis: number, value: string, picked: string[]): boolean {
  return variants.some((v) => v.isActive && v.optionValues[axis] === value && v.optionValues.every((x, i) => i === axis || !picked[i] || x === picked[i]));
}

/** Best match for the picked values: exact, else the first active variant that agrees on `axis`. */
export function resolveVariant<V extends { optionValues: string[]; isActive: boolean }>(variants: V[], picked: string[], axis = 0): V | undefined {
  const active = variants.filter((v) => v.isActive);
  return (
    active.find((v) => v.optionValues.every((x, i) => x === picked[i])) ??
    active.find((v) => v.optionValues[axis] === picked[axis]) ??
    active[0]
  );
}
