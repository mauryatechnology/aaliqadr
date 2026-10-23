import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Allowlist CSP (no nonce) so catalogue pages stay prerendered. See docs/06 §6.
// Dev only: React needs eval() for debugging, and localhost is plain http.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com",
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://vercel.com https://*.blob.vercel-storage.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  cacheLife: {
    // Catalogue: products, signs, collections. Invalidated on demand by tag.
    catalog: { stale: 300, revalidate: 3600, expire: 60 * 60 * 24 * 30 },
    // CMS content and journal.
    content: { stale: 300, revalidate: 86400, expire: 60 * 60 * 24 * 30 },
    // Stock badges: short enough to stay honest, long enough to absorb traffic.
    stock: { stale: 30, revalidate: 60, expire: 300 },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Exact Vercel Blob public store host goes here once the store exists, e.g.
      // { protocol: "https", hostname: "abc123.public.blob.vercel-storage.com", pathname: "/**" }
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
    ],
    localPatterns: [
      { pathname: "/brand/**", search: "" },
      { pathname: "/bottles/**", search: "" },
    ],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
    imageSizes: [96, 160, 256, 384],
    qualities: [60, 75, 85],
    minimumCacheTTL: 2678400,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Generated bottle artwork: unhashed filenames, so browsers revalidate daily; the CDN keeps them.
      {
        source: "/bottles/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" }],
      },
      // Share images are rendered on demand; let the CDN keep them for a day.
      {
        source: "/:path*/opengraph-image",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
