import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBusiness } from "@/server/queries/business";
import { stateName } from "@/config/india";
import { amountInWords, formatPrice, splitInclusiveGst } from "@/lib/money";
import { getSessionUser } from "@/server/auth";
import { getOrderForViewer } from "@/server/queries/account";
import { PrintButton } from "@/components/orders/PrintButton";

export const metadata: Metadata = { title: "Tax invoice", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const fmt = (p: number) => formatPrice(p, { exact: true });
const pct = (bps: number) => `${bps / 100}%`;

/** GST tax invoice (docs/07 §11), rendered on demand from the order snapshot. */
export default function InvoicePage({ params, searchParams }: PageProps<"/invoice/[id]">) {
  return (
    <Suspense fallback={<p className="p-10">Loading invoice…</p>}>
      <Invoice params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Invoice({ params, searchParams }: Pick<PageProps<"/invoice/[id]">, "params" | "searchParams">) {
  const [{ id }, sp, viewer] = await Promise.all([params, searchParams, getSessionUser()]);
  const found = await getOrderForViewer(id, viewer, typeof sp.k === "string" ? sp.k : undefined);
  if (!found?.order.invoice?.number) notFound();
  const o = found.order;
  // The seller as on the day of issue; older invoices fall back to the current details.
  const seller = o.seller ?? (await getBusiness());
  const inter = o.placeOfSupply.isInterState;
  const lines = o.items.map((i) => {
    const gross = i.lineTotalP - i.discountP;
    return { ...i, gross, ...splitInclusiveGst(gross, i.gstRateBps, inter) };
  });
  const charges = o.pricing.shippingP + o.pricing.codFeeP + o.pricing.giftWrapP;
  const chargeSplit = charges > 0 ? splitInclusiveGst(charges, 1800, inter) : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-sm print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-300 pb-6">
        <div>
          <p className="text-xl font-semibold tracking-[0.3em]">AALIQADR</p>
          <p className="mt-2 font-medium">{seller.legalName}</p>
          <p className="max-w-xs text-neutral-600">{seller.address}</p>
          {seller.gstin && <p className="mt-1">GSTIN: {seller.gstin}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-semibold">Tax Invoice</h1>
          <p className="mt-2">
            Invoice no. <b>{o.invoice?.number}</b>
          </p>
          <p>Date {o.invoice?.issuedAt ? dateFmt.format(new Date(o.invoice.issuedAt)) : ""}</p>
          <p>Order {o._id}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">Billed & shipped to</p>
          <p className="font-medium">{o.shippingAddress.fullName}</p>
          <p className="text-neutral-700">
            {o.shippingAddress.line1}
            {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}
            <br />
            {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}
          </p>
          <p className="text-neutral-700">{o.contact.email}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">Place of supply</p>
          <p>
            {stateName(o.placeOfSupply.stateCode)} ({o.placeOfSupply.stateCode})
          </p>
          <p className="mt-3 text-xs uppercase tracking-wider text-neutral-500">Payment</p>
          <p>{o.payment.method === "cod" ? "Cash on delivery" : "Prepaid online"}</p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-400 text-xs uppercase tracking-wider text-neutral-500">
            <th className="py-2">Item</th>
            <th>HSN</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Taxable</th>
            <th className="text-right">Rate</th>
            {inter ? <th className="text-right">IGST</th> : (<><th className="text-right">CGST</th><th className="text-right">SGST</th></>)}
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.sku} className="border-b border-neutral-200 align-top">
              <td className="py-2">
                {l.name}, {l.variantLabel}
                <span className="block text-xs text-neutral-500">{l.sku}</span>
              </td>
              <td>{l.hsnCode}</td>
              <td className="text-right">{l.qty}</td>
              <td className="text-right">{fmt(l.taxableP)}</td>
              <td className="text-right">{pct(l.gstRateBps)}</td>
              {inter ? <td className="text-right">{fmt(l.igstP)}</td> : (<><td className="text-right">{fmt(l.cgstP)}</td><td className="text-right">{fmt(l.sgstP)}</td></>)}
              <td className="text-right">{fmt(l.gross)}</td>
            </tr>
          ))}
          {chargeSplit && (
            <tr className="border-b border-neutral-200">
              <td className="py-2">Shipping and other charges</td>
              <td />
              <td />
              <td className="text-right">{fmt(chargeSplit.taxableP)}</td>
              <td className="text-right">18%</td>
              {inter ? <td className="text-right">{fmt(chargeSplit.igstP)}</td> : (<><td className="text-right">{fmt(chargeSplit.cgstP)}</td><td className="text-right">{fmt(chargeSplit.sgstP)}</td></>)}
              <td className="text-right">{fmt(charges)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="py-3" colSpan={3}>Total</td>
            <td className="text-right">{fmt(o.pricing.taxableP)}</td>
            <td />
            {inter ? <td className="text-right">{fmt(o.pricing.igstP)}</td> : (<><td className="text-right">{fmt(o.pricing.cgstP)}</td><td className="text-right">{fmt(o.pricing.sgstP)}</td></>)}
            <td className="text-right text-base">{fmt(o.pricing.totalP)}</td>
          </tr>
        </tfoot>
      </table>
      {o.pricing.discountP > 0 && <p className="mt-2 text-neutral-600">Includes a discount of {fmt(o.pricing.discountP)}{o.pricing.couponCode ? ` (${o.pricing.couponCode})` : ""}, applied before tax.</p>}
      <p className="mt-4">
        <b>Amount in words:</b> {amountInWords(o.pricing.totalP)}
      </p>
      <p className="mt-1 text-neutral-600">Whether tax is payable on reverse charge: No</p>
      <footer className="mt-12 flex justify-between border-t border-neutral-300 pt-4 text-neutral-500">
        <span>Computer-generated invoice; no signature required.</span>
        <span>For {seller.legalName}</span>
      </footer>
    </main>
  );
}
