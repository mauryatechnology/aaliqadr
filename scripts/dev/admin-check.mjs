// Admin kit regression check (plan.md §2–§5) against a running server and the real database.
// Uses a temporary owner and temporary records (coupon, customer); removes everything it made.
//   E2E_BASE=http://localhost:3200 node --env-file=.env scripts/dev/admin-check.mjs
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(process.env.MONGODB_URI);
const dbx = mongoose.connection.db;
const now = new Date();
const owner = { _id: new mongoose.Types.ObjectId(), name: "Admin Check", email: "admin-check@example.com", emailVerified: true, role: "owner", createdAt: now, updatedAt: now };
const token = randomUUID().replace(/-/g, "");
const signed = `${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(token).digest("base64")}`;
await dbx.collection("user").insertOne(owner);
await dbx.collection("session").insertOne({ _id: new mongoose.Types.ObjectId(), token, userId: owner._id, expiresAt: new Date(now.getTime() + 900_000), createdAt: now, updatedAt: now, ipAddress: "", userAgent: "admin-check" });
const COUPON = "ADMCHK" + Math.floor(Math.random() * 9000 + 1000);
const CUSTOMER = `cust-check-${Date.now()}@example.com`;
const variant = await dbx.collection("products").aggregate([{ $match: { status: "active" } }, { $unwind: "$variants" }, { $limit: 1 }, { $project: { sku: "$variants.sku", th: "$variants.lowStockThreshold", pid: "$_id" } }]).next();

const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-sandbox", "--window-size=1440,900", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "admchk-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) return pending.get(d.id)(d);
  if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise((r) => { const n = ++mid; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(250); } return false; };
