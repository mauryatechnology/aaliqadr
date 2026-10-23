// End-to-end smoke test against a running production build (E2E_BASE, default :3000) and the
// real database. Creates test orders, exercises checkout (COD + Razorpay order creation), the
// admin (pack → ship → deliver, cancel), webhooks and cron, then removes everything it made and
// restores stock and counters. Refuses to run if real orders exist.
//   node --env-file=.env scripts/dev/e2e.mjs
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const ADMIN = "e2e-admin@example.com";
const CUSTOMER = "e2e-customer@example.com";
const SKU = "AQ-ARI-50";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(process.env.MONGODB_URI);
const dbx = mongoose.connection.db;
const orders = dbx.collection("orders");
const products = dbx.collection("products");

const existing = await orders.countDocuments({ "contact.email": { $ne: CUSTOMER } });
if (existing > 0) {
  console.log(`Refusing to run: ${existing} real order(s) exist. This test resets counters.`);
  process.exit(1);
}
const productBefore = await products.findOne({ "variants.sku": SKU });
const vBefore = productBefore.variants.find((v) => v.sku === SKU);
const snapshot = { stock: vBefore.stock, reserved: vBefore.reserved ?? 0, salesCount: productBefore.salesCount ?? 0 };
const createdOrderIds = [];

// ── Browser (CDP) ────────────────────────────────────────────────────────────
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
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

