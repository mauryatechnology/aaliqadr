import "server-only";
import { Types } from "mongoose";
import { ZODIAC } from "@/config/zodiac";
import { rupeesToPaise } from "@/lib/money";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Order } from "@/server/models/Order";
import { Category, Collection, HsnCode } from "@/server/models/catalog";
import { AuditLog, StockMovement } from "@/server/models/commerce";
import { htmlToText, sanitizeRich } from "@/server/catalog/rich-text";
import type { ProductInput } from "@/schemas/product";
import type { Actor } from "./inventory";

/** Catalogue writes for the admin (docs/11 §3.3). Callers check the role and invalidate caches. */

export class CatalogError extends Error {}

type AdminActor = Actor & { userId: string };

const LONGEVITY: Record<number, [number, number]> = { 1: [3, 4], 2: [4, 6], 3: [6, 8], 4: [8, 10], 5: [10, 12] };

export async function saveProduct(p: ProductInput, actor: AdminActor): Promise<{ id: string; slug: string; oldSlug?: string; created: boolean }> {
  await db();
  const existing = p.id ? await Product.findById(p.id).lean() : null;
  if (p.id && !existing) throw new CatalogError("This product no longer exists.");

  const [hsn, category, slugTaken, skuClash] = await Promise.all([
    HsnCode.findOne({ code: p.hsnCode, isActive: true }).lean(),
    Category.exists({ _id: p.categoryId }),
    Product.exists({ slug: p.slug, ...(existing ? { _id: { $ne: existing._id } } : {}) }),
    Product.findOne({ "variants.sku": { $in: p.variants.map((v) => v.sku) }, ...(existing ? { _id: { $ne: existing._id } } : {}) })
      .select("name variants.sku")
      .lean(),
  ]);
  if (!hsn) throw new CatalogError(`HSN ${p.hsnCode} isn't in the HSN list. Add it under Catalogue › HSN codes first.`);
  if (!category) throw new CatalogError("Choose a category.");
  if (slugTaken) throw new CatalogError(`Another product already uses the URL /${p.slug}.`);
  if (skuClash) {
    const clash = skuClash.variants.map((v) => v.sku).filter((s) => p.variants.some((v) => v.sku === s));
    throw new CatalogError(`SKU ${clash.join(", ")} already belongs to ${skuClash.name}.`);
  }

  // Variants may be removed only while no order references them and nothing is reserved.
  const oldBySku = new Map((existing?.variants ?? []).map((v) => [v.sku, v]));
  const removed = [...oldBySku.values()].filter((v) => !p.variants.some((n) => n.sku === v.sku));
  if (removed.length) {
    const ordered = await Order.distinct("items.sku", { "items.sku": { $in: removed.map((v) => v.sku) } });
    if (ordered.length) throw new CatalogError(`${ordered.join(", ")} appear in orders, so they can't be deleted. Switch them off (Active) instead.`);
    const held = removed.filter((v) => (v.reserved ?? 0) > 0);
    if (held.length) throw new CatalogError(`${held.map((v) => v.sku).join(", ")} have stock held by unpaid orders. Try again after they settle.`);
  }

  const descriptionHtml = sanitizeRich(p.descriptionHtml);
  const description = htmlToText(descriptionHtml);
  if (description.length < 20) throw new CatalogError("Write a description of at least a couple of sentences.");

  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const families = [...new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.family.toLowerCase()))];
  const intensity = p.intensity ?? (existing?.profile?.intensity as number | undefined);

  const doc = {
    name: p.name,
    slug: p.slug,
    type: p.type,
    status: p.status,
    categoryId: new Types.ObjectId(p.categoryId),
    tags: [...new Set(p.tags)],
    badges: [...new Set(p.badges)],
    zodiacSign: p.zodiacSign,
    element: sign?.element ?? existing?.element,
    concentration: p.concentration,
    tagline: p.tagline,
    description,
    descriptionHtml,
    howToWear: p.howToWear || undefined,
    notes: p.notes,
    noteFamilies: families,
    profile: intensity
      ? { intensity, sillage: intensity, longevityHours: LONGEVITY[intensity], season: intensity >= 4 ? ["Autumn", "Winter"] : ["Spring", "Summer"], timeOfDay: intensity >= 4 ? ["night"] : ["day", "night"] }
      : undefined,
    compatibleSigns: sign?.compatible ?? existing?.compatibleSigns ?? [],
    options: p.options,
    specs: p.specs,
    aPlus: p.aPlus,
    display: p.display,
    legal: { manufacturer: p.manufacturer, packer: p.packer || undefined, countryOfOrigin: p.countryOfOrigin, genericName: p.genericName },
    hsnCode: hsn.code,
    gstRateBps: hsn.gstRateBps,
    seo: { title: p.seoTitle || undefined, description: p.seoDescription || undefined, keywords: p.seoKeywords },
    sortOrder: p.sortOrder,
    media: p.media,
    variants: p.variants.map((v) => {
      const prev = oldBySku.get(v.sku);
      return {
        sku: v.sku,
        label: v.label,
        optionValues: v.optionValues,
        mediaIds: v.mediaIds,
        volumeMl: v.volumeMl,
        mrpP: rupeesToPaise(v.mrp),
        priceP: rupeesToPaise(v.price),
        weightG: v.weightG,
        dimensionsCm: v.dimensionsCm,
        barcode: v.barcode || undefined,
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

  let id = existing ? String(existing._id) : "";
  if (existing) await Product.updateOne({ _id: existing._id }, { $set: doc });
  else id = String((await Product.create(doc))._id);

  // Manual collection membership lives on the collection (it keeps the curated order).
  const pid = new Types.ObjectId(id);
  const chosen = p.collectionIds.map((c) => new Types.ObjectId(c));
  await Promise.all([
    Collection.updateMany({ _id: { $in: chosen }, kind: "manual" }, { $addToSet: { productIds: pid } }),
    Collection.updateMany({ _id: { $nin: chosen }, kind: "manual", productIds: pid }, { $pull: { productIds: pid } }),
  ]);

  const ledger = [
    ...p.variants.filter((v) => !oldBySku.has(v.sku) && v.initialStock > 0).map((v) => ({ sku: v.sku, productId: id, type: "receive" as const, qty: v.initialStock, reason: "Initial stock", actor })),
    ...removed.filter((v) => v.stock > 0).map((v) => ({ sku: v.sku, productId: id, type: "adjust" as const, qty: -v.stock, reason: "Variant deleted", actor })),
  ];
  if (ledger.length) await StockMovement.insertMany(ledger);
  await AuditLog.create({ actor, action: existing ? "product.update" : "product.create", entity: { kind: "product", id }, detail: { slug: p.slug, status: p.status, removed: removed.map((v) => v.sku) } });

  return { id, slug: p.slug, oldSlug: existing && existing.slug !== p.slug ? existing.slug : undefined, created: !existing };
}

/** Hard delete only for products that never sold; anything ordered is archived instead. */
export async function deleteProduct(id: string, actor: AdminActor): Promise<{ slug: string; archived: boolean }> {
  await db();
  const p = await Product.findById(id).lean();
  if (!p) throw new CatalogError("This product no longer exists.");
  if (p.variants.some((v) => (v.reserved ?? 0) > 0)) throw new CatalogError("Stock is held by an unpaid order. Try again after it settles.");
  const ordered = await Order.exists({ "items.sku": { $in: p.variants.map((v) => v.sku) } });
  if (ordered) {
    await Product.updateOne({ _id: p._id }, { $set: { status: "archived" } });
    await AuditLog.create({ actor, action: "product.archive", entity: { kind: "product", id }, detail: { slug: p.slug, reason: "has orders" } });
    return { slug: p.slug, archived: true };
  }
  await Product.deleteOne({ _id: p._id });
  await Collection.updateMany({ productIds: p._id }, { $pull: { productIds: p._id } });
  const withStock = p.variants.filter((v) => v.stock > 0);
  if (withStock.length) await StockMovement.insertMany(withStock.map((v) => ({ sku: v.sku, productId: id, type: "adjust" as const, qty: -v.stock, reason: "Product deleted", actor })));
  await AuditLog.create({ actor, action: "product.delete", entity: { kind: "product", id }, detail: { slug: p.slug, name: p.name } });
  return { slug: p.slug, archived: false };
}

/** A draft copy with fresh slug and SKUs and no stock. */
export async function duplicateProduct(id: string, actor: AdminActor): Promise<string> {
  await db();
  const p = await Product.findById(id).lean();
  if (!p) throw new CatalogError("This product no longer exists.");
  let n = 2;
  while (await Product.exists({ slug: `${p.slug}-copy${n === 2 ? "" : `-${n}`}` })) n++;
  const suffix = n === 2 ? "" : `-${n}`;
  const skuTaken = async (sku: string) => !!(await Product.exists({ "variants.sku": sku }));
  const variants = [];
  for (const v of p.variants) {
    const parts = v.sku.split("-");
    let sku = "";
    for (let i = 1; i < 100 && (!sku || (await skuTaken(sku))); i++) sku = [parts[0], `${parts[1]}${i === 1 ? "C" : `C${i}`}`.slice(0, 8), ...parts.slice(2)].join("-");
    variants.push({ ...v, sku, stock: 0, reserved: 0 });
  }
  const { _id, createdAt: _c, updatedAt: _u, publishedAt: _p, ...rest } = p as typeof p & { createdAt?: Date; updatedAt?: Date };
  const copy = await Product.create({ ...rest, name: `${p.name} (copy)`, slug: `${p.slug}-copy${suffix}`, status: "draft", variants, salesCount: 0, ratingAvg: 0, ratingCount: 0 });
  await AuditLog.create({ actor, action: "product.duplicate", entity: { kind: "product", id: String(copy._id) }, detail: { from: String(_id) } });
  return String(copy._id);
}