// Waits for React to hydrate the page, so typed input and clicks reach their handlers.
const hydrated = `[...document.querySelectorAll("main button, main input")].some(el => Object.keys(el).some(k => k.startsWith("__reactProps")))`;
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(400); await waitFor(hydrated, 15000); };
const text = (s) => `document.body.innerText.includes(${JSON.stringify(s)})`;
const clickText = (sel, t) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().includes(${JSON.stringify(t)}) && !e.disabled); if (!el) return false; el.click(); return true; })()`);
const typeInto = async (sel, value) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.focus(); el.select?.(); return true; })()`);
  for (const ch of value) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, key: ch, unmodifiedText: ch });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
  }
};
const setVal = (sel, v) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const url = () => evaluate("location.pathname + location.search");

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCookie", { name: "aq.session_token", value: encodeURIComponent(signed), url: BASE, httpOnly: true });

  // Dashboard 2.0
  await go("/admin?range=d7");
  check("Dashboard shows KPIs and queues", await waitFor(`${text("Average order")} && ${text("To pack")}`));

  // Lists: debounced search → URL, chips, sort headers
  await go("/admin/products");
  await waitFor(`!!document.getElementById("list-q")`);
  await typeInto("#list-q", "ember");
  check("Search updates the URL after the debounce", await waitFor(`location.search.includes("q=ember")`, 5000), await url());
  check("Active search shows a removable chip", await waitFor(`!!document.querySelector('[aria-label^="Remove Search"]')`, 5000));
  await evaluate(`document.querySelector('[aria-label^="Remove Search"]').click()`);
  check("Removing the chip clears the search", await waitFor(`!location.search.includes("q=")`, 5000));
  await clickText("th a", "Price");
  check("Column header sorts and sets aria-sort", await waitFor(`location.search.includes("sort=price") && !!document.querySelector('th[aria-sort]')`, 8000));

  // Saved view
  await go("/admin/orders?status=confirmed,processing");
  await waitFor(`!!document.querySelector("summary")`);
  await evaluate(`[...document.querySelectorAll("summary")].find(s => s.textContent.includes("Views")).click()`);
  await waitFor(`!!document.querySelector('input[aria-label="View name"]')`, 5000);
  await setVal('input[aria-label="View name"]', "Check view");
  await sleep(300);
  await clickText("button", "Save");
  check("Saved view stored", await waitFor(`${text("View “Check view” saved")}`, 8000) && !!(await dbx.collection("savedviews").findOne({ userId: String(owner._id), name: "Check view" })));

  // Command palette
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "k", code: "KeyK", modifiers: 2, windowsVirtualKeyCode: 75 });
  check("⌘K / Ctrl+K opens the palette", await waitFor(`!!document.querySelector('dialog[aria-label="Command palette"][open]')`, 5000));
  await typeInto('dialog[open] input[role="combobox"]', "inven");
  await sleep(400);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  check("Palette jumps to a page", await waitFor(`location.pathname === "/admin/inventory"`, 8000), await url());

  // Inline threshold + Undo
  await go(`/admin/inventory?q=${variant.sku}`);
  await waitFor(`!!document.querySelector('button[title="Edit low-stock alert"]')`, 10000);
  await evaluate(`document.querySelector('button[title="Edit low-stock alert"]').click()`);
  await waitFor(`!!document.querySelector('input[aria-label^="Low-stock alert"]')`, 3000);
  await setVal('input[aria-label^="Low-stock alert"]', String((variant.th ?? 5) + 7));
  await clickText("button", "OK");
  await waitFor(`${text("low-stock alert at")}`, 8000);
  let v = await dbx.collection("products").findOne({ "variants.sku": variant.sku }, { projection: { "variants.$": 1 } });
  check("Inline threshold saved", v.variants[0].lowStockThreshold === (variant.th ?? 5) + 7);
  await clickText("button", "Undo");
  await waitFor(`${text("Restored.")}`, 8000);
  v = await dbx.collection("products").findOne({ "variants.sku": variant.sku }, { projection: { "variants.$": 1 } });
  check("Undo restores it", v.variants[0].lowStockThreshold === (variant.th ?? 5));

  // Coupon create → edit → delete
  await go("/admin/coupons");
  await clickText("button", "New coupon");
  await waitFor(`!!document.querySelector('dialog[open] input[name="code"]')`, 5000);
  await setVal('dialog[open] input[name="code"]', COUPON);
  await setVal('dialog[open] input[name="value"]', "10");
  await clickText("dialog[open] button", "Create coupon");
  check("Coupon created from the drawer", await waitFor(`${text(COUPON)}`, 10000) && !!(await dbx.collection("coupons").findOne({ code: COUPON })));
  await evaluate(`document.querySelector('[aria-label="Edit ${COUPON}"]').click()`);
  await waitFor(`!!document.querySelector('dialog[open] input[name="description"]')`, 5000);
  await setVal('dialog[open] input[name="description"]', "edited by check");
  await evaluate(`document.querySelector('dialog[open] input[name="showOnProduct"]').click()`);
  await clickText("dialog[open] button", "Save changes");
  await waitFor(`${text("edited by check")}`, 10000);
  const c = await dbx.collection("coupons").findOne({ code: COUPON });
  check("Coupon edited (description, product-page flag)", c?.description === "edited by check" && c?.showOnProduct === true);
  await evaluate(`document.querySelector('[aria-label="Delete ${COUPON}"]').click()`);
  await waitFor(`!!document.querySelector('dialog[open] button[type="submit"]')`, 5000);
  await clickText("dialog[open] button", "Yes, continue");
  await clickText("dialog[open] button", "Delete");
  check("Unused coupon deleted", await waitFor(`!${text(COUPON)}`, 10000) && !(await dbx.collection("coupons").findOne({ code: COUPON })));

  // Customer create → address → COD block → deactivate
  await go("/admin/customers");
  await clickText("button", "Add customer");
  await waitFor(`!!document.querySelector('dialog[open] input[type="email"]')`, 5000);
  await setVal('dialog[open] input:not([type])', "Check Customer");
  await setVal('dialog[open] input[type="email"]', CUSTOMER);
  await clickText("dialog[open] button", "Add customer");
  check("Customer added and opened", await waitFor(`location.pathname.startsWith("/admin/customers/") && ${text("Check Customer")}`, 10000));
  await clickText("button", "Add an address");
  await waitFor(`!!document.querySelector('input[autocomplete="postal-code"]')`, 5000);
  await setVal('input[autocomplete="name"]', "Check Customer");
  await setVal('input[autocomplete="tel"]', "9876543210");
  await setVal('input[autocomplete="address-line1"]', "12 Test Street, Arera Colony");
  await setVal('input[autocomplete="postal-code"]', "462016");
  await setVal('input[autocomplete="address-level2"]', "Bhopal");
  const stateFilled = await evaluate(`[...document.querySelectorAll("select")].some(s => s.value === "23")`);
  check("PIN code pre-fills the state", stateFilled);
  await clickText("button", "Save address");
  await sleep(1500);
  const addrError = await evaluate(`document.querySelector('[role="alert"]')?.textContent ?? ""`);
  const cust = await dbx.collection("user").findOne({ email: CUSTOMER });
  check("Address saved as default", await waitFor(`document.body.innerText.toLowerCase().includes("make default") || document.body.innerText.includes("DEFAULT")`, 10000) && !!(await dbx.collection("addresses").findOne({ userId: String(cust?._id), isDefault: true })), addrError);
  await evaluate(`[...document.querySelectorAll('input[type="checkbox"]')].find(i => i.closest("label")?.textContent.includes("Block cash on delivery")).click()`);
  await waitFor(`${text("COD blocked")}`, 10000);
  check("COD blocked", (await dbx.collection("user").findOne({ email: CUSTOMER }))?.codBlocked === true);
  await clickText("button", "Deactivate account");
  await waitFor(`!!document.querySelector('dialog[open]')`, 3000);
  await clickText("dialog[open] button", "Deactivate");
  await waitFor(`${text("Account deactivated")}`, 10000);
  check("Account deactivated", (await dbx.collection("user").findOne({ email: CUSTOMER }))?.disabled === true);
  const otp = await fetch(`${BASE}/api/auth/email-otp/send-verification-otp`, { method: "POST", headers: { "content-type": "application/json", origin: process.env.BETTER_AUTH_URL }, body: JSON.stringify({ email: CUSTOMER, type: "sign-in" }) });
  check("Deactivated account can't get a sign-in code", otp.status === 403, String(otp.status));

  check("No uncaught exceptions in the admin", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  ws.close();
  chrome.kill();
  const cust = await dbx.collection("user").findOne({ email: CUSTOMER });
  if (cust) {
    await dbx.collection("addresses").deleteMany({ userId: String(cust._id) });
    await dbx.collection("user").deleteOne({ _id: cust._id });
    await dbx.collection("auditlogs").deleteMany({ "entity.id": String(cust._id) });
  }
  await dbx.collection("coupons").deleteOne({ code: COUPON });
  await dbx.collection("auditlogs").deleteMany({ "entity.id": COUPON });
  await dbx.collection("products").updateOne({ "variants.sku": variant.sku }, { $set: { "variants.$.lowStockThreshold": variant.th ?? 5 } });
  await dbx.collection("savedviews").deleteMany({ userId: String(owner._id) });
  await dbx.collection("session").deleteMany({ userId: owner._id });
  await dbx.collection("user").deleteOne({ _id: owner._id });
  await mongoose.disconnect();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
