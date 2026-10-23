// Browser test for claims, reviews and the new catalogue pages, safe on a database with real
// orders: it inserts one throwaway delivered order (AQ-999901, outside the order counter, no
// invoice) and a temporary owner, drives the UI, checks the database, then removes all of it.
//   E2E_BASE=http://localhost:3200 node --env-file=.env scripts/dev/engagement-e2e.mjs
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const ORDER = "AQ-999901";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(process.env.MONGODB_URI);
const dbx = mongoose.connection.db;
const products = dbx.collection("products");
if (await dbx.collection("orders").findOne({ _id: ORDER })) throw new Error(`${ORDER} already exists`);
const returnCounter = await dbx.collection("counters").findOne({ _id: "return" });
const product = await products.findOne({ slug: "ember-crown-aries" });
const ratingBefore = { ratingAvg: product.ratingAvg ?? 0, ratingCount: product.ratingCount ?? 0 };
const accessKey = randomUUID().replace(/-/g, "");
const now = new Date();
const actor = { name: "E2E", role: "system" };
await dbx.collection("orders").insertOne({
  _id: ORDER,
  accessKey,
  contact: { name: "E2E Claimant", email: "e2e-claimant@example.com", phone: "+919876543210" },
  shippingAddress: { fullName: "E2E Claimant", phone: "+919876543210", line1: "1 Test Lane", city: "Bhopal", stateCode: "23", state: "Madhya Pradesh", pincode: "462016" },
  items: [{ productId: String(product._id), slug: product.slug, sku: "AQ-ARI-50", name: product.name, variantLabel: "50 ml", zodiacSign: "aries", qty: 1, mrpP: 399900, unitPriceP: 349900, discountP: 0, lineTotalP: 349900, hsnCode: "33030050", gstRateBps: 1800 }],
  pricing: { subtotalP: 349900, discountP: 0, shippingP: 0, codFeeP: 4900, giftWrapP: 0, taxableP: 300678, cgstP: 27061, sgstP: 27061, igstP: 0, totalP: 354800 },
  placeOfSupply: { stateCode: "23", isInterState: false },
  gift: { wrap: false, hidePrice: false },
  status: "delivered",
  payment: { method: "cod", status: "paid", refundedP: 0, paidAt: now },
  shipment: { courier: "Delhivery", awb: "E2E999", shippedAt: new Date(now - 86_400_000), deliveredAt: new Date(now - 3_600_000) },
  history: [{ at: now, status: "delivered", actor, visibleToCustomer: true }],
  createdAt: new Date(now - 2 * 86_400_000),
  updatedAt: now,
});
const owner = { _id: new mongoose.Types.ObjectId(), name: "E2E Owner", email: "e2e-owner@example.com", emailVerified: true, role: "owner", createdAt: now, updatedAt: now };
await dbx.collection("user").insertOne(owner);
const token = randomUUID().replace(/-/g, "");
await dbx.collection("session").insertOne({ _id: new mongoose.Types.ObjectId(), token, userId: owner._id, expiresAt: new Date(now.getTime() + 3600_000), createdAt: now, updatedAt: now, ipAddress: "", userAgent: "e2e" });
const signed = encodeURIComponent(`${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(token).digest("base64")}`);

const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "e2e-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) pending.get(d.id)(d); };
const send = (method, params = {}) => new Promise((r) => { const n = ++mid; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(2500); };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(300); } return false; };
const fill = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false;
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const clickText = (tag, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.textContent.includes(${JSON.stringify(text)}) && !e.disabled); if (!el) return false; el.click(); return true; })()`);
const clickLast = (tag, text) => evaluate(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(tag)})].filter(e => e.textContent.trim() === ${JSON.stringify(text)} && !e.disabled); const el = els.at(-1); if (!el) return false; el.click(); return true; })()`);
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

