import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { site } from "@/config/site";
import { breadcrumbLd, JsonLd, organizationLd } from "@/lib/jsonld";
import { getBusiness } from "@/server/queries/business";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Contact Atelier Concierge & Client Care | Aaliqadr",
  description: `Get in touch with Aaliqadr for order assistance, bespoke astrology fragrance consultations, delivery tracking, and corporate gifting. Call or WhatsApp ${site.support.phone}.`,
  keywords: [
    "aaliqadr contact",
    "aaliqadr customer care",
    "perfume consultation India",
    "zodiac perfume customer support",
    "luxury fragrance concierge",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Atelier Concierge | Aaliqadr",
    description: "We're here to help with orders, fragrance advice, and bespoke consultations.",
    url: "/contact",
    type: "website",
  },
};

export default async function ContactPage() {
  const b = await getBusiness();

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
              <span>ATELIER CONCIERGE · CLIENT CARE</span>
              <span className="text-[9px]">✦</span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[1.05] tracking-tight max-w-4xl text-ivory">
              Personal Concierge.{" "}
              <span className="italic font-light text-[#E0C892]">
                We&apos;re here to guide you.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-4 sm:mt-5 max-w-xl text-sm sm:text-base text-muted font-light leading-relaxed mx-auto">
              Direct assistance for order dispatches, astrological consultations, bespoke gift packaging, and patron inquiries.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 2. WARM PARCHMENT WHITE SECTION: CONTACT CARDS ── */}
      <section className="relative bg-[#FAF7F2] text-[#17130F] py-16 sm:py-24 border-y border-[#E8E2D5] overflow-hidden">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {/* Card 1: Direct Voice & WhatsApp */}
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_24px_rgba(23,19,15,0.05)] flex flex-col justify-between">
                <div>
                  <div className="size-11 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center mb-5 text-[#73531F]">
                    <Phone className="size-5" />
                  </div>
                  <p className="font-caps text-[11px] uppercase tracking-[0.22em] text-[#73531F] font-semibold mb-2">
                    Call & WhatsApp Concierge
                  </p>
                  <a
                    href={`tel:${b.supportPhone.replace(/\s/g, "")}`}
                    className="font-display text-2xl sm:text-3xl font-normal text-[#17130F] hover:text-[#73531F] transition-colors block mb-2"
                  >
                    {b.supportPhone}
                  </a>
                  <p className="text-xs text-[#5A5046] font-normal leading-relaxed">
                    Dedicated phone and WhatsApp support for orders, status updates, and custom astrological recommendations.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#F0EBE0] flex items-center gap-2 text-xs text-[#6A5E52]">
                  <Clock className="size-3.5 text-[#73531F]" />
                  <span>{site.support.hours}</span>
                </div>
              </div>
            </Reveal>

            {/* Card 2: Email & Written Inquiries */}
            <Reveal delay={0.1}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_24px_rgba(23,19,15,0.05)] flex flex-col justify-between">
                <div>
                  <div className="size-11 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center mb-5 text-[#73531F]">
                    <Mail className="size-5" />
                  </div>
                  <p className="font-caps text-[11px] uppercase tracking-[0.22em] text-[#73531F] font-semibold mb-2">
                    Electronic Mail
                  </p>
                  <a
                    href={`mailto:${site.support.email}`}
                    className="font-display text-xl sm:text-2xl font-normal text-[#17130F] hover:text-[#73531F] transition-colors block mb-2"
                  >
                    {site.support.email}
                  </a>
                  <p className="text-xs text-[#5A5046] font-normal leading-relaxed">
                    Write to our master blenders and support team. We reply within 24 hours on all business days.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#F0EBE0] flex items-center gap-2 text-xs text-[#6A5E52]">
                  <ShieldCheck className="size-3.5 text-[#73531F]" />
                  <span>Average response time: &lt; 4 business hours</span>
                </div>
              </div>
            </Reveal>

            {/* Card 3: Registered Office & Atelier */}
            <Reveal delay={0.15}>
              <div className="h-full rounded-2xl border border-[#E8E2D5] bg-white p-7 sm:p-8 shadow-[0_4px_24px_rgba(23,19,15,0.05)] flex flex-col justify-between">
                <div>
                  <div className="size-11 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center mb-5 text-[#73531F]">
                    <MapPin className="size-5" />
                  </div>
                  <p className="font-caps text-[11px] uppercase tracking-[0.22em] text-[#73531F] font-semibold mb-2">
                    Registered Atelier
                  </p>
                  <h3 className="font-display text-lg text-[#17130F] font-normal mb-1.5">
                    {b.legalName}
                  </h3>
                  <p className="text-xs text-[#5A5046] font-normal leading-relaxed whitespace-pre-line">
                    {b.address}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#F0EBE0] flex items-center gap-2 text-xs text-[#6A5E52]">
                  <span className="size-1.5 rounded-full bg-[#73531F]" />
                  <span>Handcrafted & macerated in India</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Assurance Notice */}
          <Reveal delay={0.2} className="mt-12">
            <div className="rounded-xl border border-[#E8E2D5] bg-[#F4EFE6] p-6 text-xs text-[#5A5046] leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <strong className="text-[#17130F] font-medium block mb-1">
                  Damaged or leaked flacon on delivery?
                </strong>
                Please notify us within 48 hours of delivery accompanied by an unboxing video. Review our{" "}
                <Link href="/policies/returns" className="text-[#17130F] underline underline-offset-4 font-medium hover:text-[#73531F]">
                  returns policy
                </Link>{" "}
                or contact our{" "}
                <Link href="/policies/grievance" className="text-[#17130F] underline underline-offset-4 font-medium hover:text-[#73531F]">
                  grievance officer
                </Link>
                .
              </div>
              <Link
                href="/faq"
                className="shrink-0 inline-flex items-center gap-1.5 font-caps text-[11px] uppercase tracking-[0.16em] text-[#73531F] font-semibold hover:text-[#17130F]"
              >
                <span>Read FAQs</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 3. DEEP OBSIDIAN BLACK SECTION: INQUIRY ASSURANCE ── */}
      <section className="relative bg-[#060508] py-16 sm:py-20 text-ivory overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-white/10 bg-[#0E0C12] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <p className="font-caps text-[11px] uppercase tracking-[0.22em] text-gold font-medium">
                Instant Assistance
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-light text-ivory">
                Looking for immediate answers?
              </h3>
              <p className="text-xs sm:text-sm text-muted font-light max-w-xl">
                Browse our comprehensive knowledge base covering perfume maceration, 28% Extrait de Parfum projection, and pan-India express delivery.
              </p>
            </div>
            <Link
              href="/faq"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-gold bg-gold px-6 py-2 font-caps text-xs uppercase tracking-[0.18em] text-obsidian font-semibold hover:bg-[#E5CB8C] transition-all shrink-0"
            >
              <span>Explore FAQs</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Contact Customer Care", path: "/contact" },
        ])}
      />
      <JsonLd data={organizationLd()} />
    </div>
  );
}
