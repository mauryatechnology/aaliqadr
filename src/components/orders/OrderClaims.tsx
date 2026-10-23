import { formatPrice } from "@/lib/money";
import { getSessionUser } from "@/server/auth";
import { getClaimsForOrder } from "@/server/queries/account";
import type { OrderView } from "@/server/queries/account";
import { ClaimForm } from "./ClaimForm";

const STATUS = { requested: "Received", approved: "Approved", rejected: "Not approved", received: "Item received", refunded: "Refunded", replaced: "Replacement sent", closed: "Closed" } as Record<string, string>;
const REASON = { damaged: "Arrived damaged", leaked: "Leaked in transit", wrong_item: "Wrong item sent", missing_item: "Item missing", other: "Other" } as Record<string, string>;
const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

/** Problem reports on a delivered order: their progress, and the form while the window is open. */
export async function OrderClaims({ order, accessKey }: { order: OrderView; accessKey?: string }) {
  if (order.status !== "delivered" && order.status !== "returned") return null;
  const [{ canClaim, until, claims }, user] = await Promise.all([getClaimsForOrder(order), getSessionUser()]);
  if (!canClaim && claims.length === 0) return null;
  return (
    <section className="surface mt-8 flex flex-col gap-5 p-6 sm:p-8" aria-labelledby="claims-title">
      <h2 id="claims-title" className="font-display text-3xl">Problem with your order?</h2>
      {claims.map((c) => (
        <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 text-sm">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span>{c.id} · {REASON[c.reason]}</span>
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs">{STATUS[c.status]}</span>
          </p>
          {c.refundP > 0 && <p className="text-muted">Refund: {formatPrice(c.refundP)}</p>}
          {c.replacementAwb && <p className="text-muted">Replacement tracking: {c.replacementAwb}</p>}
          <ol className="flex flex-col gap-1 text-xs text-muted">
            {c.history.map((h, i) => <li key={i}>{dateFmt.format(new Date(h.at))} · {STATUS[h.status] ?? h.status}{h.note ? `: ${h.note}` : ""}</li>)}
          </ol>
        </div>
      ))}
      {canClaim && <ClaimForm orderId={order._id} accessKey={accessKey} until={until} userId={user?.id} items={order.items.map((i) => ({ sku: i.sku, name: `${i.name} · ${i.variantLabel}`, qty: i.qty }))} />}
    </section>
  );
}
