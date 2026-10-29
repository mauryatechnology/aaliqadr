import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ArrowRight, Phone } from "lucide-react";
import { site } from "@/config/site";
import { faqLd, JsonLd, breadcrumbLd } from "@/lib/jsonld";
import { getContent } from "@/server/queries/engagement";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Frequently Asked Questions & Atelier Knowledge | Aaliqadr",
  description: "Orders, 28% Extrait de Parfum formulations, shipping, fragrance care, gifting and returns at Aaliqadr.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | Aaliqadr",
    description: "Orders, shipping, fragrance care, gifting and returns at Aaliqadr.",
    url: "/faq",
    type: "website",
  },
};

export default async function FaqPage() {
  const { faqs } = await getContent();
  const groups = [...new Set(faqs.map((f) => f.group || "General"))];

  return (
    <div className="relative overflow-clip bg-[#060508] text-ivory">
      {/* ── 1. ULTRA-LUXURY BLACK HERO ── */}
      <section className="relative isolate flex min-h-[46vh] sm:min-h-[52vh] flex-col justify-center items-center overflow-clip pt-28 pb-14 sm:pt-36 sm:pb-18 text-center bg-[#060508]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute h-[500px] w-[500px] sm:h-[600px] sm:w-[600px] rounded-full bg-gold/[0.10] blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#C9A96E_1px,transparent_1px)] [background-size:72px_72px] opacity-15" />
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 sm:px-6">
          <Reveal>
            <p className="font-caps text-xs sm:text-[13px] tracking-[0.28em] text-gold font-medium mb-4 sm:mb-5 flex items-center justify-center gap-2">
              <span className="text-[9px]">✦</span>
              <span>ATELIER INQUIRIES · KNOWLEDGE & POLICIES</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Questions, Answered.{" "}
              <span className="italic font-light text-[#E0C892]">
                Understanding Aaliqadr.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 sm:mt-5 max-w-xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Essential knowledge regarding our 28% Extrait de Parfum formulations, zodiac alchemical pairings, shipping, and returns.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 2. WARM PARCHMENT WHITE SECTION: ACCORDION CARDS ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8">
          {faqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5A5046] text-sm mb-4">
                Our FAQs are being updated. In the meantime, please write to our concierge.
              </p>
              <Link
                href="/contact"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#C9A96E] bg-white px-6 py-2 font-caps text-xs uppercase tracking-[0.16em] text-[#73531F] font-semibold hover:bg-[#FAF7F2]"
              >
                <span>Contact Atelier Concierge</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-14">
              {groups.map((group, gIdx) => (
                <div key={group}>
                  <Reveal delay={gIdx * 0.05}>
                    <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#E8E2D5]">
                      <span className="size-1.5 rounded-full bg-[#73531F]" />
                      <h2 className="font-caps text-xs sm:text-sm tracking-[0.22em] text-[#73531F] font-semibold uppercase">
                        {group}
                      </h2>
                    </div>
                  </Reveal>

                  <div className="space-y-3.5">
                    {faqs
                      .filter((f) => (f.group || "General") === group)
                      .map((f, i) => (
                        <Reveal key={f.id} delay={0.04 * i}>
                          <details className="group rounded-2xl border border-[#E8E2D5] bg-white p-5 sm:p-6 transition-all duration-300 open:border-[#C9A96E] open:shadow-[0_8px_24px_rgba(23,19,15,0.05)]">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base sm:text-lg font-normal text-[#17130F] select-none [&::-webkit-details-marker]:hidden">
                              <span className="leading-snug">{f.question}</span>
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2] border border-[#E8E2D5] text-[#73531F] transition-transform duration-300 group-open:rotate-180">
                                <ChevronDown className="size-4" aria-hidden />
                              </span>
                            </summary>
                            <p className="pt-4 text-xs sm:text-sm text-[#5A5046] font-normal leading-relaxed whitespace-pre-line border-t border-[#F0EBE0] mt-4">
                              {f.answer}
                            </p>
                          </details>
                        </Reveal>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. DEEP OBSIDIAN BLACK SECTION: STILL HAVE QUESTIONS ── */}
      <section className="relative bg-[#060508] py-16 sm:py-20 text-ivory overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-white/10 bg-[#0E0C12] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <p className="font-caps text-[11px] uppercase tracking-[0.22em] text-gold font-medium">
                Personal Consultation
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-light text-ivory">
                Still have an unanswered question?
              </h3>
              <p className="text-xs sm:text-sm text-muted font-light max-w-xl">
                Our fragrance concierge is available on WhatsApp and telephone to answer questions about batch longevity, custom notes, or gifting.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <a
                href={`tel:${site.support.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-gold bg-gold px-6 py-2 font-caps text-xs uppercase tracking-[0.18em] text-obsidian font-semibold hover:bg-[#E5CB8C] transition-all"
              >
                <Phone className="size-3.5" />
                <span>Call Concierge</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-gold/30 bg-surface/80 px-5 py-2 font-caps text-xs uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold transition-all"
              >
                <span>Write to Us</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Frequently Asked Questions", path: "/faq" },
        ])}
      />
      {faqs.length > 0 && (
        <JsonLd
          data={faqLd(
            faqs.map((f) => ({
              question: f.question,
              answer: f.answer,
            }))
          )}
        />
      )}
    </div>
  );
}
