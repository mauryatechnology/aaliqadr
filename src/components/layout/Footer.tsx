import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/config/site";
import { getBusiness } from "@/server/queries/business";
import { SIGNS } from "@/config/zodiac";
import { MAIN_NAV, POLICY_NAV } from "./nav";
import { routes } from "@/lib/routes";

export async function Footer() {
  const b = await getBusiness();
  return (
    <footer className="relative border-t border-white/5 bg-obsidian text-ivory">
      <div className="mx-auto grid grid-cols-1 max-w-[1360px] gap-12 px-4 py-16 pb-28 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:pb-16">
        <div className="flex flex-col gap-5">
          <Logo variant="full" className="h-28 w-auto self-start" />
          <p className="max-w-xs text-sm leading-relaxed text-ivory/70">{site.description}</p>
        </div>
        <FooterCol title="Explore">
          {MAIN_NAV.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title="The Signs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {SIGNS.map((s) => (
              <FooterLink key={s.slug} href={routes.sign(s.slug)}>
                {s.name}
              </FooterLink>
            ))}
          </div>
        </FooterCol>
        <FooterCol title="Care">
          {POLICY_NAV.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
          <FooterLink href="/contact">Contact us</FooterLink>
        </FooterCol>
      </div>
      <div className="hairline" />
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-6 pb-24 text-xs text-ivory/55 sm:px-6 md:flex-row md:justify-between lg:pb-6">
        <p>
          © {site.name}. {b.legalName}, {b.city}, {b.state}, {site.legal.country}.
        </p>
        <p>Prices are inclusive of all taxes. Made in India.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="eyebrow mb-1">{title}</h2>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: React.ComponentProps<typeof Link>["href"]; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-ivory/75 transition-colors hover:text-gold">
      {children}
    </Link>
  );
}
