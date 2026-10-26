# Aaliqadr: Final Pre-Launch Operational Checklist

**Status:** Codebase-level development is **100% Complete**.
- **Tests:** 137 unit and integration tests passing (`npm test`).
- **Linter & Typechecker:** Clean zero errors / zero warnings (`npm run lint && npm run typecheck`).
- **Production Build:** Next.js Turbopack build succeeds (`npm run build`).
- **First-load JS Bundle Budget:** All critical routes ≤ 170 KB gzip (`npm run budget` passes).

The remaining tasks below cannot be solved in code alone; they require owner accounts, third-party API credentials, DNS management, and business policy decisions.

---

## 1. Domain & Email Setup (DNS)

- [ ] **Transactional Email Provider Account:** Sign up for Resend (recommended), Postmark, or Amazon SES.
- [ ] **DNS Records:** Configure and verify domain DNS records for `aaliqadr.com`:
  - `TXT` record for SPF: `v=spf1 include:... ~all`
  - `CNAME` records for DKIM (provided by email service)
  - `TXT` record for DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@aaliqadr.com`
- [ ] **Set Environment Variables:** Update `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in production hosting (e.g., Vercel / Railway).
- [ ] **Test Email Delivery:** Send a test order confirmation and verify inbox placement (no spam flag).

---

## 2. Production Services & API Keys

- [ ] **Razorpay Live Credentials:**
  - Complete Razorpay KYC / activation.
  - Generate Live Key ID and Key Secret.
  - Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in production env.
  - Set Webhook URL in Razorpay Dashboard to `https://aaliqadr.com/api/webhooks/razorpay` (Events: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`).
- [ ] **Sentry Error Tracking:**
  - Create project on Sentry.io.
  - Add `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to production environment.
  - Configure alert routing to owner email / WhatsApp / Slack.
- [ ] **Licensed Map Tiles:**
  - Obtain API key from MapTiler, Stadia, or Carto (or Google Maps API key).
  - Add the licensed tile URL / key to `src/components/zodiac/MapLocationPicker.tsx` or env.

---

## 3. Database & Infrastructure

- [ ] **MongoDB Atlas Production Cluster:**
  - Enable Continuous Cloud Backups (Point-In-Time Restore / PITR).
  - Configure Atlas Network Access (IP allowlist or VPC peering for hosting provider).
  - Perform a 1-time test restore drill to verify backup snapshot integrity.
- [ ] **Cron Job Execution:**
  - Schedule automated triggers for:
    - `GET /api/cron/release-reservations` (every 10 minutes)
    - `GET /api/cron/catalog-schedule` (hourly or daily at 07:30 IST)
    - `GET /api/cron/media-sweep` (weekly, run with `?apply=1` to clean unreferenced images)
  - Set `CRON_SECRET` in headers: `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Git Security & Secrets Cleanup

- [ ] **Repository History Purge (Optional):**
  - Commit `1620787` in historical Git history contains the legacy staff seed credential that was rotated.
  - If desired, run `git filter-repo` to permanently scrub that commit from Git history and force-push to `main`.
- [ ] **GitHub Repository Settings:**
  - Enable Branch Protection on `main` (require status checks to pass before merging).
  - Enable Secret Scanning and Push Protection in GitHub Security settings.

---

## 5. Owner Business Policy Confirmations

Confirm the following 14 operational choices before turning the store public:

1. **Staff & Admin 2FA:** Set to optional; direct login enabled for all admin, owner, and staff roles without mandatory 2FA.
2. **Order Edits Window:** Addresses, phone numbers, and gift messages can only be edited before order status reaches `dispatched`.
3. **Customer Account Deletion:** Handled via GDPR/DPDP compliant request flow with a 30-day grace period.
4. **Admin UI Density:** Default is set to Compact (36px rows); each admin can toggle to Comfortable via their profile.
5. **Search Engine:** In-memory cached relevance engine with Hindi/Sanskrit rashi and note synonyms. Atlas Search migration scheduled once catalog exceeds 1,000 products.
6. **Guest Wishlist:** Stored in browser `localStorage` and automatically merged into customer account upon login.
7. **Delivery Estimates:** Initial launch uses zone-based SLAs configured in Admin › Settings (e.g. Metro 2-3 days, Rest of India 4-6 days). Shiprocket live tracking API to be connected when warehouse shipping contracts are active.
8. **Q&A Moderation:** Customer questions require admin approval before becoming public with FAQ schema.
9. **Site Languages:** Find My Sign supports English, Hindi, and Indian regional languages. Main storefront is English.
10. **Brand Typography:** Playfair Display + Plus Jakarta Sans + Cinzel (subsetted, WOFF2 preloaded).
11. **COD Verification:** Orders exceeding threshold or accounts with repeat return history require OTP / manual confirmation before dispatch.
12. **Tax & Invoicing:** Automatic HSN calculation with intra-state (CGST + SGST) vs inter-state (IGST) split based on warehouse state in Settings.
13. **Return Policy Window:** 7-day return/claim window for transit damage, verified with unboxing photo uploads.
14. **Orphan Media Cleanup:** Set to report-only mode initially; switch to automated deletion after 30 days of production operation.
