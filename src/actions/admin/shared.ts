import "server-only";
import { AccessError } from "@/server/auth";
import { RateLimitError } from "@/server/rate-limit";
import { OrderError } from "@/server/services/orders";
import { OutOfStockError } from "@/server/services/inventory";
import { CatalogError } from "@/server/services/catalog-admin";

/** Shape every admin form action returns, for useActionState (docs/05 §1.1). */
export type FormState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[]> };

export const idle: FormState = {};

export function toFormError(e: unknown, context: string): FormState {
  if (e instanceof AccessError || e instanceof OrderError || e instanceof RateLimitError || e instanceof CatalogError) return { error: e.message };
  if (e instanceof OutOfStockError) return { error: "That would take stock below zero." };
  if ((e as { code?: number }).code === 11000) return { error: "That already exists (duplicate code, slug or SKU)." };
  console.error(JSON.stringify({ evt: `admin.${context}.failed`, error: (e as Error).message }));
  return { error: "Something went wrong. Please try again." };
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
