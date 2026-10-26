"use server";

import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db/connect";
import { SavedView } from "@/server/models/commerce";
import { toFormError, type FormState } from "./shared";

/** Named list views per person (plan.md §4): "COD to ship", "Low stock perfumes". */

const path = z.string().regex(/^\/admin(\/[a-z-]+)*$/).max(60);

export async function listViewsAction(p: string) {
  const user = await requireRole("staff");
  await db();
  const rows = await SavedView.find({ userId: user.id, path: path.parse(p) }).sort({ name: 1 }).limit(30).lean();
  return rows.map((r) => ({ id: String(r._id), name: r.name, query: r.query }));
}

export async function saveViewAction(p: string, name: string, query: string): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    const v = z.object({ path, name: z.string().trim().min(1, "Name the view").max(40), query: z.string().max(1000).regex(/^[^<>]*$/) }).safeParse({ path: p, name, query: query.replace(/(^|&)page=\d+/, "") });
    if (!v.success) return { error: v.error.issues[0]?.message ?? "Check the name." };
    await db();
    if ((await SavedView.countDocuments({ userId: user.id, path: v.data.path })) >= 30) return { error: "Up to 30 views per list." };
    await SavedView.updateOne({ userId: user.id, path: v.data.path, name: v.data.name }, { $set: { query: v.data.query } }, { upsert: true });
    return { ok: true, message: `View “${v.data.name}” saved.` };
  } catch (e) {
    return toFormError(e, "save_view");
  }
}

export async function deleteViewAction(id: string): Promise<FormState> {
  try {
    const user = await requireRole("staff");
    await db();
    await SavedView.deleteOne({ _id: z.string().regex(/^[a-f0-9]{24}$/).parse(id), userId: user.id });
    return { ok: true, message: "View removed." };
  } catch (e) {
    return toFormError(e, "delete_view");
  }
}