// Fill a React-controlled input/select by CSS selector.
const fill = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false;
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const clickText = (tag, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.textContent.includes(${JSON.stringify(text)}) && !e.disabled); if (!el) return false; el.click(); return true; })()`);

async function checkout(method) {
  await go("/");
  await evaluate(`localStorage.setItem("aq-cart-v1", JSON.stringify([{ sku: ${JSON.stringify(SKU)}, slug: "ember-crown-aries", qty: 1 }]))`);
  await go("/checkout");
  await waitFor(`!!document.querySelector('input[autocomplete="name"]')`);
  await fill('input[autocomplete="name"]', "E2E Customer");
  await fill('input[autocomplete="tel-national"]', "9876543210");
  await fill('input[autocomplete="email"]', CUSTOMER);
  await fill('input[autocomplete="shipping name"]', "E2E Customer");
  await fill('input[autocomplete="shipping tel-national"]', "9876543210");
  await fill('input[autocomplete="shipping address-line1"]', "12 Test Street, Arera Colony");
  await fill('input[autocomplete="shipping address-level2"]', "Bhopal");
  await fill('input[autocomplete="shipping postal-code"]', "462016");
  await fill('select[autocomplete="shipping address-level1"]', "23");
  if (method === "cod") await clickText('button[role="radio"]', "Cash on delivery");
  await waitFor(`[...document.querySelectorAll("button")].some(b => /Place order|Pay ₹/.test(b.textContent) && !b.disabled)`);
  await sleep(800);
  await clickText("button", method === "cod" ? "Place order" : "Pay ₹");
}

// ── 1. COD order ─────────────────────────────────────────────────────────────
await checkout("cod");
const codUrlOk = await waitFor(`location.pathname.startsWith("/order/AQ-")`, 25000);
const codUrl = await evaluate("location.href");
check("COD checkout redirects to order page", codUrlOk, codUrl);
const codId = codUrl.match(/AQ-\d+/)?.[0];
if (codId) createdOrderIds.push(codId);
const cod = codId ? await orders.findOne({ _id: codId }) : null;
check("COD order confirmed with invoice number", cod?.status === "confirmed" && /^INV\/\d{4}-\d{2}\/00001$/.test(cod?.invoice?.number ?? ""), cod?.invoice?.number);
check("COD total = price + COD fee (no shipping above threshold)", cod?.pricing?.totalP === 349900 + (cod?.pricing?.codFeeP ?? 0) && cod?.pricing?.codFeeP > 0, String(cod?.pricing?.totalP));
check("Intra-state GST split (MP → CGST+SGST)", cod?.pricing?.cgstP > 0 && cod?.pricing?.igstP === 0);
let p = await products.findOne({ "variants.sku": SKU });
let v = p.variants.find((x) => x.sku === SKU);
check("Stock sold: available −1, reserved unchanged", v.stock === snapshot.stock - 1 && v.reserved === snapshot.reserved, `stock ${v.stock}, reserved ${v.reserved}`);
const moves = await dbx.collection("stockmovements").find({ ref: codId }).toArray();
check("Ledger has reserve + sale rows", moves.some((m) => m.type === "reserve") && moves.some((m) => m.type === "sale"));
check("Order page shows confirmation", await waitFor(`document.body.innerText.includes("Confirmed")`, 5000));

// ── 2. Online order (Razorpay test keys) ─────────────────────────────────────
await checkout("razorpay");
await sleep(6000);
const online = await orders.find({ "contact.email": CUSTOMER, "payment.method": "razorpay" }).sort({ createdAt: -1 }).limit(1).next();
if (online) createdOrderIds.push(online._id);
check("Online order created as pending_payment", online?.status === "pending_payment", online?._id);
check("Razorpay gateway order created with test keys", /^order_/.test(online?.payment?.razorpayOrderId ?? ""), online?.payment?.razorpayOrderId);
check("Razorpay checkout script loaded", await evaluate("typeof window.Razorpay === 'function'"));
p = await products.findOne({ "variants.sku": SKU });
v = p.variants.find((x) => x.sku === SKU);
check("Unpaid order reserves stock", v.reserved === snapshot.reserved + 1 && v.stock === snapshot.stock - 2, `stock ${v.stock}, reserved ${v.reserved}`);

// ── 3. Webhook + cron hardening ──────────────────────────────────────────────
const bad = await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body: "{}", headers: { "x-razorpay-signature": "nope" } });
check("Webhook rejects a bad signature (401)", bad.status === 401);
const evtBody = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_e2e", amount: 1, status: "failed", notes: { orderId: online?._id } } } } });
const sig = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(evtBody).digest("hex");
const evtId = `evt_e2e_${randomUUID()}`;
const w1 = await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body: evtBody, headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": evtId } });
const w2 = await (await fetch(`${BASE}/api/webhooks/razorpay`, { method: "POST", body: evtBody, headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": evtId } })).json();
check("Webhook accepts a signed event, dedupes the replay", w1.status === 200 && w2.duplicate === true);
const c1 = await fetch(`${BASE}/api/cron/release-reservations`);
const c2 = await fetch(`${BASE}/api/cron/release-reservations`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
check("Cron requires the secret (401 / 200)", c1.status === 401 && c2.status === 200);

// ── 4. Admin (test owner signs in with email OTP) ────────────────────────────
// Better Auth trusts only its configured origin (CSRF check), whichever port the test server uses.
const sendOtp = await fetch(`${BASE}/api/auth/email-otp/send-verification-otp`, { method: "POST", headers: { "content-type": "application/json", origin: process.env.BETTER_AUTH_URL }, body: JSON.stringify({ email: ADMIN, type: "sign-in" }) });
check("OTP send endpoint", sendOtp.ok, String(sendOtp.status));
await sleep(500);
const ver = await dbx.collection("verification").find({ identifier: { $regex: ADMIN.replace(".", "\\.") } }).sort({ createdAt: -1 }).limit(1).next();
check("OTP is stored hashed, never as the plain code", !!ver && !/^\d{6}(:|$)/.test(String(ver.value)));

// A test owner with a session signed exactly like Better Auth's cookies (HMAC-SHA256, base64).
const now = new Date();
const adminUser = { _id: new mongoose.Types.ObjectId(), name: "E2E Admin", email: ADMIN, emailVerified: true, role: "owner", createdAt: now, updatedAt: now };
await dbx.collection("user").insertOne(adminUser);
const token = randomUUID().replace(/-/g, "");
await dbx.collection("session").insertOne({ _id: new mongoose.Types.ObjectId(), token, userId: adminUser._id, expiresAt: new Date(now.getTime() + 3600_000), createdAt: now, updatedAt: now, ipAddress: "", userAgent: "e2e" });
const signed = encodeURIComponent(`${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(token).digest("base64")}`);
await send("Network.enable");
await send("Network.setCookie", { name: "aq.session_token", value: signed, url: BASE, httpOnly: true });

await go("/admin");
check("Admin dashboard renders for owner", await waitFor(`document.body.innerText.includes("Recent orders")`, 10000));
await go(`/admin/orders/${codId}`);
await waitFor(`document.body.innerText.includes("Start packing")`, 10000);
await clickText("button", "Start packing");
check("Admin: start packing", await waitFor(`document.body.innerText.includes("Marked as being prepared")`, 10000));
await (async () => { const o = await orders.findOne({ _id: codId }); check("Order is processing", o.status === "processing"); })();
await go(`/admin/orders/${codId}`);
await waitFor(`!!document.querySelector('input[name="awb"]')`, 10000);
await fill('input[name="courier"]', "Delhivery");
await fill('input[name="awb"]', "E2E123456");
await clickText("button", "Mark shipped");
check("Admin: ship with AWB", await waitFor(`document.body.innerText.includes("Marked shipped")`, 10000));
await go(`/admin/orders/${codId}`);
await waitFor(`document.body.innerText.includes("Mark delivered")`, 10000);
await clickText("button", "Mark delivered");
await waitFor(`document.body.innerText.includes("Marked delivered")`, 10000);
const delivered = await orders.findOne({ _id: codId });
check("COD delivered marks payment paid", delivered.status === "delivered" && delivered.payment.status === "paid" && delivered.shipment?.awb === "E2E123456");

if (online) {
  await go(`/admin/orders/${online._id}`);
  await waitFor(`document.body.innerText.includes("Cancel order")`, 10000);
  await clickText("button", "Cancel order");
  await waitFor(`!!document.querySelector('input[name="reason"]')`, 5000);
  await fill('input[name="reason"]', "E2E test cleanup");
  await clickText("button", "Confirm cancel");
  await waitFor(`document.body.innerText.includes("cancelled")`, 10000);
  const cancelled = await orders.findOne({ _id: online._id });
  p = await products.findOne({ "variants.sku": SKU });
  v = p.variants.find((x) => x.sku === SKU);
  check("Admin cancel releases the reservation", cancelled.status === "cancelled" && v.reserved === snapshot.reserved && v.stock === snapshot.stock - 1, `stock ${v.stock}, reserved ${v.reserved}`);
}

for (const path of ["/admin/products", "/admin/inventory", "/admin/customers", "/admin/coupons", "/admin/settings"]) {
  await go(path);
  const ok = await waitFor(`!!document.querySelector("h1") && !document.body.innerText.includes("Application error")`, 8000);
  check(`Admin page ${path}`, ok, await evaluate(`document.querySelector("h1")?.textContent`));
}

// ── 5. Customer-facing views ─────────────────────────────────────────────────
const key = (await orders.findOne({ _id: codId }, { projection: { accessKey: 1 } })).accessKey;
const orderPage = await (await fetch(`${BASE}/order/${codId}?k=${encodeURIComponent(key)}`)).text();
check("Guest order link shows the order", orderPage.includes("Delivered"));
const wrongKey = await fetch(`${BASE}/order/${codId}?k=wrong`);
const wrongText = await wrongKey.text();
check("Wrong key does not reveal the order", !wrongText.includes("12 Test Street"));
const invoice = await (await fetch(`${BASE}/invoice/${codId}?k=${encodeURIComponent(key)}`)).text();
check("Invoice renders with amount in words", invoice.includes("Tax Invoice") && invoice.includes("Rupees"));

// ── Cleanup ──────────────────────────────────────────────────────────────────
ws.close();
chrome.kill();
await orders.deleteMany({ _id: { $in: createdOrderIds } });
await dbx.collection("payments").deleteMany({ orderId: { $in: createdOrderIds } });
await dbx.collection("stockmovements").deleteMany({ ref: { $in: createdOrderIds } });
await dbx.collection("auditlogs").deleteMany({ "entity.id": { $in: createdOrderIds } });
await dbx.collection("webhookevents").deleteMany({ _id: { $regex: "^razorpay:evt_e2e_" } });
await dbx.collection("addresses").deleteMany({ fullName: "E2E Customer" });
await dbx.collection("session").deleteMany({ userId: adminUser._id });
await dbx.collection("account").deleteMany({ userId: adminUser._id });
await dbx.collection("verification").deleteMany({ identifier: { $regex: "e2e-" } });
await dbx.collection("user").deleteMany({ email: { $in: [ADMIN, CUSTOMER] } });
await dbx.collection("counters").deleteMany({ $or: [{ _id: "order" }, { _id: { $regex: "^invoice:" } }] });
await products.updateOne(
  { _id: productBefore._id, "variants.sku": SKU },
  { $set: { "variants.$.stock": snapshot.stock, "variants.$.reserved": snapshot.reserved, salesCount: snapshot.salesCount } },
);
const after = (await products.findOne({ "variants.sku": SKU })).variants.find((x) => x.sku === SKU);
check("Cleanup restored stock and counters", after.stock === snapshot.stock && after.reserved === snapshot.reserved && (await dbx.collection("counters").countDocuments()) === 0);
await mongoose.disconnect();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
