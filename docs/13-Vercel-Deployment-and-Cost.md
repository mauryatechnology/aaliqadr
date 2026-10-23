# 13 — Vercel Deployment, Operations & Cost Efficiency

## 1. Plan choice

| | Hobby | **Pro (required for production)** |
|---|---|---|
| Commercial use | **Not allowed** (Fair Use Policy: non-commercial personal use only) | ✔ |
| Price | Free | $20 / deploying seat / month, includes monthly usage credit, then on-demand |
| Function duration | 300 s max | 300 s default, up to 800 s |
| Cron | 100 jobs, **once per day** max | 100 jobs, any frequency (we need every 15 min) |
| Blob over limit | Blocked for up to 30 days | Billed on demand |
| Spend management | — | ✔ alerts + auto-pause webhook |

**Decision:** develop on Hobby or Pro previews; **production on Pro** with one deploying seat. Others can be added as viewer/billing seats as needed.

## 2. Project configuration

| Setting | Value |
|---|---|
| Framework | Next.js (auto) |
| Node | 22.x |
| Function region | **`bom1` (Mumbai)**, same region as Atlas `ap-south-1` |
| Fluid compute | Enabled (default): instance reuse, shared DB pool, Active-CPU billing |
| Build | `next build` (Turbopack); `prebuild` runs `env:check` + `zodiac:css` (generate theme CSS from config) |
| Ignored build step | Skip if only `docs/**` or `*.md` changed (`git diff --quiet HEAD^ HEAD -- . ':!docs' ':!*.md'`) |
| Deployment protection | Vercel Authentication on Preview deployments |
| Domains | `aaliqadr.com` (primary), `www` → 308 to apex |
| Environments | Production (live keys, prod DB), Preview (test keys, staging DB), Development (local) |
| Skew protection | On (old clients keep hitting matching server actions during deploys) |

`vercel.json`:

```json
{
  "regions": ["bom1"],
  "crons": [
    { "path": "/api/cron/release-reservations", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/reconcile-payments",   "schedule": "0 21 * * *" },
    { "path": "/api/cron/stock-alerts",         "schedule": "30 4 * * *" },
    { "path": "/api/cron/birthday-coupons",     "schedule": "0 3 1 * *" },
    { "path": "/api/cron/cleanup",              "schedule": "0 22 * * 0" }
  ]
}
```
(Cron schedules are UTC: `0 21 * * *` = 02:30 IST.)

## 3. Release pipeline

```
feature branch → PR → GitHub Actions: typecheck · lint · unit · integration (mongodb-memory-server) · build · Playwright (against Preview URL) · Lighthouse CI budgets
              → Vercel Preview (test keys, staging DB) → review
merge to main → Vercel Production build
              → post-deploy job: `npm run db:sync-indexes` against prod (GitHub Action with a prod-scoped secret)
              → smoke test: /api/health, home, one product, add-to-cart
              → Instant Rollback available from the Vercel dashboard if anything fails
```

DB schema changes must be **backward compatible** for one release (expand → migrate → contract), because Skew Protection keeps old code alive briefly.

## 4. Scheduled jobs

| Job | Schedule | Work | Cost note |
|---|---|---|---|
| `release-reservations` | every 15 min | Rescue paid / release unpaid `pending_payment` (doc 07 §7) | Exits after one indexed count when nothing is due: ~96 tiny invocations/day |
| `reconcile-payments` | daily | Razorpay 48 h captured vs orders; Shiprocket tracking poll for orders stuck > 3 days without a scan | — |
| `stock-alerts` | daily | Back-in-stock emails (batched) | — |
| `birthday-coupons` | monthly (1st) | Birthday-month coupons for consented users (v1.1) | — |
| `cleanup` | weekly | Expired evidence blobs, stale carts (TTL handles most), stock ledger reconciliation, orphan blob report | `list()` is an advanced op, hence weekly |

All cron routes check `Authorization: Bearer ${CRON_SECRET}`, are idempotent, process in batches with a time budget (stop at 80 % of `maxDuration`), and log a summary.

Optional: **Upstash QStash** for exact delayed jobs (e.g. "release this reservation in 30 min", "send pending-payment reminder in 20 min") if 15-minute granularity isn't enough.

## 5. Cost model

### 5.1 Main cost drivers on Vercel (Fluid compute pricing)

