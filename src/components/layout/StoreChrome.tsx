import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { CelestialBackdrop } from "./CelestialBackdrop";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ParallaxRuntime } from "@/components/motion/ParallaxRuntime";
import { JsonLd, organizationLd } from "@/lib/jsonld";
import { AnnouncementBar } from "@/components/content/AnnouncementBar";
import { CartDrawerHost } from "@/components/cart/CartDrawerHost";
import { SearchHost } from "@/components/search/SearchHost";
import { getContent } from "@/server/queries/engagement";

/** Storefront frame: sky, header, footer and motion runtime. Used by (store) and the 404 page. */
export async function StoreChrome({ children }: { children: ReactNode }) {
  const { search } = await getContent();
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-full bg-gold px-4 py-2 text-obsidian focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <CelestialBackdrop />
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
      <CartDrawerHost />
      <SearchHost popular={search.popular} />
      <SmoothScroll />
      <ParallaxRuntime />
      <JsonLd data={organizationLd()} />
    </>
  );
}
