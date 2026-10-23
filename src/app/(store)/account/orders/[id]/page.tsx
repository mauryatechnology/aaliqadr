import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getOrderForViewer } from "@/server/queries/account";
import { PageHero } from "@/components/layout/PageHero";
import { OrderDetails } from "@/components/orders/OrderDetails";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <>
      <PageHero eyebrow="Your account" title="Order details">
        <Link href="/account" className="flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All orders
        </Link>
      </PageHero>
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <Content params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function Content({ params }: Pick<PageProps<"/account/orders/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const found = await getOrderForViewer(id, user);
  if (!found) notFound();
  return <OrderDetails order={found.order} accessKey={found.accessKey} showKeyInLinks={false} />;
}