| Resource | How we keep it low |
|---|---|
| **Function invocations & Active CPU** | Catalogue pages are prerendered/PPR, so most traffic is CDN hits with zero invocations. Dynamic holes are small; search is client-side; pincode checks are Redis-cached |
| **ISR / cache writes** | Tag-targeted revalidation only (`product:{slug}`), never `revalidatePath('/')` blanket; stock badge is a separate short-lived cached query, so sales don't rewrite product pages |
| **Image Optimization** | Few `deviceSizes`, 3 `qualities`, 31-day TTL, immutable URLs (doc 12) |
| **Fast Data Transfer** | AVIF/WebP, small JS budgets, lazy video, fonts subset |
| **Blob** | Client uploads, compressed masters, immutable public URLs, weekly sweep |
| **Edge requests / bots** | Vercel Firewall bot protection, robots rules for faceted URLs, rate limits |

### 5.2 Estimated monthly bill (India launch scale)

Assumptions: 50,000 sessions/month, ~4 pages/session, 600 orders/month, 100 products' worth of media (~1.5 GB).

| Service | Tier | Est. monthly (USD) | Notes |
|---|---|---|---|
| Vercel Pro | 1 seat | $20 | Usage at this scale is mostly covered by the included credit; set the spend cap at $50 |
| MongoDB Atlas | Flex at launch → **M10** at scale | ~$8–30 (Flex) / ~$60 (M10) | M10 recommended before peak (backups, PITR, no throttling). *Verify current Atlas pricing for ap-south-1* |
| Upstash Redis | Free / pay-as-you-go | $0–5 | Rate limiting + pincode cache + Shiprocket token |
| Vercel Blob | Pro on-demand | < $3 | ~1.5 GB storage, high cache hit |
| Resend | Free → Pro | $0–20 | Free tier covers ~3k emails/mo (verify) |
| MSG91 SMS | Pay per SMS | ~₹0.20–0.30/SMS | OTP + order updates |
| Sentry | Developer (free) | $0 | 5k errors/mo |
| Razorpay | Per transaction | ~2 % + GST of GMV | Not infrastructure, but the largest variable cost |
| Shiprocket | Per shipment | ₹70–120/shipment | Recovered via shipping fee / margin |
| **Infra total** | | **≈ $30–110 / month** (₹2.5k–9k) | Scales mostly with traffic, not with catalogue |

### 5.3 Spend guardrails
- Vercel Spend Management: notify at 50/80/100 % of the budget; auto-pause webhook disabled for production (we'd rather pay than go offline), but an alert is sent to the owner's phone.
- Usage dashboard reviewed weekly during the first month after launch, then monthly.
- Atlas billing alert at a threshold; Upstash monthly budget cap.

## 6. Observability & alerts (operational)

| Signal | Tool | Alert |
|---|---|---|
| Unhandled errors | Sentry | New issue → email/Slack; payment/webhook errors are **P1** |
| Webhook failures | Sentry + structured logs | Any 5xx on `/api/webhooks/*` |
| Uptime | Better Stack / UptimeRobot on `/api/health`, `/`, a product page | 2 consecutive failures |
| Core Web Vitals | Vercel Speed Insights | p75 LCP > 2.5 s for 24 h |
| Stuck orders | `release-reservations` summary | > 0 "paid-after-cancel" events |
| Stock drift | weekly reconcile | Any drift |
| Cost | Vercel spend management | 80 % of budget |

Logs: `console` JSON lines with `reqId`, `orderId`, and event names, viewable in Vercel Logs; optional log drain to Better Stack/Axiom on Pro.

## 7. Disaster recovery

| Scenario | Response |
|---|---|
| Bad deploy | Vercel Instant Rollback (< 1 min) |
| Data corruption | Atlas point-in-time restore (M10+) to a new cluster → verify → swap `MONGODB_URI` |
| Razorpay outage | COD remains; banner "Online payments temporarily unavailable" via the settings flag |
| Shiprocket outage | Orders still accepted; ETA hidden; shipments queued |
| Region outage | Accept downtime (single-region by design at this scale); documented manual failover to `sin1` + Atlas multi-region is a v2 option |
| Leaked secret | Rotate in the provider → update the Vercel env → redeploy; playbook in doc 06 |

RPO ≤ 5 min (Atlas continuous backup), RTO ≤ 2 h.
