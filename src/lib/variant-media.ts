import type { MediaItem } from "@/server/catalog/types";

/**
 * Which photos a variant shows (plan.md §8.2). Pure: the editor preview, product page, quick
 * view, cards, bag, order snapshot and JSON-LD all resolve images through here.
 *
 * Order: the variant's own photos → (if it has none) its image-axis value's photos → shared
 * photos (after the variant's, when `sharedAfterVariant`; always when nothing else exists).
 * Never another variant's photos.
 */

export interface MediaSource {
  media: MediaItem[];
  variants: { sku: string; optionValues: string[]; mediaIds?: string[] }[];
  imageAxis?: number;
  display?: { sharedAfterVariant?: boolean };
}

export function imagesFor(p: MediaSource, sku?: string): MediaItem[] {
  const v = sku ? p.variants.find((x) => x.sku === sku) : undefined;
  const shared = p.media.filter((m) => m.scope.kind === "shared" && !legacyOwned(p, m.id));
  if (!v) return shared.length ? shared : p.media;

  // Legacy: before scopes, variants pointed at gallery items by id.
  const own = p.media.filter((m) => (m.scope.kind === "variant" && m.scope.sku === v.sku) || (m.scope.kind === "shared" && v.mediaIds?.includes(m.id)));
  const axisValue = p.imageAxis !== undefined ? v.optionValues[p.imageAxis] : undefined;
  const byOption = axisValue === undefined ? [] : p.media.filter((m) => m.scope.kind === "option" && m.scope.axis === p.imageAxis && m.scope.value === axisValue);
  const specific = own.length ? own : byOption;
  if (!specific.length) return shared;
  return p.display?.sharedAfterVariant === false ? specific : [...specific, ...shared.filter((m) => !specific.includes(m))];
}

/** First photo (never a video) a variant shows: cards, bag, orders, emails. */
export function coverFor(p: MediaSource, sku?: string): MediaItem | undefined {
  return imagesFor(p, sku).find((m) => m.kind === "image");
}

/** A shared item some variant claimed through the legacy `mediaIds` list. */
function legacyOwned(p: MediaSource, id: string): boolean {
  return p.variants.some((v) => v.mediaIds?.includes(id));
}
