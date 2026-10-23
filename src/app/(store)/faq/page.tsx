import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { site } from "@/config/site";
import { faqLd, JsonLd } from "@/lib/jsonld";
import { getContent } from "@/server/queries/engagement";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Orders, shipping, fragrance care, gifting and returns at Aaliqadr.",
  alternates: { canonical: "/faq" },
};

/** FAQs from Admin › Content, grouped. */
export default async function FaqPage() {
  const { faqs } = await getContent();
  const groups = [...new Set(faqs.map((f) => f.group || "General"))];
  return (
    <>
      <PageHero eyebrow="Help" title="Questions, answered" />
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {faqs.length === 0 ? (
          <p className="text-muted">Our FAQs are being written. Meanwhile, <Link href="/contact" className="underline underline-offset-4">write to us</Link> or email {site.support.email}.</p>
        ) : (
          groups.map((g) => (
            <section key={g} className="mb-12">
              <h2 className="eyebrow mb-4">{g}</h2>
              <div className="flex flex-col divide-y divide-white/10">
                {faqs.filter((f) => (f.group || "General") === g).map((f) => (
                  <details key={f.id} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg [&::-webkit-details-marker]:hidden">
                      {f.question}
                      <ChevronDown className="size-4 shrink-0 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="text-muted pt-3 leading-relaxed whitespace-pre-line">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      {faqs.length > 0 && <JsonLd data={faqLd(faqs.map((f) => ({ question: f.question, answer: f.answer })))} />}
    </>
  );
}
