import { Suspense } from "react";
import { getSessionUser } from "@/server/auth";
import { getProductQuestions } from "@/server/queries/engagement";
import { faqLd, JsonLd } from "@/lib/jsonld";
import { Reveal } from "@/components/motion/Reveal";
import { AskQuestion } from "./AskQuestion";

/** Customer questions with the store's answers (plan.md §10.3); answered ones only, plus FAQ schema. */
export async function ProductQuestions({ productId, slug }: { productId: string; slug: string }) {
  const qs = await getProductQuestions(productId);
  return (
    <section id="questions" aria-labelledby="qa-title" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal className="mb-8 flex flex-col gap-3">
        <p className="eyebrow">Ask us</p>
        <h2 id="qa-title" className="font-display text-4xl">Questions & answers</h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Suspense fallback={null}>
          <AskBox productId={productId} slug={slug} />
        </Suspense>
        {qs.length === 0 ? (
          <p className="text-muted">No questions yet. Ask about longevity, layering, gifting, anything.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {qs.map((q) => (
              <li key={q.id} className="flex flex-col gap-2 py-5 first:pt-0">
                <p className="font-medium">Q: {q.question}</p>
                <p className="text-muted leading-relaxed"><span className="text-fg">A:</span> {q.answer}</p>
                <p className="text-xs text-muted">Asked by {q.name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {qs.length > 0 && <JsonLd data={faqLd(qs.map((q) => ({ question: q.question, answer: q.answer })))} />}
    </section>
  );
}

async function AskBox({ productId }: { productId: string; slug: string }) {
  const user = await getSessionUser();
  return <AskQuestion productId={productId} signedIn={!!user} />;
}
