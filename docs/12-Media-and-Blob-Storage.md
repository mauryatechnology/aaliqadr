# 12 — Media & Vercel Blob Storage

## 1. Two stores, two asset classes

| Store | Env token | Access | Contents | Stored in DB as | Delivery |
|---|---|---|---|---|---|
| `aaliqadr-public` | `BLOB_READ_WRITE_TOKEN` | `public` | Product images & videos, journal covers, content images, approved review photos, OG bottle cut-outs | Full CDN **URL** + pathname | Browser → Blob CDN directly (or via `next/image`) |
| `aaliqadr-private` | `BLOB_PRIVATE_READ_WRITE_TOKEN` | `private` | Invoices, shipping labels, return evidence (photos/video), pending review photos, COD refund bank details (if ever uploaded) | **Pathname only** (never a URL) | `GET /api/files/...` → auth + ownership → **302 to a short-lived signed URL**, `Cache-Control: no-store` |

**Why separate stores:** a misconfigured upload can never make an invoice public, and lifecycle and cost tracking are per class. Vercel prices public and private stores the same; the difference is delivery cost.

**The lesson from the reference app:** routing reads of stored files *through a function* double-billed egress and bypassed the CDN (255 MB stored → 10 GB transferred). Public assets must be fetched directly from the CDN. Private assets use a redirect, so bytes still flow CDN → browser and never through our function.

## 2. Upload flow: client uploads (no function bandwidth)

Vercel function request bodies are capped (~4.5 MB) and server uploads incur Fast Data Transfer. **Client uploads** send the file browser → Blob directly; our function only issues a scoped token.

```
Browser (admin/customer)                  /api/upload (handleUpload)                    Vercel Blob
   │ upload(pathname, file, { handleUploadUrl: "/api/upload", clientPayload }) ─▶│
   │                                       onBeforeGenerateToken(pathname, clientPayload):
   │                                         • session + role check
   │                                         • kind → store, allowedContentTypes, maximumSizeInBytes
   │                                         • enforce pathname prefix (e.g. returns/{userId}/…)
   │                                         • addRandomSuffix: true
   │ ◀────────── scoped client token ────────│
   │ PUT file ──────────────────────────────────────────────────────────────────────────▶│
   │                                       onUploadCompleted({ blob, tokenPayload }) ◀────│ (callback)
   │                                         • insert media {pathname, url, size, ownerKind…}
```

| `kind` | Store | Types | Max size | Path prefix | Who |
|---|---|---|---|---|---|
| `product` | public | jpeg, png, webp, avif | 8 MB | `products/{productId}/` | admin |
| `product-video` | public | mp4, webm | 20 MB | `products/{productId}/video/` | admin |
| `content` | public | jpeg, png, webp, avif, svg (sanitised, admin only) | 8 MB | `content/` | staff+ |
| `review` | private (→ public on approval) | jpeg, png, webp | 8 MB | `reviews/{userId}/` | customer |
| `return-evidence` | private | jpeg, png, webp, mp4, mov, webm | 50 MB | `returns/{userId}/{returnId}/` | customer |
| `invoice`, `label` | private | pdf | 2 MB | `invoices/{fy}/`, `labels/` | server only (`put` from the server) |

`onUploadCompleted` is a callback from Vercel to our URL, so it doesn't fire on `localhost` without a tunnel. In development, use `ngrok` or record `media` from the client-side upload result (dev only).

## 3. Image pipeline & optimisation

**Masters in, web-ready out.** Product photography arrives as large masters, and storing them as-is wastes storage and transformation cost.

1. **Pre-upload in the browser:** `browser-image-compression` resizes to a **2400 px** long edge, WebP q≈0.85 (keeps enough resolution for zoom and retina), and strips EXIF. Typical result 250–600 KB.
2. **Blur placeholder:** generated in the browser at upload (16 px WebP → base64) and saved on `media.blurDataURL`. No server work.
3. **Delivery via `next/image`** (Vercel Image Optimization) with tight config to cap transformation count:

```ts
images: {
  formats: ["image/avif", "image/webp"],
  remotePatterns: [{ protocol: "https", hostname: "<store-id>.public.blob.vercel-storage.com", pathname: "/**" }], // exact host, no wildcard
  deviceSizes: [390, 640, 828, 1080, 1440, 1920],   // fewer sizes = fewer transformations
  imageSizes: [96, 160, 256, 384],
  qualities: [60, 75, 85],                           // Next 16 default is [75]; declare explicitly
  minimumCacheTTL: 2678400,                          // 31 days; blobs are immutable (random suffix)
}
```

- Transformations are billed per cache MISS (Hobby: 5K/month included; Pro: about $0.05 per 1K). A small catalogue × 6 widths × 2 formats ≈ a few thousand transformations per month **total**, so the cost is negligible as long as URLs are immutable and the TTL is long.
- **Never** change an image in place; upload a new one (new random-suffixed pathname). That keeps every cache valid forever.
- Videos are not optimised by Vercel. Encode before upload (H.264 MP4 + VP9/AV1 WebM, 720p, ≤ 2 MB, no audio track).
- OG images: generated by `next/og` and cached; they don't use the image optimiser.

## 4. Cache headers

| Asset | Header |
|---|---|
| Public blobs | Blob default `cacheControlMaxAge` set to **1 year** at upload (`cacheControlMaxAge: 31536000`), safe because pathnames are unique |
| `/_next/image` | `minimumCacheTTL` 31 days |
| Private signed redirect | `no-store` on the 302; signed URL TTL 5 min |
| Static assets (`/_next/static`) | Immutable (Next default) |

## 5. Deletion & orphan control

- `put` without `del` is a leak. Replacing or removing media calls `del(pathname)` **after** the DB update commits (`deleteMedia()` in `server/integrations/blob.ts`, the only module allowed to call Blob APIs).
- `media` registry: every blob has a row. The weekly script `blobs:sweep-orphans` lists blobs (paginated `list()`, which counts as advanced operations, so it runs weekly, not daily) and reports any without a `media` row older than 24 h. **Report-only by default**; `--apply` deletes.
- Return evidence and labels: retained 180 days after closure, then deleted by the cleanup cron. Invoices are retained 8 years (statutory).
- Rejected review photos are deleted immediately.

## 6. Cost model (see doc 13 for the full budget)

| Driver | Mitigation |
|---|---|
| Storage (GB-month) | Pre-compressed WebP masters; short retention for evidence |
| Advanced ops (uploads, `list`) | Client uploads only for real uploads; no `list()` in request paths; sweep weekly |
| Simple ops (cache misses, `head`) | Immutable URLs + 1-year cache → near-100 % hit ratio; avoid `head()` in hot paths |
| Blob data transfer | Served via `next/image` (optimised bytes); videos lazy with a poster and `preload="none"` |
| Dashboard browsing | Browsing the Blob dashboard counts as operations, so use the admin UI instead |

## 7. Failure handling

- An upload error shows a retry in the UI and leaves no `media` row (and no orphan if `onUploadCompleted` didn't fire; the sweep catches it if it did).
- Blob SDK typed errors (`BlobServiceNotAvailable`, `BlobServiceRateLimited`, `BlobStoreSuspendedError`) are surfaced as `UPSTREAM_UNAVAILABLE` and alert Sentry. There is no silent fallback to a different provider (a refused file must not be stored elsewhere).
- Hobby limits: exceeding them **blocks Blob for up to 30 days**. Production must be on Pro with spend management (doc 13).
