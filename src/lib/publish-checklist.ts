import { imagesFor } from "@/lib/variant-media";
import type { MediaItem } from "@/server/catalog/types";

/**
 * What a product needs before it can go live (plan.md §8.5). Blockers stop "Active";
 * warnings are shown but don't. Pure: the editor shows the same list the server enforces.
 */

export interface ChecklistInput {
  status: string;
  descriptionText: string;
  seoTitle: string;
  aPlusCount: number;
  hsnCode: string;
  manufacturer: string;
  genericName: string;
  imageAxis?: number;
  display: { sharedAfterVariant: boolean };
  media: Pick<MediaItem, "id" | "kind" | "scope" | "url" | "alt">[];
  variants: { sku: string; label: string; optionValues: string[]; isActive: boolean; price: number; mrp: number; weightG: number }[];
}

export interface ChecklistItem {
  level: "blocker" | "warning";
  message: string;
  /** Editor section to jump to. */
  section: "basics" | "media" | "variants" | "details" | "tax" | "seo";
}

export function publishChecklist(p: ChecklistInput): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  const src = { media: p.media as MediaItem[], variants: p.variants, imageAxis: p.imageAxis, display: p.display };
  const active = p.variants.filter((v) => v.isActive);
  if (!active.length) out.push({ level: "blocker", message: "Switch on at least one variant.", section: "variants" });
  for (const v of active) {
    const imgs = imagesFor(src, v.sku).filter((m) => m.kind === "image");
    if (!imgs.length) out.push({ level: "blocker", message: `${v.label} has no photo.`, section: "media" });
    else if (imgs.some((m) => (m.alt ?? "").trim().length < 3)) out.push({ level: "blocker", message: `A photo of ${v.label} has no alt text.`, section: "media" });
    if (v.price <= 0) out.push({ level: "blocker", message: `${v.label} has no price.`, section: "variants" });
    if (v.price > v.mrp) out.push({ level: "blocker", message: `${v.label}: price is above MRP.`, section: "variants" });
    if (!v.weightG) out.push({ level: "blocker", message: `${v.label} has no shipping weight.`, section: "variants" });
  }
  if (p.descriptionText.trim().length < 80) out.push({ level: "blocker", message: "Write a description of at least 80 characters.", section: "basics" });
  if (!p.hsnCode) out.push({ level: "blocker", message: "Choose an HSN code.", section: "tax" });
  if (p.manufacturer.trim().length < 3 || p.genericName.trim().length < 2) out.push({ level: "blocker", message: "Fill in the manufacturer and generic name (Legal Metrology).", section: "tax" });

  const realPhotos = p.media.filter((m) => m.kind === "image" && !m.url.endsWith(".svg"));
  if (realPhotos.length === 0) out.push({ level: "warning", message: "Only bottle artwork so far: real photos convert better.", section: "media" });
  else if (realPhotos.length < 3) out.push({ level: "warning", message: "Fewer than 3 photos.", section: "media" });
  if (!p.seoTitle.trim()) out.push({ level: "warning", message: "No search-listing title (a default is used).", section: "seo" });
  if (!p.aPlusCount) out.push({ level: "warning", message: "No A+ content blocks.", section: "details" });
  return out;
}

export const blockers = (items: ChecklistItem[]) => items.filter((i) => i.level === "blocker");
