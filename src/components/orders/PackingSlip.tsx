import Image from "next/image";
import { site } from "@/config/site";
import type { OrderDoc } from "@/server/models/Order";

/** What goes in the parcel: no prices, ever (gift orders are common for perfume). */
export function PackingSlip({ o }: { o: OrderDoc }) {
  return (
    <>
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
              <tr key={i.sku} className="border-b border-neutral-200"><td className="py-2"><span className="flex items-center gap-2">{i.image && <Image src={i.image} alt="" width={36} height={45} className="h-[45px] w-9 rounded object-cover" />}{i.name}, {i.variantLabel}</span></td><td className="font-mono text-xs">{i.sku}</td><td className="text-right text-base font-semibold">{i.qty}</td><td className="text-right">☐</td></tr>
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
    </>
  );
}
