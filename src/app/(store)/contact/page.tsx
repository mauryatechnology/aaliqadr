import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Customer care for ${site.name}: orders, deliveries, damaged items and fragrance advice.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Customer care" title="We're here to help" />
      <div className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-6">
        <div className="surface grid grid-cols-1 gap-6 p-8 sm:grid-cols-2">
          <div>
            <h2 className="eyebrow mb-2">Call or WhatsApp</h2>
            <a href={`tel:${site.support.phone.replace(/\s/g, "")}`} className="font-display hover:text-gold text-2xl">
              {site.support.phone}
            </a>
            <p className="text-muted mt-1 text-sm">{site.support.hours}</p>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Registered office</h2>
            <p className="text-muted text-sm leading-relaxed">
              {site.legal.legalName}
              <br />
              {site.legal.address}
            </p>
          </div>
        </div>
        <p className="text-muted mt-8 text-sm">
          Damaged or leaked on arrival? Please raise it within 48 hours of delivery with an unboxing video. See our{" "}
          <Link href="/policies/returns" className="text-fg underline underline-offset-4">
            returns policy
          </Link>
          . Complaints can also be escalated to our{" "}
          <Link href="/policies/grievance" className="text-fg underline underline-offset-4">
            grievance officer
          </Link>
          .
        </p>
      </div>
    </>
  );
}
