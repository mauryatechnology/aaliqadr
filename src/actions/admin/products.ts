"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { ZODIAC } from "@/config/zodiac";
import { rupeesToPaise } from "@/lib/money";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { AuditLog, StockMovement } from "@/server/models/commerce";
import { tags } from "@/server/queries/catalog";
import { productInput } from "@/schemas/product";
import { toFormError, type FormState } from "./shared";

/** Create or update a product (docs/11 §3.3). Stock for existing sizes changes only in Inventory. */
export async function saveProductAction(raw: unknown): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const parsed = productInput.safeParse(raw);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      const first = parsed.error.issues[0];
      return { error: first ? `${first.path.join(" › ") || "Form"}: ${first.message}` : "Please check the form.", fieldErrors: flat.fieldErrors as Record<string, string[]> };
    }
    const p = parsed.data;
    await db();

    const existing = p.id ? await Product.findById(p.id).lean() : null;
    if (p.id && !existing) return { error: "This product no longer exists." };
    const oldSkus = new Map((existing?.variants ?? []).map((v) => [v.sku, v]));
    const removed = [...oldSkus.keys()].filter((sku) => !p.variants.some((v) => v.sku === sku));
    if (removed.length) return { error: `Sizes can't be deleted once created (orders reference them). Deactivate ${removed.join(", ")} instead.` };

    const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
    const families = [...new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.family.toLowerCase()))];
    const intensity = p.intensity ?? (existing?.profile?.intensity as 1 | 2 | 3 | 4 | 5 | undefined);
    const longevity: Record<number, [number, number]> = { 1: [3, 4], 2: [4, 6], 3: [6, 8], 4: [8, 10], 5: [10, 12] };

    const doc = {
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status,
      zodiacSign: p.zodiacSign,
      element: sign?.element,
      concentration: p.concentration,
      tagline: p.tagline,
      description: p.description,
      howToWear: p.howToWear || undefined,
      notes: p.notes,
      noteFamilies: families,
      profile: intensity
        ? { intensity, sillage: intensity, longevityHours: longevity[intensity], season: intensity >= 4 ? ["Autumn", "Winter"] : ["Spring", "Summer"], timeOfDay: intensity >= 4 ? ["night"] : ["day", "night"] }
        : undefined,
      compatibleSigns: sign?.compatible ?? existing?.compatibleSigns ?? [],
      legal: { manufacturer: p.manufacturer, countryOfOrigin: p.countryOfOrigin, genericName: p.genericName },
      hsnCode: p.hsnCode,
      gstRateBps: Math.round(p.gstRatePercent * 100),
      seo: { title: p.seoTitle || undefined, description: p.seoDescription || undefined },
      sortOrder: p.sortOrder,
      media: p.media.map((m) => ({ ...m, kind: "image" as const })),
      variants: p.variants.map((v) => {
        const prev = oldSkus.get(v.sku);
        return {
          sku: v.sku,
          label: v.label,
          volumeMl: v.volumeMl,
          mrpP: rupeesToPaise(v.mrp),
          priceP: rupeesToPaise(v.price),
          weightG: v.weightG,
          lowStockThreshold: v.lowStockThreshold,
          maxPerOrder: v.maxPerOrder,
          codAllowed: v.codAllowed,
          isActive: v.isActive,
          stock: prev ? prev.stock : v.initialStock,
          reserved: prev ? prev.reserved : 0,
        };
      }),
      ...(p.status === "active" && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
    };

    let id = p.id;
    if (existing) await Product.updateOne({ _id: existing._id }, { $set: doc });
    else id = String((await Product.create(doc))._id);

    const actor = { name: user.name, role: user.role, userId: user.id };
    const newStock = p.variants.filter((v) => !oldSkus.has(v.sku) && v.initialStock > 0);
    if (newStock.length && id) await StockMovement.insertMany(newStock.map((v) => ({ sku: v.sku, productId: id, type: "receive", qty: v.initialStock, reason: "Initial stock", actor })));
    await AuditLog.create({ actor: { ...actor }, action: existing ? "product.update" : "product.create", entity: { kind: "product", id: id ?? "" }, detail: { slug: p.slug, status: p.status } });

    updateTag(tags.products);
    updateTag(tags.product(p.slug));
    if (existing && existing.slug !== p.slug) updateTag(tags.product(existing.slug));
    return { ok: true, message: existing ? "Saved. The store shows the changes now." : "Product created.", id };
  } catch (e) {
    return toFormError(e, "save_product");
  }
}
