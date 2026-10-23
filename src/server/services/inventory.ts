import "server-only";
import type { ClientSession } from "mongoose";
import { Product } from "@/server/models/Product";
import { StockMovement, type StockMovementDoc } from "@/server/models/commerce";

/**
 * Stock (docs/07 §10). `stock` is sellable; `reserved` is held by unpaid orders. Every change is
 * a conditional update (it can never go negative) plus an append-only ledger row.
 */

export type Actor = { name: string; role: string; userId?: string };
export const SYSTEM: Actor = { name: "System", role: "system" };

export interface StockLine {
  productId: string;
  sku: string;
  qty: number;
}

export class OutOfStockError extends Error {
  constructor(public readonly sku: string) {
    super(`Not enough stock for ${sku}`);
    this.name = "OutOfStockError";
  }
}

async function log(type: StockMovementDoc["type"], lines: StockLine[], ref: string, actor: Actor, session?: ClientSession, sign = 1, reason?: string) {
  await StockMovement.insertMany(
    lines.map((l) => ({ sku: l.sku, productId: l.productId, type, qty: sign * l.qty, ref, reason, actor })),
    { session },
  );
}

/** Moves stock → reserved. Throws OutOfStockError (the caller's transaction aborts). */
export async function reserve(lines: StockLine[], ref: string, session: ClientSession, actor: Actor = SYSTEM) {
  for (const l of lines) {
    const res = await Product.updateOne(
      { _id: l.productId, variants: { $elemMatch: { sku: l.sku, isActive: true, stock: { $gte: l.qty } } } },
      { $inc: { "variants.$.stock": -l.qty, "variants.$.reserved": l.qty } },
      { session },
    );
    if (res.modifiedCount !== 1) throw new OutOfStockError(l.sku);
  }
  await log("reserve", lines, ref, actor, session, -1);
}

/** Reserved → sold (payment captured or COD confirmed). */
export async function commitSale(lines: StockLine[], ref: string, session: ClientSession, actor: Actor = SYSTEM) {
  for (const l of lines) {
    await Product.updateOne(
      { _id: l.productId, variants: { $elemMatch: { sku: l.sku, reserved: { $gte: l.qty } } } },
      { $inc: { "variants.$.reserved": -l.qty, salesCount: l.qty } },
      { session },
    );
  }
  await log("sale", lines, ref, actor, session, -1);
}

/** Reserved → back on sale (unpaid order expired or cancelled before payment). */
export async function release(lines: StockLine[], ref: string, session: ClientSession, actor: Actor = SYSTEM) {
  for (const l of lines) {
    await Product.updateOne(
      { _id: l.productId, variants: { $elemMatch: { sku: l.sku, reserved: { $gte: l.qty } } } },
      { $inc: { "variants.$.reserved": -l.qty, "variants.$.stock": l.qty } },
      { session },
    );
  }
  await log("release", lines, ref, actor, session, 1);
}

/** Sold → back on sale (a confirmed order cancelled before dispatch). */
export async function restock(lines: StockLine[], ref: string, session: ClientSession, actor: Actor = SYSTEM) {
  for (const l of lines) {
    await Product.updateOne({ _id: l.productId, "variants.sku": l.sku }, { $inc: { "variants.$.stock": l.qty, salesCount: -l.qty } }, { session });
  }
  await log("restock", lines, ref, actor, session, 1);
}

/** Admin correction: positive receives stock, negative writes it off. Never below zero. */
export async function adjust(line: StockLine & { delta: number }, reason: string, actor: Actor) {
  const filter =
    line.delta < 0
      ? { _id: line.productId, variants: { $elemMatch: { sku: line.sku, stock: { $gte: -line.delta } } } }
      : { _id: line.productId, "variants.sku": line.sku };
  const res = await Product.updateOne(filter, { $inc: { "variants.$.stock": line.delta } });
  if (res.modifiedCount !== 1) throw new OutOfStockError(line.sku);
  await StockMovement.create({ sku: line.sku, productId: line.productId, type: line.delta > 0 ? "receive" : "adjust", qty: line.delta, reason, actor });
}
