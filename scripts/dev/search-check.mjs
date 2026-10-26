// Storefront search & filters check (plan.md §9.4) against a production build.
//   E2E_BASE=http://localhost:3200 node scripts/dev/search-check.mjs
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-sandbox", "--window-size=1440,900", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "search-"))}`, "about:blank"], { stdio: "ignore" });
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
const hydrated = `[...document.querySelectorAll("header a, header button")].some(el => Object.keys(el).some(k => k.startsWith("__reactProps")))`;
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(500); await waitFor(hydrated, 15000); };
const firstCard = `document.querySelector("[data-search-results] h3, [data-search-results] article")?.textContent ?? ""`;
const key = async (k, code) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, text: k.length === 1 ? k : k === "Enter" ? "\r" : undefined, windowsVirtualKeyCode: k === "Enter" ? 13 : undefined }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code }); };

try {
  await send("Page.enable");
  await send("Runtime.enable");

  await go("/search?q=mesh");
  check("“mesh” (rashi) finds Ember Crown", await waitFor(`(${firstCard}).includes("Ember Crown")`), await evaluate(firstCard));
  await go("/search?q=kesar");
  check("“kesar” finds saffron fragrances", await waitFor(`document.querySelectorAll("[data-search-results] article").length > 0`));
  await go("/search?q=embr%20crwn");
  check("“embr crwn” (typos) finds Ember Crown", await waitFor(`(${firstCard}).includes("Ember Crown")`), await evaluate(firstCard));
  await go("/search?q=qzxwvy");
  check("No results offers bestsellers and a way out", await waitFor(`document.body.innerText.includes("Nothing matched") && document.body.innerText.includes("Tell us what you were looking for")`));

  // Overlay from the "/" key
  await go("/");
  await key("/", "Slash");
  check("“/” opens the search overlay", await waitFor(`!!document.querySelector('dialog[aria-label="Search"][open]')`, 8000));
  for (const ch of "leo") await key(ch, `Key${ch.toUpperCase()}`);
  check("Overlay shows instant results", await waitFor(`document.querySelectorAll('#search-results [role="option"]').length > 0`, 8000));
  await key("Enter", "Enter");
  check("Enter opens full results", await waitFor(`location.pathname === "/search" && location.search.includes("q=leo")`, 8000));

  // Facets
  await go("/shop?element=fire");
  const cnt = async () => [await evaluate(`Number((document.querySelector('[aria-live="polite"]')?.textContent ?? "").match(/\\d+/)?.[0] ?? -1)`), await evaluate(`document.querySelectorAll("main ul.grid > li").length`)];
  let [n, grid] = await cnt();
  check("Count matches the grid", n === grid && n > 0, `${n} vs ${grid}`);
  check("A single element page stays indexable", !(await evaluate(`!!document.querySelector('meta[name="robots"][content*="noindex"]')`)));
  await evaluate(`[...document.querySelectorAll('aside a[href*="family="]')].find(a => Number(a.lastElementChild?.textContent) > 0)?.click()`);
  check("Ticking a facet updates the URL", await waitFor(`location.search.includes("family=")`, 8000), await evaluate("location.search"));
  [n, grid] = await cnt();
  check("Combined filters still match the grid", n === grid && n > 0, `${n} vs ${grid}`);
  check("Filter combinations are noindex", await waitFor(`!!document.querySelector('meta[name="robots"][content*="noindex"]')`, 5000));
  check("Applied filters show as chips", await evaluate(`!!document.querySelector('a[aria-label^="Remove "]')`));

  // Mobile sheet
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await go("/shop");
  await evaluate(`[...document.querySelectorAll("button")].find(b => b.textContent.includes("Filter & sort"))?.click()`);
  check("Phone: Filter & sort opens a sheet with a result count", await waitFor(`!!document.querySelector('dialog[aria-label="Filter and sort"][open]') && /show \\d+ result/i.test(document.querySelector('dialog[open]')?.textContent ?? "")`, 8000));

  check("No uncaught exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  ws.close();
  chrome.kill();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
