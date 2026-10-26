// First-load JS budget (docs/09 §9, plan.md §13.1): sums the gzip size of every script a
// prerendered page loads and fails when a page is over budget. Run after `next build`.
//   node scripts/ci/bundle-budget.mjs [budgetKB]
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.argv[2] ?? 170);
const APP = ".next/server/app";
const PAGES = {
  "/": "(store)/page.html",
  "/shop": "(store)/shop.html",
  "/zodiac/aries": "(store)/zodiac/aries.html",
  "/perfume/ember-crown-aries": "(store)/perfume/ember-crown-aries.html",
  "/find-my-sign": "(store)/find-my-sign.html",
  "/collections": "(store)/collections.html",
  "/cart": "(store)/cart.html",
};

function findHtml(rel) {
  // Route groups may or may not appear in the output path.
  for (const candidate of [rel, rel.replace("(store)/", ""), rel.replace("(store)/page.html", "index.html")]) {
    const p = join(APP, candidate);
    if (existsSync(p)) return p;
  }
  return null;
}

const cache = new Map();
function gz(file) {
  if (!cache.has(file)) cache.set(file, gzipSync(readFileSync(file)).length);
  return cache.get(file);
}

let failed = false;
const rows = [];
for (const [route, rel] of Object.entries(PAGES)) {
  const html = findHtml(rel);
  if (!html) {
    rows.push([route, "not prerendered", ""]);
    continue;
  }
  const src = readFileSync(html, "utf8");
  // noModule scripts (legacy polyfills) are never downloaded by modern browsers.
  const scripts = [...new Set([...src.matchAll(/<script([^>]+)>/g)].filter((m) => !/nomodule/i.test(m[1])).map((m) => /src="(\/_next\/static\/[^"]+\.js)"/.exec(m[1])?.[1]).filter(Boolean))];
  const total = scripts.reduce((n, s) => n + gz(join(".next", s.replace("/_next/", ""))), 0);
  const kb = total / 1024;
  if (kb > BUDGET_KB) failed = true;
  rows.push([route, `${kb.toFixed(1)} KB`, kb > BUDGET_KB ? `OVER (${BUDGET_KB} KB)` : "ok"]);
}
const w = Math.max(...rows.map((r) => r[0].length));
for (const [r, size, status] of rows) console.log(`${r.padEnd(w)}  ${size.padStart(10)}  ${status}`);
if (failed) {
  console.error(`\nFirst-load JS budget exceeded (${BUDGET_KB} KB gzip). See docs/09 §9.`);
  process.exit(1);
}
