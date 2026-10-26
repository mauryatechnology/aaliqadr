import "server-only";
import { del, list } from "@vercel/blob";
import mongoose from "mongoose";
import { env, requireConfigured } from "@/env";
import { db } from "@/server/db/connect";

/**
 * Finds catalogue uploads (`products/`) that nothing refers to any more: photos removed in the
 * editor, abandoned uploads (plan.md §8.5). Anything younger than the grace period is left
 * alone (it may be in an unsaved editor). Report-only unless `apply` is set.
 */

const GRACE_MS = 7 * 24 * 3600_000;
const MAX_DELETES = 200;

/**
 * Every collection that may hold a catalogue URL: products and their drafts and history (so an
 * old version can still be restored), order snapshots, content blocks, settings, categories.
 */
const SOURCES: { collection: string; projection?: Record<string, 1> }[] = [
  { collection: "products" },
  { collection: "productdrafts" },
  { collection: "productrevisions" },
  { collection: "orders", projection: { "items.image": 1 } },
  { collection: "contents" },
  { collection: "settings" },
  { collection: "categories" },
  { collection: "collections" },
];

const URL_RE = /https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/products\/[^"\s?#]+/g;

async function referencedPaths(): Promise<Set<string>> {
  await db();
  const out = new Set<string>();
  const conn = mongoose.connection.db!;
  for (const s of SOURCES) {
    for await (const doc of conn.collection(s.collection).find({}, s.projection ? { projection: s.projection } : {})) {
      for (const url of JSON.stringify(doc).match(URL_RE) ?? []) out.add(new URL(url).pathname.slice(1));
    }
  }
  return out;
}

export async function sweepOrphanMedia({ apply = false, now = Date.now() } = {}) {
  requireConfigured("BLOB_READ_WRITE_TOKEN");
  const referenced = await referencedPaths();
  const orphans: { url: string; pathname: string; size: number }[] = [];
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "products/", cursor, limit: 1000, token: env.BLOB_READ_WRITE_TOKEN });
    for (const b of page.blobs) {
      total++;
      if (!referenced.has(b.pathname) && now - b.uploadedAt.getTime() > GRACE_MS) orphans.push({ url: b.url, pathname: b.pathname, size: b.size });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  // A reference scan that found nothing (or nearly nothing) is a failed scan, not a mass orphaning.
  const suspicious = orphans.length > 0 && (referenced.size === 0 || orphans.length > total * 0.6);
  let deleted = 0;
  if (apply && !suspicious && orphans.length) {
    const batch = orphans.slice(0, MAX_DELETES);
    await del(batch.map((o) => o.url), { token: env.BLOB_READ_WRITE_TOKEN });
    deleted = batch.length;
  }
  return {
    total,
    referenced: referenced.size,
    orphans: orphans.length,
    orphanBytes: orphans.reduce((n, o) => n + o.size, 0),
    deleted,
    skipped: suspicious ? "Too many unreferenced files: nothing deleted, check the reference scan." : undefined,
    sample: orphans.slice(0, 10).map((o) => o.pathname),
  };
}
