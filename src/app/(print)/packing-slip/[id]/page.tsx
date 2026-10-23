import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { site } from "@/config/site";
import { adminUser } from "@/server/admin/guard";
import { getAdminOrder } from "@/server/admin/queries";
import { PrintButton } from "@/components/orders/PrintButton";

export const metadata: Metadata = { title: "Packing slip", robots: { index: false, follow: false } };

/** Goes in the parcel: no prices, ever (gift orders are common for perfume). Staff only. */
export default function PackingSlipPage({ params }: PageProps<"/packing-slip/[id]">) {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <Slip params={params} />
    </Suspense>
  );
}

async function Slip({ params }: Pick<PageProps<"/packing-slip/[id]">, "params">) {
  const user = await adminUser();
  if (!user) notFound();
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  const o = data.order;
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-sm print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="flex items-start justify-between border-b border-neutral-300 pb-4">
        <div>
          <p className="text-xl font-semibold tracking-[0.3em]">AALIQADR</p>
          <p className="text-neutral-600">Packing slip</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{o._id}</p>
          <p>{o.payment.method === "cod" ? "CASH ON DELIVERY" : "PREPAID"}</p>
        </div>
      </header>
      <section className="border-b border-neutral-300 py-4">
        <p className="text-xs uppercase tracking-wider text-neutral-500">Ship to</p>
        <p className="text-base font-medium">{o.shippingAddress.fullName} · {o.shippingAddress.phone}</p>
        <p>
          {o.shippingAddress.line1}
          {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}
          {o.shippingAddress.landmark ? ` (${o.shippingAddress.landmark})` : ""}
          <br />
          {o.shippingAddress.city}, {o.shippingAddress.state} <b>{o.shippingAddress.pincode}</b>
        </p>
      </section>
      <table className="mt-4 w-full text-left">
        <thead><tr className="border-b border-neutral-400 text-xs uppercase tracking-wider text-neutral-500"><th className="py-2">Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Packed</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.sku} className="border-b border-neutral-200"><td className="py-2">{i.name}, {i.variantLabel}</td><td className="font-mono text-xs">{i.sku}</td><td className="text-right text-base font-semibold">{i.qty}</td><td className="text-right">☐</td></tr>
          ))}
        </tbody>
      </table>
      {o.gift.wrap && (
        <section className="mt-6 rounded-lg border-2 border-dashed border-neutral-400 p-4">
          <p className="font-semibold">GIFT WRAP{o.gift.hidePrice ? " · NO INVOICE IN PARCEL" : ""}</p>
          {o.gift.message && <p className="mt-2 font-serif text-base italic">“{o.gift.message}”</p>}
        </section>
      )}
      <footer className="mt-10 text-xs text-neutral-500">
        Flammable liquid: ship by surface, upright, cushioned. Questions? {site.support.phone}
      </footer>
    </main>
  );
}
