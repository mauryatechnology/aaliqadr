// Find My Sign regression test against a production build (CSP enforced), plan.md §12.4:
// place search reaches Photon, map tiles load, no CSP violations, and no request leaving the
// browser carries the birth date.
//   E2E_BASE=http://localhost:3200 node scripts/dev/finder-check.mjs
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const BIRTH = "1991-08-17";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "finder-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
const csp = [];
const external = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) return pending.get(d.id)(d);
  if (d.method === "Log.entryAdded" && /Content Security Policy/i.test(d.params.entry.text)) csp.push(d.params.entry.text.slice(0, 200));
  if (d.method === "Network.requestWillBeSent") {
    const u = new URL(d.params.request.url);
    if (!u.host.startsWith("localhost")) external.push({ host: u.host, url: d.params.request.url, body: d.params.request.postData ?? "" });
  }
};
const send = (method, params = {}) => new Promise((r) => { const n = ++mid; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(300); } return false; };
const setValue = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); el.focus(); return true; })()`);

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Page.navigate", { url: `${BASE}/find-my-sign` });
  await waitFor(`!!document.querySelector('input[type="date"]')`);

  // Place search → Photon
  // Type like a person: focus the birthplace field, clear it, insert text.
  await evaluate(`(() => { const el = document.querySelector('input[placeholder*="city" i]'); el.focus(); el.select(); return true; })()`);
  for (const ch of "Udaipur") {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, key: ch, unmodifiedText: ch });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
    await sleep(60);
  }
  const suggested = await waitFor(`/Udaipur, Rajasthan/.test(document.activeElement?.closest(".relative.w-full")?.innerText ?? "")`, 12000);
  check("Place search returns suggestions (Photon allowed by CSP)", suggested && external.some((r) => r.host === "photon.komoot.io"));

  // Birth date → result computed on the device
  await setValue('input[type="date"]', BIRTH);
  await evaluate(`[...document.querySelectorAll("button")].find(b => /calculate|reveal|find/i.test(b.textContent) && !b.disabled)?.click()`);
  check("Result shows nakshatra and tithi from the device", await waitFor(`document.body.innerText.includes("Tithi:")`, 8000));

  // Map tiles
  await evaluate(`[...document.querySelectorAll("button")].find(b => /map/i.test(b.textContent))?.click()`);
  check("Map tiles load (tile hosts allowed by CSP)", await waitFor(`[...document.querySelectorAll("img.leaflet-tile")].some(i => i.complete && i.naturalWidth > 0)`, 15000));
  check("Map shows provider attribution", await waitFor(`!!document.querySelector(".leaflet-control-attribution")?.textContent.includes("OpenStreetMap") || !!document.querySelector(".leaflet-control-attribution")?.textContent.includes("Esri")`, 5000));

  await sleep(1000);
  check("No CSP violations", csp.length === 0, csp.slice(0, 3).join(" | "));
  const leaks = external.filter((r) => r.url.includes(BIRTH) || r.url.includes("1991") || r.body.includes(BIRTH));
  check("No request leaving the browser carries the birth date", leaks.length === 0, leaks.map((l) => l.host).join(", "));
  check("No astrology API is contacted", !external.some((r) => /kundlidost|vedika|translate\.googleapis/.test(r.host)), [...new Set(external.map((r) => r.host))].join(", "));
} finally {
  ws.close();
  chrome.kill();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
