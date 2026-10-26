import "server-only";
import { Types } from "mongoose";
import { ZODIAC } from "@/config/zodiac";
import { rupeesToPaise } from "@/lib/money";
import { db } from "@/server/db/connect";
import { Product, type ProductDoc } from "@/server/models/Product";
import { Order } from "@/server/models/Order";
import { Category, Collection, HsnCode, ProductDraft, ProductRevision } from "@/server/models/catalog";
import { AuditLog, StockMovement } from "@/server/models/commerce";
import { htmlToText, sanitizeRich } from "@/server/catalog/rich-text";
import { blockers, publishChecklist } from "@/lib/publish-checklist";
import type { ProductInput } from "@/schemas/product";
import type { Actor } from "./inventory";
import { notifyPriceDrop } from "./alerts";
import { productToInput } from "@/server/admin/product-form";
import type { LeanProduct } from "@/server/queries/catalog";

/** Catalogue writes for the admin (docs/11 §3.3). Callers check the role and invalidate caches. */

export class CatalogError extends Error {}

type AdminActor = Actor & { userId: string };

const LONGEVITY: Record<number, [number, number]> = { 1: [3, 4], 2: [4, 6], 3: [6, 8], 4: [8, 10], 5: [10, 12] };

/** Cost prices are the owner's alone: anyone else's input can't set or clear them. */
const withoutCost = (p: ProductInput): ProductInput => ({ ...p, variants: p.variants.map(({ cost: _c, ...v }) => v) });

export async function saveProduct(input: ProductInput, actor: AdminActor): Promise<{ id: string; slug: string; oldSlug?: string; created: boolean }> {
  await db();
  const p = actor.role === "owner" ? input : withoutCost(input);
  // Costs are read too, so saving keeps them (the variants array is replaced).
  const existing = p.id ? await Product.findById(p.id).select("+variants.costP").lean() : null;
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
  // Going live needs the publish checklist (plan.md §8.5); drafts can be saved incomplete.
  if (p.status === "active") {
    const missing = blockers(publishChecklist({ ...p, descriptionText: description, aPlusCount: p.aPlus.length }));
    if (missing.length) throw new CatalogError(`Not ready to go live: ${missing.slice(0, 3).map((m) => m.message).join(" ")}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ""} Save it as a draft for now.`);
  }

  const doc = buildProductDoc(p, existing, hsn, { description, descriptionHtml }, oldBySku);

  let id = existing ? String(existing._id) : "";
  const lowest = (vs: { priceP: number; isActive?: boolean | null }[]) => Math.min(...vs.filter((v) => v.isActive !== false).map((v) => v.priceP), Infinity);
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
  // Wishlisters who asked to hear about a lower price (plan.md §11.3).
  if (existing && p.status === "active" && lowest(doc.variants) < lowest(existing.variants)) notifyPriceDrop(id, lowest(doc.variants));
  // Version history; a published save supersedes any pending draft.
  await ProductRevision.create({ productId: pid, value: { ...withoutCost(p), id }, status: p.status, savedBy: actor });
  await ProductDraft.deleteOne({ _id: pid });

  return { id, slug: p.slug, oldSlug: existing && existing.slug !== p.slug ? existing.slug : undefined, created: !existing };
}

type ExistingProduct = (ProductDoc & { _id: Types.ObjectId }) | null;

/**
 * The stored shape of a product from editor input: shared by save and the shopper preview
 * (plan.md §8.5), so a preview shows exactly what saving would publish.
 */
export function buildProductDoc(
  p: ProductInput,
  existing: ExistingProduct | null,
  hsn: { code: string; gstRateBps: number },
  text: { description: string; descriptionHtml: string },
  oldBySku: Map<string, { stock: number; reserved?: number | null; costP?: number | null }>,
) {
  const { description, descriptionHtml } = text;
  const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
  const families = [...new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.family.toLowerCase()))];
  const intensity = p.intensity ?? (existing?.profile?.intensity as number | undefined);

  return {
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
    imageAxis: p.imageAxis ?? null,
    specs: p.specs,
    aPlus: p.aPlus,
    display: p.display,
    legal: { manufacturer: p.manufacturer, packer: p.packer || undefined, countryOfOrigin: p.countryOfOrigin, genericName: p.genericName },
    hsnCode: hsn.code,
    gstRateBps: hsn.gstRateBps,
    seo: { title: p.seoTitle || undefined, description: p.seoDescription || undefined, keywords: p.seoKeywords },
    sortOrder: p.sortOrder,
    // Only a hidden product can be scheduled to launch; only a live one to come down.
    schedule: {
      publishAt: p.publishAt && p.status === "draft" ? new Date(p.publishAt) : undefined,
      unpublishAt: p.unpublishAt && p.status !== "archived" ? new Date(p.unpublishAt) : undefined,
    },
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
        costP: v.cost !== undefined ? rupeesToPaise(v.cost) : (prev?.costP ?? undefined),
        stock: prev ? prev.stock : v.initialStock,
        reserved: prev ? prev.reserved : 0,
      };
    }),
    ...(p.status === "active" && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
  };
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

