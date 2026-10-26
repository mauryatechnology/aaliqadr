// Product editor drafts / preview / autosave / history / cost check (plan.md §8.5) against a
// running server and the real database. Uses a temporary owner. The one real save (cost price)
// changes nothing else; its cost, revision and draft are removed afterwards.
//   node --env-file=.env scripts/dev/product-drafts-check.mjs
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const MARK = "DRAFTCHECK";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(process.env.MONGODB_URI);
const dbx = mongoose.connection.db;
const product = await dbx.collection("products").findOne({ status: "active" });
const pid = product._id;
const now = new Date();
const user = { _id: new mongoose.Types.ObjectId(), name: "Drafts Check", email: "drafts-check@example.com", emailVerified: true, role: "owner", createdAt: now, updatedAt: now };
const token = randomUUID().replace(/-/g, "");
const signed = `${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(token).digest("base64")}`;
await dbx.collection("user").insertOne(user);
await dbx.collection("session").insertOne({ _id: new mongoose.Types.ObjectId(), token, userId: user._id, expiresAt: new Date(now.getTime() + 900_000), createdAt: now, updatedAt: now, ipAddress: "", userAgent: "drafts-check" });
const existingDraft = await dbx.collection("productdrafts").findOne({ _id: pid });
let tmp;

const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "drafts-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) pending.get(d.id)(d);
};
const send = (method, params = {}) => new Promise((r) => { const n = ++mid; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(300); } return false; };
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(500); };
const clickText = (text) => evaluate(`(() => { const b = [...document.querySelectorAll("button")].find(e => e.textContent.trim() === ${JSON.stringify(text)} && !e.disabled); if (!b) return false; b.click(); return true; })()`);
const setName = (value) => evaluate(`(() => { const el = document.querySelector('#basics input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
const editorReady = `!!document.querySelector('#basics input') && document.body.innerText.includes("History")`;

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCookie", { name: "aq.session_token", value: encodeURIComponent(signed), url: BASE, httpOnly: true });
  await dbx.collection("productdrafts").deleteOne({ _id: pid });

  // 1. Save as draft: kept on the server, the live product is untouched.
  await go(`/admin/products/${pid}`);
  check("Editor loads", await waitFor(editorReady, 20000));
  await setName(`${product.name} ${MARK}`);
  await sleep(300);
  await clickText("Save as draft");
  check("Save as draft confirms", await waitFor(`document.body.innerText.includes("Draft kept")`, 10000));
  const draft = await dbx.collection("productdrafts").findOne({ _id: pid });
  const live = await dbx.collection("products").findOne({ _id: pid }, { projection: { name: 1 } });
  check("Draft stored, live product unchanged", draft?.value?.name?.includes(MARK) && live.name === product.name);

  // 2. Preview shows the draft.
  await go(`/preview/product/${pid}`);
  check("Preview shows the draft", await waitFor(`document.body.innerText.includes("unpublished draft") && document.querySelector("h1")?.textContent.includes(${JSON.stringify(MARK)})`, 20000));

  // 3. Reopening the editor offers the draft; discarding removes it.
  await go(`/admin/products/${pid}`);
  check("Editor offers the pending draft", await waitFor(`document.body.innerText.includes("kept an unpublished draft")`, 20000));
  await clickText("Discard it");
  check("Discard removes the draft", await waitFor(`document.body.innerText.includes("Draft discarded")`, 10000) && !(await dbx.collection("productdrafts").findOne({ _id: pid })));

  // 4. Local autosave: unsaved edits survive a reload.
  await go(`/admin/products/${pid}`);
  await waitFor(editorReady, 20000);
  await setName(`${product.name} ${MARK}-local`);
  check("Autosave writes to this browser within ~10 s", await waitFor(`(localStorage.getItem("aq.product-autosave.${pid}") ?? "").includes(${JSON.stringify(MARK)})`, 14000));
  await evaluate(`window.onbeforeunload = null`);
  await send("Page.reload");
  await sleep(500);
  check("Reload offers to restore", await waitFor(`document.body.innerText.includes("kept in this browser")`, 20000));
  await clickText("Restore them");
  check("Restore puts the edits back", await waitFor(`document.querySelector('#basics input')?.value.includes(${JSON.stringify(MARK)})`, 5000));
  await evaluate(`localStorage.clear()`);

  // 5. Owner cost price: margin shows, saving stores paise, history lists the save.
  await go(`/admin/products/${pid}`);
  await waitFor(editorReady, 20000);
  await evaluate(`(() => { const el = document.querySelector('input[data-col="cost"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "400"); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  check("Margin shows for the owner", await waitFor(`document.body.innerText.includes("% margin")`, 5000));
  await clickText("Save changes");
  const savedOk = await waitFor(`document.body.innerText.includes("Saved.")`, 15000);
  const withCost = await dbx.collection("products").findOne({ _id: pid }, { projection: { variants: 1 } });
  check("Cost saved in paise", savedOk && withCost.variants[0].costP === 40000, String(withCost.variants[0].costP));
  await clickText("History");
  check("History lists the save", await waitFor(`document.body.innerText.includes("Saved versions") && document.body.innerText.includes("Drafts Check")`, 10000));
  const rev = await dbx.collection("productrevisions").findOne({ productId: pid, "savedBy.userId": String(user._id) });
  check("Revisions never store cost", !!rev && rev.value.variants.every((v) => v.cost === undefined));

  // 6. Bulk edit, on a temporary draft copy: change one price, save, check it went through the normal save.
  const tmpId = new mongoose.Types.ObjectId();
  tmp = tmpId;
  await dbx.collection("products").insertOne({ ...product, _id: tmpId, slug: "bulk-check", name: "Bulk Check", status: "draft", variants: product.variants.map((v) => ({ ...v, sku: `AQ-BLK-${v.sku.split("-").at(-1)}`, reserved: 0 })) });
  await go("/admin/products/bulk");
  check("Bulk editor loads", await waitFor(`!!document.querySelector('input[aria-label="AQ-BLK-${product.variants[0].sku.split("-").at(-1)} price"]')`, 20000));
  const sku = `AQ-BLK-${product.variants[0].sku.split("-").at(-1)}`;
  const newPrice = Math.max(1, Math.round(product.variants[0].priceP / 100) - 1);
  await evaluate(`(() => { const el = document.querySelector('input[aria-label="${sku} price"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "${newPrice}"); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  check("Changed cell counts as 1 product", await waitFor(`document.body.innerText.includes("1 product changed")`, 5000));
  await clickText("Save 1 product");
  check("Bulk save reports success", await waitFor(`document.body.innerText.includes("1 product saved.")`, 15000));
  const after = await dbx.collection("products").findOne({ _id: tmpId });
  check("Price saved, nothing else changed", after.variants[0].priceP === newPrice * 100 && after.status === "draft" && after.name === "Bulk Check");

  // 7. New-product wizard (nothing is created).
  await go("/admin/products/new");
  check("Wizard starts on Basics only", await waitFor(`!!document.querySelector('nav[aria-label="Steps"]') && !document.getElementById("basics").hidden && document.getElementById("variants").hidden && document.getElementById("media").hidden`, 20000));
  await evaluate(`[...document.querySelectorAll("button")].find(b => b.textContent.startsWith("Next:"))?.click()`);
  check("Next shows options & prices", await waitFor(`!document.getElementById("variants").hidden && document.getElementById("basics").hidden`, 5000));
  await evaluate(`[...document.querySelectorAll('nav[aria-label="Steps"] button')].at(-1).click()`);
  check("Review lists what's needed to go live", await waitFor(`document.body.innerText.includes("Needed to go live:")`, 5000));
  await evaluate(`[...document.querySelectorAll("button")].find(b => b.textContent === "Fix")?.click()`);
  check("Fix jumps back to the step", await waitFor(`!document.querySelector('nav[aria-label="Steps"] [aria-current="step"]')?.textContent.includes("Review")`, 5000));
  await evaluate(`window.onbeforeunload = null; localStorage.clear()`);
} finally {
  ws.close();
  chrome.kill();
  await dbx.collection("productdrafts").deleteOne({ _id: pid, "value.name": { $regex: MARK } });
  if (existingDraft) await dbx.collection("productdrafts").replaceOne({ _id: pid }, existingDraft, { upsert: true });
  await dbx.collection("products").updateOne({ _id: pid }, { $unset: { "variants.$[].costP": "" } });
  await dbx.collection("productrevisions").deleteMany({ "savedBy.userId": String(user._id) });
  if (tmp) {
    await dbx.collection("products").deleteOne({ _id: tmp });
    await dbx.collection("auditlogs").deleteMany({ "entity.id": String(tmp) });
  }
  await dbx.collection("session").deleteMany({ userId: user._id });
  await dbx.collection("user").deleteOne({ _id: user._id });
  await mongoose.disconnect();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