let claimId;
try {
  // ── Claim as a guest with the order link ──────────────────────────────────
  await go(`/order/${ORDER}?k=${accessKey}`);
  check("Delivered order offers 'Report a problem'", await waitFor(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("Report a problem"))`, 15000));
  await clickText("button", "Report a problem");
  await waitFor(`!!document.querySelector("form textarea")`, 5000);
  await fill("form select", "missing_item");
  await fill("form textarea", "E2E: the outer box was empty when it arrived.");
  await clickText("button", "Send request");
  await waitFor(`document.body.innerText.includes("RT-")`, 15000);
  const claim = await dbx.collection("returnrequests").findOne({ orderId: ORDER });
  claimId = claim?._id;
  check("Claim created with an RT- id, shown on the order page", !!claim && /^RT-\d{6}$/.test(claim._id) && (await evaluate(`document.body.innerText.includes(${JSON.stringify(claim?._id ?? "")})`)), claim?._id);
  check("A second open claim is not offered", !(await evaluate(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("Report a problem"))`)));

  // ── Admin: approve, then refund (COD → manual reference) ─────────────────
  await send("Network.setCookie", { name: "aq.session_token", value: signed, url: BASE, httpOnly: true });
  await go("/admin/returns");
  check("Claim listed under Open", await waitFor(`document.body.innerText.includes(${JSON.stringify(claimId ?? "")})`, 10000));
  await go(`/admin/returns/${claimId}`);
  await waitFor(`document.body.innerText.includes("Next step")`, 10000);
  await fill("select", "refund");
  await clickLast("button", "Approve");
  check("Admin approves the claim", await waitFor(`document.body.innerText.includes("Marked approved")`, 10000));
  await go(`/admin/returns/${claimId}`);
  await waitFor(`[...document.querySelectorAll('[role="radio"]')].some(b => b.textContent === "Refund")`, 10000);
  await evaluate(`[...document.querySelectorAll('[role="radio"]')].find(b => b.textContent === "Refund").click()`);
  await waitFor(`!!document.querySelector('input[type="number"]')`, 5000);
  await fill('input[type="number"]', "100");
  await fill('input:not([type])', "UPI-E2E-1");
  await clickLast("button", "Refund");
  check("Admin records the refund", await waitFor(`document.body.innerText.includes("Marked refunded")`, 10000));
  const after = await dbx.collection("returnrequests").findOne({ _id: claimId });
  const o2 = await dbx.collection("orders").findOne({ _id: ORDER });
  const pay = await dbx.collection("payments").findOne({ orderId: ORDER, kind: "refund" });
  check("Claim refunded; order and payment ledger updated", after?.status === "refunded" && after.refundP === 10000 && o2.payment.refundedP === 10000 && o2.payment.status === "partially_refunded" && pay?.method === "manual", `${after?.status} · ${o2.payment.status}`);
  await go(`/order/${ORDER}?k=${accessKey}`);
  check("Customer sees the refund on the order page", await waitFor(`document.body.innerText.includes("Refunded")`, 10000));

  // ── Review: write → moderate → rating ─────────────────────────────────────
  await go("/perfume/ember-crown-aries");
  check("Product page shows the review form for a signed-in visitor", await waitFor(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("Write a review"))`, 15000));
  await clickText("button", "Write a review");
  await waitFor(`!!document.querySelector('[aria-label="5 stars"]')`, 5000);
  await evaluate(`document.querySelector('[aria-label="5 stars"]').click()`);
  await fill("form textarea", "E2E review: warm saffron opening and it lasts all evening.");
  await clickText("button", "Submit review");
  check("Review submitted for moderation", await waitFor(`document.body.innerText.includes("once our team has read it")`, 10000));
  const review = await dbx.collection("reviews").findOne({ userId: String(owner._id) });
  check("Review stored as pending, not yet counted", review?.status === "pending" && review.rating === 5 && (await products.findOne({ _id: product._id })).ratingCount === ratingBefore.ratingCount);
  await go("/admin/reviews");
  await waitFor(`document.body.innerText.includes("E2E review")`, 10000);
  await clickText("button", "Publish");
  await waitFor(`document.body.innerText.includes("Published.")`, 10000);
  const rated = await products.findOne({ _id: product._id });
  check("Publishing updates the product rating", rated.ratingCount === ratingBefore.ratingCount + 1, `${rated.ratingAvg}/${rated.ratingCount}`);
  let shown = false;
  let tries = 0;
  for (; tries < 4 && !shown; tries++) {
    await go("/perfume/ember-crown-aries");
    shown = await waitFor(`document.body.innerText.includes("warm saffron opening")`, 4000);
  }
  check("Published review shows on the product page", shown, `page load ${tries}`);

  // ── Product editor: create a body mist with two sizes, then delete it ────
  await go("/admin/products/new");
  await waitFor(`!!document.querySelector('[role="textbox"]')`, 15000);
  await evaluate(`(() => { const sel = [...document.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "body_care")); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(sel, "body_care"); sel.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await evaluate(`(() => { const inp = document.querySelector("#basics input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(inp, "ZZ Editor Mist"); inp.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await evaluate(`(() => { const box = document.querySelector('[role="textbox"]'); box.innerHTML = "<p>A light, bright body mist made for warm Bhopal evenings.</p>"; box.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  // Add a second size: type into the option chip input and press Enter.
  await evaluate(`(() => { const inp = document.querySelector("#variants input[placeholder*='Enter']") || [...document.querySelectorAll("#variants input")].find(i => !i.value && i.placeholder === ""); if (!inp) return false; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(inp, "100 ml"); inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); return true; })()`);
  await sleep(500);
  const rows = await evaluate(`document.querySelectorAll('#variants input[aria-label="SKU"]').length`);
  check("Adding an option value adds a variant row", rows === 2, String(rows));
  await evaluate(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; for (const [l, v] of [["MRP", "1200"], ["Price", "999"]]) for (const el of document.querySelectorAll('input[aria-label="' + l + '"]')) { set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); } })()`);
  await clickText("button", "Create product");
  const created = await waitFor(`new RegExp("^/admin/products/[a-f0-9]{24}$").test(location.pathname)`, 20000);
  const made = await products.findOne({ slug: "zz-editor-mist" });
  check("Editor creates the product with both variants", created && made?.variants.length === 2 && made.status === "draft" && !!made.descriptionHtml?.includes("<p>"), `url ${created} · variants ${made?.variants.length} · ${made?.status} · ${made?.descriptionHtml?.slice(0, 40)} · ${await evaluate("location.pathname")}`);
  if (made) {
    await waitFor(`[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Delete")`, 10000);
    await clickText("button", "Delete");
    await sleep(300);
    await clickLast("button", "Yes");
    await waitFor(`location.pathname === "/admin/products"`, 15000);
    check("Editor deletes an unordered product", !(await products.findOne({ slug: "zz-editor-mist" })));
    await dbx.collection("stockmovements").deleteMany({ productId: String(made._id) });
  }

  // ── Variant deep link, gallery state and catalogue pages ──────────────────
  await go("/perfume/ember-crown-aries?v=AQ-ARI-100");
  check("?v= selects that variant", await waitFor(`document.querySelector('[role="radio"][aria-checked="true"]')?.textContent.includes("100 ml")`, 8000));
  await clickText('[role="radio"]', "10 ml");
  check("Picking a size updates the URL", await waitFor(`location.search.includes("AQ-ARI-10")`, 5000));
  for (const path of ["/collections", "/collections/fire-signs", "/category/zodiac-extraits", "/faq", "/admin/categories", "/admin/collections", "/admin/hsn", "/admin/reports", "/admin/content", "/admin/staff", "/admin/shipping", "/admin/invoices"]) {
    await go(path);
    check(`Page ${path}`, await waitFor(`!!document.querySelector("h1") && !document.body.innerText.includes("Application error")`, 8000), await evaluate(`document.querySelector("h1")?.textContent`));
  }
} finally {
  ws.close();
  chrome.kill();
  await dbx.collection("returnrequests").deleteMany({ orderId: ORDER });
  await dbx.collection("payments").deleteMany({ orderId: ORDER });
  await dbx.collection("orders").deleteOne({ _id: ORDER });
  await products.deleteMany({ slug: "zz-editor-mist" });
  await dbx.collection("reviews").deleteMany({ userId: String(owner._id) });
  await dbx.collection("auditlogs").deleteMany({ $or: [{ "actor.userId": String(owner._id) }, { "entity.id": claimId ?? "-" }] });
  await dbx.collection("session").deleteMany({ userId: owner._id });
  await dbx.collection("user").deleteOne({ _id: owner._id });
  await products.updateOne({ _id: product._id }, { $set: ratingBefore });
  if (returnCounter) await dbx.collection("counters").updateOne({ _id: "return" }, { $set: { seq: returnCounter.seq } });
  else await dbx.collection("counters").deleteOne({ _id: "return" });
  const left = (await dbx.collection("orders").countDocuments({ _id: ORDER })) + (await dbx.collection("returnrequests").countDocuments({ orderId: ORDER })) + (await dbx.collection("user").countDocuments({ _id: owner._id }));
  check("Cleanup removed everything", left === 0);
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  await mongoose.disconnect();
  process.exit(results.every(Boolean) ? 0 : 1);
}
