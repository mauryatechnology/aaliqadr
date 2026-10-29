import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getOrderForViewer } from "@/server/queries/account";
import { OrderDetails } from "@/components/orders/OrderDetails";
import { OrderClaims } from "@/components/orders/OrderClaims";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Order Details & Dispatch Tracking | Aaliqadr",
  description: "View your order details, delivery tracking and invoice.",
  robots: { index: false, follow: false },
};

export default function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* 1. Grand Haute-Parfumerie Order Detail Hero */}
      <section className="grain relative isolate flex min-h-[38vh] sm:min-h-[44vh] flex-col justify-center items-center overflow-clip pt-28 pb-10 sm:pt-36 sm:pb-12 text-center">
        {/* Soft cosmic starlight radial nebula glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div
            className="absolute h-[480px] w-[480px] sm:h-[600px] sm:w-[600px] rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(201,169,110,0.18) 0%, rgba(45,70,120,0.10) 50%, transparent 70%)",
            }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow flex items-center justify-center gap-2 text-gold font-medium tracking-[0.28em] mb-3 sm:mb-4">
              <span className="text-[9px]">✦</span>
              <span>PATRON DISPATCH · HOUSE OF AALIQADR · ORDER RECORD</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl font-light leading-[1.05] tracking-tight text-ivory">
              Order Details &amp;{" "}
              <span className="italic font-light text-gold-soft">
                Tracking.
              </span>
            </h1>
          </Reveal>

          {/* Breadcrumb Back Link */}
          <Reveal delay={0.16} className="mt-5">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 border border-line bg-surface/50 px-4 py-1.5 font-caps text-[10px] uppercase tracking-[0.22em] text-ivory/80 transition-all duration-300 hover:border-gold hover:text-gold"
            >
              <ArrowLeft className="size-3 text-gold" /> Back to All Orders
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 2. Main Order Detail Body */}
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <Suspense
          fallback={
            <div className="h-96 border border-gold/15 bg-surface/50 animate-pulse" />
          }
        >
          <Content params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/account/orders/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const found = await getOrderForViewer(id, user);
  if (!found) notFound();
  return (
    <div className="space-y-8">
      <OrderDetails order={found.order} accessKey={found.accessKey} showKeyInLinks={false} />
      <OrderClaims order={found.order} />
    </div>
  );
}
