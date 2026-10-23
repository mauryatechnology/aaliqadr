"use server";

import { updateTag } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import { csvRecords, toCsv } from "@/lib/csv";
import { suggestSku, productCode } from "@/lib/sku";
import { labelFor } from "@/lib/variants";
import { ZODIAC_SLUGS } from "@/config/zodiac";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Category, Collection, HsnCode } from "@/server/models/catalog";
import { AuditLog } from "@/server/models/commerce";
import { tags, type LeanProduct } from "@/server/queries/catalog";
import { BLANK_PRODUCT, editorToInput, productToInput, type EditorValue } from "@/server/admin/product-form";
import { CatalogError, deleteProduct, duplicateProduct, saveProduct } from "@/server/services/catalog-admin";
import { BADGES, PRODUCT_TYPES } from "@/server/catalog/types";
import { productInput } from "@/schemas/product";
import { toFormError, type FormState } from "./shared";

/** Product catalogue actions (docs/11 §3.3). Admin role; every write invalidates the catalogue tags. */

const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const actorOf = (u: { id: string; name: string; role: string }) => ({ userId: u.id, name: u.name, role: u.role });

function invalidate(slugs: (string | undefined)[]) {
  updateTag(tags.products);
  updateTag(tags.collections);
  for (const s of new Set(slugs)) if (s) updateTag(tags.product(s));
}

function firstIssue(e: z.ZodError): string {
  const i = e.issues[0];
  if (!i) return "Please check the form.";
  const where = i.path.filter((p) => typeof p === "string").join(" › ");
  return where ? `${where}: ${i.message}` : i.message;
}

export async function saveProductAction(raw: unknown): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const parsed = productInput.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error), fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    const res = await saveProduct(parsed.data, actorOf(user));
    invalidate([res.slug, res.oldSlug]);
    return { ok: true, message: res.created ? "Product created." : "Saved. The store shows the changes now.", id: res.id };
  } catch (e) {
    return toFormError(e, "save_product");
  }
}

export async function deleteProductAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const res = await deleteProduct(objectId.parse(id), actorOf(user));
    invalidate([res.slug]);
    return { ok: true, message: res.archived ? "This product has orders, so it was archived (hidden) instead of deleted." : "Product deleted." };
  } catch (e) {
    return toFormError(e, "delete_product");
  }
}

export async function duplicateProductAction(id: string): Promise<FormState & { id?: string }> {
  try {
    const user = await requireRole("admin");
    const copy = await duplicateProduct(objectId.parse(id), actorOf(user));
    invalidate([]);
    return { ok: true, message: "Draft copy created.", id: copy };
  } catch (e) {
    return toFormError(e, "duplicate_product");
  }
}

const bulkInput = z.object({ ids: z.array(objectId).min(1).max(200), action: z.enum(["active", "draft", "archived", "delete"]) });

export async function bulkProductsAction(raw: unknown): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    const { ids, action } = bulkInput.parse(raw);
    await db();
    if (action === "delete") {
      let deleted = 0;
      let archived = 0;
      const slugs: string[] = [];
      for (const id of ids) {
        const r = await deleteProduct(id, actorOf(user));
        slugs.push(r.slug);
        if (r.archived) archived++;
        else deleted++;
      }
      invalidate(slugs);
      return { ok: true, message: `${deleted} deleted${archived ? `, ${archived} archived (they have orders)` : ""}.` };
    }
    const docs = await Product.find({ _id: { $in: ids } }).select("slug publishedAt").lean();
    await Product.updateMany({ _id: { $in: ids } }, { $set: { status: action } });
    if (action === "active") await Product.updateMany({ _id: { $in: ids }, publishedAt: { $exists: false } }, { $set: { publishedAt: new Date() } });
    await AuditLog.create({ actor: actorOf(user), action: `product.bulk_${action}`, entity: { kind: "product", id: ids.join(",").slice(0, 500) }, detail: { count: ids.length } });
    invalidate(docs.map((d) => d.slug));
    return { ok: true, message: `${ids.length} product${ids.length === 1 ? "" : "s"} set to ${action}.` };
  } catch (e) {
    return toFormError(e, "bulk_products");
  }
}

// ── CSV export / import ─────────────────────────────────────────────────────

const CSV_HEADER = [
  "slug", "name", "status", "type", "category", "sign", "tags", "badges", "hsn",
  "option1_name", "option1_value", "option2_name", "option2_value",
  "sku", "label", "mrp", "price", "stock", "weight_g", "volume_ml", "barcode", "cod", "active",
];