// ── Drafts, history and preview (plan.md §8.5) ───────────────────────────────

export async function saveProductDraft(id: string, input: ProductInput, actor: AdminActor) {
  await db();
  const value = withoutCost(input);
  if (!(await Product.exists({ _id: id }))) throw new CatalogError("Save the product once before keeping a draft of it.");
  if (JSON.stringify(value).length > 400_000) throw new CatalogError("This draft is too large to keep.");
  await ProductDraft.updateOne({ _id: new Types.ObjectId(id) }, { $set: { value, savedBy: actor } }, { upsert: true });
}

export async function discardProductDraft(id: string) {
  await db();
  await ProductDraft.deleteOne({ _id: new Types.ObjectId(id) });
}

export async function listProductRevisions(id: string) {
  await db();
  const rows = await ProductRevision.find({ productId: new Types.ObjectId(id) }).sort({ createdAt: -1 }).limit(30).select("status savedBy createdAt").lean();
  return rows.map((r) => ({ id: String(r._id), status: r.status, by: r.savedBy?.name ?? "", at: r.createdAt.toISOString() }));
}

export async function getProductRevision(productId: string, revisionId: string) {
  await db();
  const r = await ProductRevision.findOne({ _id: revisionId, productId: new Types.ObjectId(productId) }).lean();
  return r?.value ?? null;
}

/** What the store would show for this input, without saving anything. */
export async function previewProductDoc(p: ProductInput) {
  await db();
  const existing = p.id ? await Product.findById(p.id).lean() : null;
  const hsn = (await HsnCode.findOne({ code: p.hsnCode }).lean()) ?? { code: p.hsnCode, gstRateBps: existing?.gstRateBps ?? 1800 };
  const descriptionHtml = sanitizeRich(p.descriptionHtml);
  const oldBySku = new Map((existing?.variants ?? []).map((v) => [v.sku, v]));
  const doc = buildProductDoc(p, existing, hsn, { description: htmlToText(descriptionHtml), descriptionHtml }, oldBySku);
  return {
    ...doc,
    _id: existing?._id ?? new Types.ObjectId(),
    ratingAvg: existing?.ratingAvg ?? 0,
    ratingCount: existing?.ratingCount ?? 0,
    salesCount: existing?.salesCount ?? 0,
    createdAt: (existing as { createdAt?: Date } | null)?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
}

// ── Scheduling (plan.md §8.5) ────────────────────────────────────────────────

/**
 * Launches and takes down products whose time has come. A launch still needs the publish
 * checklist: if something is missing, the product stays hidden and the audit log says why.
 */
const SCHEDULER: AdminActor = { userId: "system", name: "Scheduler", role: "system" };

export async function runCatalogSchedule(now = new Date()): Promise<{ published: string[]; unpublished: string[]; blocked: string[] }> {
  await db();
  // The driver, not the model: with strictQuery a model that doesn't know `schedule` (an old
  // schema still loaded in dev) would silently drop these filters and match every product.
  const col = Product.collection;
  const due = (at: string) => ({ [at]: { $exists: true, $type: "date", $lte: now } });
  const out = { published: [] as string[], unpublished: [] as string[], blocked: [] as string[] };
  for (const d of (await col.find({ status: "draft", ...due("schedule.publishAt") }).toArray()) as unknown as LeanProduct[]) {
    const input = productToInput(d, []);
    const missing = blockers(publishChecklist({ ...input, descriptionText: d.description, aPlusCount: input.aPlus.length }));
    if (missing.length) {
      await col.updateOne({ _id: d._id as Types.ObjectId }, { $unset: { "schedule.publishAt": "" } });
      await AuditLog.create({ actor: SCHEDULER, action: "product.schedule_blocked", entity: { kind: "product", id: String(d._id) }, detail: { slug: d.slug, missing: missing.map((m) => m.message) } });
      out.blocked.push(d.slug);
      continue;
    }
    await col.updateOne({ _id: d._id as Types.ObjectId, status: "draft" }, { $set: { status: "active", updatedAt: now, ...(d.publishedAt ? {} : { publishedAt: now }) }, $unset: { "schedule.publishAt": "" } });
    await AuditLog.create({ actor: SCHEDULER, action: "product.scheduled_publish", entity: { kind: "product", id: String(d._id) }, detail: { slug: d.slug } });
    out.published.push(d.slug);
  }
  for (const d of await col.find({ status: "active", ...due("schedule.unpublishAt") }, { projection: { slug: 1 } }).toArray()) {
    await col.updateOne({ _id: d._id, status: "active" }, { $set: { status: "draft", updatedAt: now }, $unset: { "schedule.unpublishAt": "" } });
    await AuditLog.create({ actor: SCHEDULER, action: "product.scheduled_unpublish", entity: { kind: "product", id: String(d._id) }, detail: { slug: d.slug } });
    out.unpublished.push(String(d.slug));
  }
  return out;
}
