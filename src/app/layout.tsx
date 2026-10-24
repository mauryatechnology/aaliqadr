import type { Metadata, Viewport } from "next";
import { Cinzel, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/config/site";
import { env } from "@/env";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: Luxury Zodiac Perfumes, Crafted for Your Rashi`,
    template: `%s · ${site.name}`,
  },
  description:
    "Aaliqadr crafts twelve luxury Extrait de Parfum fragrances, one for every zodiac sign and Vedic rashi. 28% oil concentration for 12+ hour longevity. Made in India with rare botanicals.",
  applicationName: site.name,
  keywords: [
    "Aaliqadr",
    "Aaliqadr perfume",
    "Aaliqadr perfumes",
    "Aaliqadr luxury perfume",

    "perfume",
    "perfumes",
    "luxury perfume",
    "perfumes online",
    "perfumes for women",
    "perfumes for men",
    "perfumes for unisex",
    "perfumes for him",
    "perfumes for her",
    "perfumes for unisex",
    "luxury perfume India",
    "perfume online",
    "perfume shop",
    "perfume store",
    "perfume online India",
    "perfume shop India",
    "perfume store India",
    "zodiac perfume",
    "rashi perfume",
    "extrait de parfum",
    "long lasting perfume",
    "astrology fragrance",
    "perfume by zodiac sign",
    "rashi ke anusaar perfume",
    "perfume discovery set India",
    "birthday gift perfume",
    "elemental perfumes",
    "niche perfumery India",
  ],
  authors: [{ name: "Aaliqadr Parfums", url: site.url }],
  creator: site.name,
  publisher: site.legal.legalName,
  category: "Luxury Fragrance",
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: `${site.name}: Luxury Zodiac Perfumes & Extrait de Parfum`,
    description:
      "Twelve signatures, one for every rashi. Extrait de Parfum with 28% concentration made in India. Composed around element, planet and temperament.",
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name}: Luxury Zodiac Perfumes`,
    description: "Twelve signatures, one for every rashi. Extrait de Parfum crafted in India.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: site.obsidian,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${cinzel.variable} ${jakarta.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        {children}
        {/* Vercel serves these scripts only on its deployments; locally they just log load errors. */}
        {env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