export async function exportProductsCsvAction(): Promise<{ csv?: string; error?: string }> {
  try {
    await requireRole("admin");
    await db();
    const [products, categories] = await Promise.all([Product.find().sort({ sortOrder: 1, name: 1 }).lean<LeanProduct[]>(), Category.find().select("slug").lean()]);
    const catSlug = new Map(categories.map((c) => [String(c._id), c.slug]));
    const rows = products.flatMap((p) =>
      p.variants.map((v) => [
        p.slug, p.name, p.status, p.type, p.categoryId ? catSlug.get(String(p.categoryId)) ?? "" : "", p.zodiacSign ?? "",
        (p.tags ?? []).join("|"), (p.badges ?? []).join("|"), p.hsnCode,
        p.options?.[0]?.name ?? "", v.optionValues?.[0] ?? "", p.options?.[1]?.name ?? "", v.optionValues?.[1] ?? "",
        v.sku, v.label, v.mrpP / 100, v.priceP / 100, v.stock, v.weightG, v.volumeMl ?? 0, v.barcode ?? "", v.codAllowed ? "yes" : "no", v.isActive ? "yes" : "no",
      ]),
    );
    return { csv: toCsv(CSV_HEADER, rows) };
  } catch (e) {
    return { error: toFormError(e, "export_products").error };
  }
}

export interface ImportReport {
  ok?: boolean;
  error?: string;
  applied: boolean;
  created: string[];
  updated: string[];
  problems: { slug: string; message: string }[];
}

const yes = (s: string | undefined, fallback: boolean) => (s ? /^(y|yes|true|1)$/i.test(s) : fallback);
const num = (s: string | undefined) => (s === undefined || s === "" ? undefined : Number(s.replace(/[₹,\s]/g, "")));
const list = (s: string | undefined) => (s ? s.split("|").map((x) => x.trim()).filter(Boolean) : undefined);

/**
 * Imports products from the export format. Rows are grouped by slug: an existing slug is
 * updated (prices, flags, names, organisation; stock of existing SKUs is left to Inventory), a
 * new slug creates a draft. With `apply: false` nothing is written: the report is a preview.
 */
