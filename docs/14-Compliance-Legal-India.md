# 14 — Compliance & Legal (India)

> This is an engineering checklist derived from public summaries of the law, **not legal advice**. Every item marked ⚖️ must be confirmed by Aaliqadr's CA or lawyer before launch.

## 1. Business registrations (pre-launch)

| Item | Why | Owner |
|---|---|---|
| Company/LLP or proprietorship, current account | Payment gateway KYC | Founder |
| **GST registration** | Mandatory for e-commerce sellers supplying goods interstate | CA |
| **Cosmetics manufacturing licence** (Drugs & Cosmetics Act / Cosmetics Rules 2020) held by the manufacturer; if importing, CDSCO import registration | Perfume is a cosmetic ⚖️. The existing lotion label shows an **Ayurvedic** licence (`AYU/MP/…`). Confirm which licence applies to each perfume (cosmetic vs Ayurvedic) and print the correct one on the label and the product page | Founder / manufacturer |
| **Legal Metrology packer/importer registration** (state Controller) | Pre-packaged commodities ⚖️ | Founder |
| Trademark application for "Aaliqadr" (classes 3, 35) | Brand protection | Lawyer |
| TRAI **DLT** registration (entity, sender ID, templates) | Any SMS (OTP, order updates) | Ops |
| Razorpay & Shiprocket KYC; DG/perfume acceptance confirmation | Payments & shipping | Ops |
| GS1 barcodes (optional) | GTIN for Google Merchant and marketplaces later | Ops |

## 2. Consumer Protection (E-Commerce) Rules, 2020: what the site must show

| Requirement | Where implemented |
|---|---|
| Legal name, principal geographic address, website, customer care contacts | Footer + Contact page + `settings` |
| **Grievance officer** name, designation, and contact; acknowledge a complaint within **48 hours**, resolve within **1 month** | `/policies/grievance`, footer link; contact form auto-acknowledgement email; admin SLA view |
| Total price, all charges (shipping, COD fee, gift wrap) shown **before** payment | Checkout breakdown (doc 07 §2) |
| Return, refund, exchange, warranty, delivery, and shipment terms in clear language | Policy pages, linked from product page and checkout |
| **Country of origin** for each product | Product page "Details & Legal" section (`product.legal.countryOfOrigin`) |
| Accepted payment methods, security of payment, cancellation charges | Checkout + FAQ |
| No manipulated pricing, no fake reviews; reviews must be genuine | Verified-purchase reviews only; no review incentives without disclosure |
| **No pre-ticked consent checkboxes** | All marketing checkboxes default unchecked |
| No cancellation charges unless the seller bears similar charges | Cancellation before dispatch is free |
| Ticket number for complaints | Contact form returns a ticket ID |

Also consider the **Guidelines for Prevention and Regulation of Dark Patterns, 2023**: no false urgency ("Only 2 left" must be real stock), no basket sneaking (gift wrap and samples are opt-in), no confirm-shaming, no drip pricing, and an easy subscription/newsletter cancellation. ⚖️

## 3. Legal Metrology (Packaged Commodities) Rules: online declarations

Rule 10 requires e-commerce listings to display the declarations that are on the package. The product page must show (all fields from `product.legal` and `variant`):

