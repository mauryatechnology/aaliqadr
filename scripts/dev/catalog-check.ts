/**
 * Exercises the admin catalogue services against the real database with a throwaway product,
 * then removes everything it made.
 *   npx tsx --env-file=.env --conditions=react-server scripts/dev/catalog-check.ts
 */
import mongoose from "mongoose";
import { db } from "@/server/db/connect";
import { Product } from "@/server/models/Product";
import { Category, Collection, HsnCode } from "@/server/models/catalog";
import { AuditLog, StockMovement } from "@/server/models/commerce";
import { productInput } from "@/schemas/product";
import { saveProduct, deleteProduct, duplicateProduct, CatalogError } from "@/server/services/catalog-admin";
import { categoryFromDoc, collectionProducts, fromDoc, type LeanProduct } from "@/server/queries/catalog";

const actor = { userId: "000000000000000000000000", name: "Catalog check", role: "owner" };
const results: boolean[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function main() {
  await db();
  const cat = await Category.create({ slug: "zz-check-cat", name: "ZZ Check", sortOrder: 99 });
  const col = await Collection.create({ slug: "zz-check-col", name: "ZZ Check", kind: "manual", productIds: [] });
  const made: string[] = [];
  try {
    const base = {
      name: "ZZ Check Mist",
      slug: "zz-check-mist",
      type: "body_care",
      status: "draft",
      categoryId: String(cat._id),
      collectionIds: [String(col._id)],
      tags: ["zz-check", "mist"],
      badges: ["new"],
      tagline: "A test",
      descriptionHtml: "<p>A <b>bold</b> test body mist.</p><script>x()</script>",
      howToWear: "",
      notes: { top: [], heart: [], base: [] },
      options: [{ name: "Size", values: ["50 ml", "100 ml"] }, { name: "Box", values: ["Classic", "Gift"] }],
      media: [{ id: "m1", kind: "image", url: "https://example.public.blob.vercel-storage.com/a.jpg", alt: "Front of the bottle", width: 1200, height: 1500 }],
      specs: [{ label: "Bottle", value: "Glass" }],
      aPlus: [{ id: "a1", type: "features", title: "Why", features: ["Light", "Fresh"] }],
      display: { notes: true, profile: true, specs: true },
      manufacturer: "Aaliqadr, Bhopal",
      packer: "",
      countryOfOrigin: "India",
      genericName: "Body mist",
      hsnCode: "33079090",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: [],
      sortOrder: 99,
    };
    const v = (sku: string, values: string[], stock = 0) => ({ sku, optionValues: values, label: values.join(" · "), volumeMl: Number(values[0]!.split(" ")[0]), mrp: 999, price: 899, weightG: 250, dimensionsCm: { l: 0, b: 0, h: 0 }, barcode: "", lowStockThreshold: 5, maxPerOrder: 5, codAllowed: true, isActive: true, mediaIds: values[1] === "Gift" ? ["m1"] : [], initialStock: stock });
    const variants = [v("AQ-ZZC-50-CL", ["50 ml", "Classic"], 7), v("AQ-ZZC-50-GF", ["50 ml", "Gift"]), v("AQ-ZZC-100-CL", ["100 ml", "Classic"], 3), v("AQ-ZZC-100-GF", ["100 ml", "Gift"])];

    const parsed = productInput.parse({ ...base, variants });
    const created = await saveProduct(parsed, actor);
    made.push(created.id);
    const doc = await Product.findById(created.id).lean<LeanProduct>();
    check("Create with 2 options × 2 values = 4 variants", doc?.variants.length === 4);
    check("Description sanitised, plain text derived", !!doc && !doc.descriptionHtml?.includes("script") && doc.description === "A bold test body mist.");
    check("GST rate comes from the HSN master", doc?.gstRateBps === (await HsnCode.findOne({ code: "33079090" }).lean())?.gstRateBps);
    check("Opening stock recorded in the ledger", (await StockMovement.countDocuments({ productId: created.id, type: "receive" })) === 2);
    check("Manual collection membership saved", !!(await Collection.exists({ _id: col._id, productIds: new mongoose.Types.ObjectId(String(doc!._id)) })));

    // Update: rename, drop the Gift box option value with no orders → those variants can go.
    const upd = productInput.parse({ ...base, id: created.id, name: "ZZ Check Mist 2", collectionIds: [], options: [{ name: "Size", values: ["50 ml", "100 ml"] }, { name: "Box", values: ["Classic"] }], variants: [variants[0], variants[2]] });
    await saveProduct(upd, actor);
    const after = await Product.findById(created.id).lean<LeanProduct>();
    check("Update removes unordered variants and keeps live stock", after?.variants.length === 2 && after.variants.find((x) => x.sku === "AQ-ZZC-50-CL")?.stock === 7);
    check("Leaving a manual collection pulls the product", !(await Collection.exists({ _id: col._id, productIds: new mongoose.Types.ObjectId(String(after!._id)) })));

    // Guards
    let err = "";
    try {
      await saveProduct(productInput.parse({ ...base, slug: "ember-crown-aries", variants: [v("AQ-ZZD-50-CL", ["50 ml", "Classic"])] }), actor);
    } catch (e) {
      err = e instanceof CatalogError ? e.message : String(e);
    }
    check("A taken URL is refused", err.includes("already uses"), err);
    err = "";
    try {
      await saveProduct(productInput.parse({ ...base, slug: "zz-check-other", variants: [v("AQ-ARI-50", ["50 ml", "Classic"])] }), actor);
    } catch (e) {
      err = e instanceof CatalogError ? e.message : String(e);
    }
    check("A SKU owned by another product is refused", err.includes("already belongs"), err);
    err = "";
    try {
      await saveProduct(productInput.parse({ ...base, slug: "zz-check-other", hsnCode: "99999999", variants: [v("AQ-ZZE-50-CL", ["50 ml", "Classic"])] }), actor);
    } catch (e) {
      err = e instanceof CatalogError ? e.message : String(e);
    }
    check("An HSN outside the master is refused", err.includes("isn't in the HSN list"), err);

    // Duplicate
    const copyId = await duplicateProduct(created.id, actor);
    made.push(copyId);
    const copy = await Product.findById(copyId).lean<LeanProduct>();
    check("Duplicate is a draft with fresh SKUs and no stock", copy?.status === "draft" && copy.variants.every((x) => x.stock === 0 && !x.sku.startsWith("AQ-ZZC-")), copy?.variants.map((x) => x.sku).join(","));

    // Smart rules over the real catalogue
    const all = (await Product.find().lean<LeanProduct[]>()).map(fromDoc);
    const cats = (await Category.find().lean()).map(categoryFromDoc);
    const tagged = collectionProducts({ id: "", slug: "", name: "", description: "", kind: "smart", productIds: [], rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "zz-check" }] }, featured: false, sortOrder: 0, isActive: true, seo: {} }, all, cats);
    check("Smart rule by tag finds the product and its copy", tagged.length === 2, String(tagged.length));
    const inCat = collectionProducts({ id: "", slug: "", name: "", description: "", kind: "smart", productIds: [], rules: { match: "all", conditions: [{ field: "category", op: "equals", value: "zz-check-cat" }] }, featured: false, sortOrder: 0, isActive: true, seo: {} }, all, cats);
    check("Smart rule by category", inCat.length === 2);

    // Delete: never ordered → hard delete, with a ledger write-off for remaining stock.
    const del = await deleteProduct(created.id, actor);
    check("Unordered product is deleted (not archived)", !del.archived && !(await Product.exists({ _id: created.id })));
    check("Deletion writes off stock in the ledger", (await StockMovement.countDocuments({ productId: created.id, reason: "Product deleted" })) === 2);
  } finally {
    await Product.deleteMany({ _id: { $in: made } });
    await StockMovement.deleteMany({ productId: { $in: made } });
    await AuditLog.deleteMany({ "actor.name": "Catalog check" });
    await Category.deleteOne({ _id: cat._id });
    await Collection.deleteOne({ _id: col._id });
  }
  const leftovers = await Product.countDocuments({ slug: /^zz-check/ });
  check("Cleanup left nothing behind", leftovers === 0);
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  if (results.some((r) => !r)) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
