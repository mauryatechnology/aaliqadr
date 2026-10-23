import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/server/auth";
import { getOrderForViewer } from "@/server/queries/account";
import { PageHero } from "@/components/layout/PageHero";
import { OrderDetails } from "@/components/orders/OrderDetails";
import { OrderClaims } from "@/components/orders/OrderClaims";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

/** Order confirmation and status, reachable by the emailed link (with its key) or by the owner. */
export default function OrderPage({ params, searchParams }: PageProps<"/order/[id]">) {
  return (
    <>
      <PageHero eyebrow="Thank you" title="Your order" />
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <Content params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Content({ params, searchParams }: Pick<PageProps<"/order/[id]">, "params" | "searchParams">) {
  const [{ id }, sp, viewer] = await Promise.all([params, searchParams, getSessionUser()]);
  const key = typeof sp.k === "string" ? sp.k : undefined;
  const found = await getOrderForViewer(id, viewer, key);
  if (!found) notFound();
  return (
    <>
      <OrderDetails order={found.order} accessKey={found.accessKey} showKeyInLinks={!!key} />
      <OrderClaims order={found.order} accessKey={key} />
    </>
  );
}
