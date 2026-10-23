// Visits every page in headless Chrome and reports console errors/warnings, exceptions,
// CSP violations and failed requests. Creates a temporary owner session, then removes it.
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

const BASE = process.argv[2] ?? "http://localhost:3001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(process.env.MONGODB_URI);
const dbx = mongoose.connection.db;
const prods = await dbx.collection("products").find({ status: "active" }, { projection: { slug: 1, _id: 1 } }).toArray();
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

const store = ["/", "/zodiac", ...signs.map((s) => `/zodiac/${s}`), ...prods.map((p) => `/perfume/${p.slug}`), "/shop", "/shop?element=fire", "/search?q=rose", "/find-my-sign", "/cart", "/about", "/contact", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms", "/login", "/checkout", "/account", "/order/AQ-999999?k=nope", "/does-not-exist", "/collections", "/collections/fire-signs", "/collections/gifting", "/category/perfumes", "/category/zodiac-extraits", "/faq", "/shop?category=gift-sets&sort=price-asc", "/perfume/ember-crown-aries?v=AQ-ARI-100"];
const cust = await dbx.collection("user").findOne({ role: { $in: ["owner", "admin"] } });
const admin = ["/admin", "/admin/orders", "/admin/products", "/admin/products?stock=low&sort=name", `/admin/products/${prods[0]._id}`, "/admin/products/new", "/admin/categories", "/admin/collections", "/admin/collections/new", "/admin/hsn", "/admin/inventory", "/admin/customers", ...(cust ? [`/admin/customers/${cust._id}`] : []), "/admin/reviews", "/admin/returns", "/admin/content", "/admin/coupons", "/admin/shipping", "/admin/invoices", "/admin/reports", "/admin/reports?range=fy", "/admin/staff", "/admin/settings", "/admin/audit", "/account"];

const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "crawl-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
let current = "";
const issues = [];
const add = (kind, text) => { const t = String(text).slice(0, 400); if (!issues.some((i) => i.page === current && i.text === t)) issues.push({ page: current, kind, text: t }); };
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) return pending.get(d.id)(d);
  if (d.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(d.params.type)) add(d.params.type, d.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  if (d.method === "Runtime.exceptionThrown") add("exception", d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
  if (d.method === "Log.entryAdded" && ["error", "warning"].includes(d.params.entry.level)) add(`log-${d.params.entry.source}`, `${d.params.entry.text} ${d.params.entry.url ?? ""}`);
  if (d.method === "Network.responseReceived" && d.params.response.status >= 400 && !d.params.response.url.includes("does-not-exist") && !d.params.response.url.includes("AQ-999999")) add(`http-${d.params.response.status}`, d.params.response.url);
  if (d.method === "Network.loadingFailed" && !d.params.canceled) add("net-fail", `${d.params.errorText} ${d.params.blockedReason ?? ""}`);
};
const send = (method, params = {}) => new Promise((r) => { const n = ++mid; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");

async function visit(path, width = 1280) {
  current = `${path} @${width}`;
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url: BASE + path });
  await sleep(3500);
  await evaluate("window.scrollTo(0, document.body.scrollHeight / 2)"); await sleep(500);
  const overflow = await evaluate("document.documentElement.scrollWidth > window.innerWidth + 1");
  if (overflow) add("layout", `horizontal overflow: ${await evaluate("document.documentElement.scrollWidth")} > ${width}`);
}

// Cart with items so /cart and /checkout render their full state.
await send("Page.navigate", { url: BASE + "/" }); await sleep(2500);
await evaluate(`localStorage.setItem("aq-cart-v1", JSON.stringify([{ sku: "AQ-ARI-50", slug: "ember-crown-aries", qty: 1 }]))`);

for (const p of store) await visit(p);
for (const p of ["/", "/cart", "/checkout", `/perfume/${prods[0].slug}`, "/shop"]) await visit(p, 390);

const now = new Date();
const u = { _id: new mongoose.Types.ObjectId(), name: "Crawl Admin", email: "crawl-admin@example.com", emailVerified: true, role: "owner", createdAt: now, updatedAt: now };
await dbx.collection("user").insertOne(u);
try {
  const token = randomUUID().replace(/-/g, "");
  await dbx.collection("session").insertOne({ _id: new mongoose.Types.ObjectId(), token, userId: u._id, expiresAt: new Date(now.getTime() + 3600_000), createdAt: now, updatedAt: now, ipAddress: "", userAgent: "crawl" });
  const signed = encodeURIComponent(`${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(token).digest("base64")}`);
  await send("Network.setCookie", { name: "aq.session_token", value: signed, url: BASE, httpOnly: true });
  for (const p of admin) await visit(p);
  for (const p of ["/admin", "/admin/orders", "/admin/inventory"]) await visit(p, 390);
} finally {
  await dbx.collection("session").deleteMany({ userId: u._id });
  await dbx.collection("user").deleteOne({ _id: u._id });
}

console.log(JSON.stringify(issues, null, 1));
console.log(`${issues.length} issue(s)`);
chrome.kill(); ws.close(); await mongoose.disconnect(); process.exit(0);