export async function importProductsCsvAction(text: string, apply: boolean): Promise<ImportReport> {
  const report: ImportReport = { applied: false, created: [], updated: [], problems: [] };
  try {
    const user = await requireRole("admin");
    if (text.length > 2_000_000) return { ...report, error: "That file is too large (2 MB maximum)." };
    const records = csvRecords(text);
    if (!records.length) return { ...report, error: "The file has no rows." };
    const missing = ["slug", "sku", "price"].filter((k) => !(k in records[0]!));
    if (missing.length) return { ...report, error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Start from an export.` };
    if (records.length > 2000) return { ...report, error: "Up to 2,000 rows per import." };

    await db();
    const [categories, hsnCodes] = await Promise.all([Category.find().select("slug").lean(), HsnCode.find({ isActive: true }).select("code").lean()]);
    const catId = new Map(categories.map((c) => [c.slug, String(c._id)]));
    const groups = new Map<string, Record<string, string>[]>();
    for (const r of records) {
      const slug = (r.slug ?? "").toLowerCase();
      if (!slug) {
        report.problems.push({ slug: "(blank)", message: "A row has no slug." });
        continue;
      }
      groups.set(slug, [...(groups.get(slug) ?? []), r]);
    }

    const plans: { slug: string; input: EditorValue; created: boolean }[] = [];
    for (const [slug, rows] of groups) {
      const head = rows[0]!;
      const doc = await Product.findOne({ slug }).lean<LeanProduct>();
      const collectionIds = doc ? (await Collection.find({ kind: "manual", productIds: new Types.ObjectId(String(doc._id)) }).select("_id").lean()).map((c) => String(c._id)) : [];
      const v: EditorValue = doc ? productToInput(doc, collectionIds) : { ...structuredClone(BLANK_PRODUCT), slug, options: [], variants: [] };

      if (head.name) v.name = head.name;
      if (head.status && ["draft", "active", "archived"].includes(head.status)) v.status = head.status as EditorValue["status"];
      if (head.type && (PRODUCT_TYPES as readonly string[]).includes(head.type)) v.type = head.type as EditorValue["type"];
      if (head.category) {
        const id = catId.get(head.category.toLowerCase());
        if (!id) {
          report.problems.push({ slug, message: `Unknown category "${head.category}".` });
          continue;
        }
        v.categoryId = id;
      }
      if (head.sign) v.zodiacSign = (ZODIAC_SLUGS as readonly string[]).includes(head.sign.toLowerCase()) ? (head.sign.toLowerCase() as EditorValue["zodiacSign"]) : v.zodiacSign;
      if (list(head.tags)) v.tags = list(head.tags)!.map((t) => t.toLowerCase());
      if (list(head.badges)) v.badges = list(head.badges)!.filter((b): b is EditorValue["badges"][number] => b in BADGES);
      if (head.hsn) v.hsnCode = head.hsn;
      if (!doc) {
        if (!head.name) {
          report.problems.push({ slug, message: "New products need a name." });
          continue;
        }
        v.descriptionHtml = `<p>${head.name}. Full description to be added before publishing.</p>`;
        v.status = "draft";
      }
      if (!hsnCodes.some((h) => h.code === v.hsnCode)) {
        report.problems.push({ slug, message: `HSN ${v.hsnCode} isn't in the HSN list.` });
        continue;
      }

      // Options come from the first row's names; values accumulate across rows.
      const names = [head.option1_name, head.option2_name].filter((n): n is string => !!n);
      if (names.length) v.options = names.map((name, i) => ({ name, values: v.options[i]?.name === name ? [...v.options[i]!.values] : [] }));
      let rowProblem = "";
      for (const r of rows) {
        const values = v.options.map((_, i) => (i === 0 ? r.option1_value : r.option2_value) ?? "");
        values.forEach((val, i) => {
          if (val && !v.options[i]!.values.includes(val)) v.options[i]!.values.push(val);
        });
        const sku = (r.sku || suggestSku(productCode(v.name), values)).toUpperCase();
        const price = num(r.price);
        const mrp = num(r.mrp) ?? price;
        if (price === undefined || Number.isNaN(price) || mrp === undefined || Number.isNaN(mrp)) {
          rowProblem = `${sku}: price/MRP must be numbers.`;
          break;
        }
        const existing = v.variants.find((x) => x.sku === sku);
        const patch = {
          optionValues: values,
          label: r.label || labelFor(values, existing?.label ?? "Standard"),
          mrp,
          price,
          weightG: num(r.weight_g) ?? existing?.weightG ?? 300,
          volumeMl: num(r.volume_ml) ?? existing?.volumeMl ?? 0,
          barcode: r.barcode ?? existing?.barcode ?? "",
          codAllowed: yes(r.cod, existing?.codAllowed ?? true),
          isActive: yes(r.active, existing?.isActive ?? true),
        };
        if (existing) Object.assign(existing, patch);
        else
          v.variants.push({
            sku,
            ...patch,
            dimensionsCm: { l: 0, b: 0, h: 0 },
            lowStockThreshold: 5,
            maxPerOrder: 5,
            mediaIds: [],
            initialStock: Math.max(0, Math.round(num(r.stock) ?? 0)),
            existing: false,
            stock: 0,
            reserved: 0,
          });
      }
      if (rowProblem) {
        report.problems.push({ slug, message: rowProblem });
        continue;
      }
      const parsed = productInput.safeParse(editorToInput(v));
      if (!parsed.success) {
        report.problems.push({ slug, message: firstIssue(parsed.error) });
        continue;
      }
      plans.push({ slug, input: { ...v, ...parsed.data, variants: v.variants }, created: !doc });
    }

    if (apply && report.problems.length === 0) {
      const slugs: string[] = [];
      for (const plan of plans) {
        const parsed = productInput.parse(editorToInput(plan.input));
        try {
          const res = await saveProduct(parsed, actorOf(user));
          slugs.push(res.slug);
          (plan.created ? report.created : report.updated).push(plan.slug);
        } catch (e) {
          report.problems.push({ slug: plan.slug, message: e instanceof CatalogError ? e.message : "Couldn't save." });
        }
      }
      invalidate(slugs);
      report.applied = true;
    } else {
      for (const plan of plans) (plan.created ? report.created : report.updated).push(plan.slug);
    }
    report.ok = report.problems.length === 0;
    return report;
  } catch (e) {
    return { ...report, error: toFormError(e, "import_products").error };
  }
}

/** Quick status switch from the product list. */
export async function setProductStatusAction(id: string, status: "active" | "draft"): Promise<FormState> {
  return bulkProductsAction({ ids: [id], action: status });
}

