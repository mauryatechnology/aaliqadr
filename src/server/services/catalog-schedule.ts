import "server-only";
import { revalidateTag } from "next/cache";
import { tags } from "@/server/queries/catalog";
import { runCatalogSchedule } from "./catalog-admin";

/** Runs due launches / take-downs and refreshes the store pages they touch (route handlers only). */
export async function applyCatalogSchedule() {
  const result = await runCatalogSchedule();
  const changed = [...result.published, ...result.unpublished];
  if (changed.length) {
    revalidateTag(tags.products, "max");
    revalidateTag(tags.collections, "max");
    for (const slug of changed) revalidateTag(tags.product(slug), "max");
  }
  console.log(JSON.stringify({ evt: "cron.catalog_schedule", ...result }));
  return result;
}