- Name and address of the **manufacturer** (and packer/importer if different)
- **Common or generic name** of the commodity (e.g. "Eau de Parfum")
- **Net quantity** (ml) per variant
- **MRP inclusive of all taxes** (`variant.mrpP`), and the selling price shown separately
- **Month and year of manufacture**, and best-before/expiry where applicable (from the batch; display "as printed on pack" plus the current batch's dates where feasible ⚖️)
- **Country of origin**
- **Consumer care** details (address, phone, email)
- Unit sale price (price per ml) for comparison ⚖️

The listing must match the physical label exactly. A mismatch is itself a violation. Admin product publish validation enforces non-empty legal fields.

## 4. Cosmetics labelling (BIS / Cosmetics Rules 2020)

- Ingredients list (INCI) and allergen declarations on the pack, reproduced on the product page.
- Warning statements (e.g. "Flammable. Keep away from fire. For external use only. Avoid contact with eyes.") on the product page and the pack.
- Batch number on the pack. The admin records `batchNo` for traceability.

## 5. GST & invoicing

| Item | Rule |
|---|---|
| HSN | 3303 (perfumes and toilet waters); sub-headings by spirit content (`33030050`, etc.) ⚖️ |
| Rate | **18 %** assumed; verify against the post-September-2025 CBIC rate schedule ⚖️ |
| Prices | MRP and selling prices are GST-inclusive; tax is back-calculated (doc 07 §2) |
| Place of supply | Customer's shipping state → CGST + SGST if it is **Madhya Pradesh (state code 23)**, the registration state of Aaliqadr Organics Pvt. Ltd.; otherwise IGST |
| Invoice | Consecutive serial per FY (≤ 16 chars, unique), mandatory fields per CGST Rule 46 (doc 07 §11) |
| Shipping/gift wrap/COD fee | Taxed as part of composite supply at the goods' rate ⚖️ |
| E-invoicing (IRN) | Only if aggregate turnover crosses the notified threshold; design the invoice service so an IRN provider can be plugged in later |
| TCS | Not applicable when selling on our own site (applies to marketplaces) |
| Returns/refunds | Credit note issued for refunds after invoicing (v1: generate a credit note PDF with its own serial `CN/2026-27/00001`) ⚖️ |
| Reports | GST sales register export for GSTR-1 (doc 11 §3.11) |

## 6. Digital Personal Data Protection Act 2023 & DPDP Rules 2025

The Rules were notified in **November 2025** with phased commencement: consent-manager provisions about **13 Nov 2026**; most operational obligations (notice, security safeguards, breach notification, retention, rights) about **13 May 2027**. Build for compliance from day one; it is far cheaper than retrofitting.

| Obligation | Implementation |
|---|---|
| **Notice** (itemised, plain language, English + optionally Hindi; links to withdraw consent, exercise rights, complain to the Data Protection Board) | `/policies/privacy` versioned; short notice at signup/checkout/newsletter with a link; `noticeVersion` stored in `consents` |
| **Consent** (free, specific, informed, unambiguous; separate per purpose) | Separate unticked toggles: marketing email, SMS, WhatsApp, DOB personalisation, analytics cookies. Transactional processing relies on the "legitimate use" of fulfilling the order |
| **Withdrawal as easy as giving** | Account → Privacy toggles; one-click unsubscribe in every marketing email |
| **Purpose limitation & minimisation** | DOB optional; we never ask for birth time/place (any Vedic moon calculator runs client-side and stores nothing) |
| **Security safeguards** | Doc 06: encryption, access control, logging, backups |
| **Breach notification** to affected users and the Data Protection Board without delay (two-stage report to the Board) | Incident playbook (doc 06) with templates; contacts list |
| **Retention / erasure** | Delete personal data when the purpose is served (inactive accounts after 3 years with a 48 h prior notice ⚖️); keep tax records for 8 years minimised |
| **Rights**: access, correction, erasure, grievance, nominate | Account → "Download my data" (JSON), edit profile, "Delete my account"; grievance contact |
| **Children's data** (< 18) | Not targeted. Age confirmation ("I am 18 or older") at account creation; no profiling or targeted ads to minors ⚖️ |
| **Processors** (Vercel, Atlas, Resend, MSG91, Razorpay, Shiprocket, Sentry) | Data processing agreements on file; list in the privacy policy |
| **Cross-border transfer** | Allowed except to notified restricted countries. Atlas and Vercel run in Mumbai; Sentry/Resend may process abroad, so disclose it |

Cookie banner: strictly necessary cookies (session, cart, CSRF, theme) need no consent; analytics and marketing pixels load only after opt-in.

## 7. Payments

- RBI tokenisation and card data rules are handled by Razorpay (we never see card data, so we are PCI-DSS SAQ-A).
- **Gift cards** (v1.1) are closed-system prepaid payment instruments. Closed-loop issuance by a merchant for its own goods is exempt from a PPI licence but must follow the rules (validity ≥ 1 year, no cash-out) ⚖️.
- Refund timelines in the policy must match operations (e.g. "refund initiated within 48 h of approval; 5–7 bank working days to reflect").

## 8. Content & claims

- No medical or therapeutic claims ("cures stress", "attracts wealth"). Astrology language is framed as inspiration ("crafted to celebrate Aries' fire").
- Advertising Standards Council of India (ASCI) code applies to marketing and influencer posts (#ad disclosures).
- Images of ingredients are illustrative and labelled as such where needed.

## 9. Policy pages to draft (owner: lawyer + founder)

1. Terms of Use
2. Privacy Policy (DPDP-aligned, processor list, rights, grievance, Board complaint route)
3. Shipping Policy (surface shipping for perfume, ETAs, serviceability, DG note)
4. Returns, Refunds & Cancellation Policy (doc 08 §2)
5. Grievance Redressal (officer, SLA, escalation)
6. Cookie Policy
7. Offer/Coupon Terms
8. Review Guidelines

Each page is a CMS `policy` entry with a `version`; changes are logged, and the version accepted is stored with consents and orders.
