import { site } from "@/config/site";
import { formatPrice } from "@/lib/money";

export type PolicySlug = "shipping" | "returns" | "privacy" | "terms" | "grievance";
export interface PolicyText {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

/**
 * DRAFT policy text derived from docs/08 §2 and docs/14. Must be reviewed by a lawyer before
 * launch. Admins publish edited, versioned copies from Content › Policies; these are the defaults.
 */
const RAW: Record<PolicySlug, { title: string; summary: string; sections: [string, string][] }> = {
  shipping: {
    title: "Shipping Policy",
    summary: "How and when your fragrance reaches you.",
    sections: [
      ["Where we ship", "We currently ship across India to serviceable pincodes. Check delivery to your pincode on any product page."],
      [
        "Charges",
        `Shipping is free on orders above ${formatPrice(site.freeShippingAboveP)}. Below that, a weight-based charge is shown before you pay.`,
      ],
      [
        "Dispatch & delivery",
        "Orders placed before 2 pm IST are usually dispatched the next working day. Delivery typically takes 3–7 working days depending on your location.",
      ],
      [
        "Why surface shipping",
        "Perfume contains alcohol and is classed as a flammable liquid for transport, so we ship it by road with leak-proof, cushioned packaging.",
      ],
    ],
  },
  returns: {
    title: "Returns, Refunds & Cancellation",
    summary:
      "Perfume is a personal-care product, so opened bottles cannot be returned. We always make it right if something arrives damaged or wrong.",
    sections: [
      [
        "Damaged, leaked or wrong item",
        "Raise a request within 48 hours of delivery with an unboxing video and photos of the box, bottle and shipping label. We will send a replacement or refund.",
      ],
      ["Opened products", "For hygiene reasons, opened or used products cannot be returned."],
      [
        "Cancellations",
        "You can cancel free of charge until your order is handed to the courier. Prepaid orders are refunded to the original payment method.",
      ],
      ["Refund timelines", "Refunds are initiated within 48 hours of approval and usually reflect in 5–7 bank working days."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary: "What we collect, why, and the choices you have under the Digital Personal Data Protection Act, 2023.",
    sections: [
      [
        "What we collect",
        "Your name, contact details and delivery address to fulfil orders; payment is processed by our payment partner and we never see your card or UPI details.",
      ],
      [
        "Your birth date",
        "The Find My Sign tool works entirely in your browser: we do not receive or store the date you enter. If you add a birth date to your account, it is optional, encrypted, and used only for birthday offers you consent to.",
      ],
      ["Marketing", "We send offers only if you opt in, separately for email, SMS and WhatsApp. You can withdraw consent at any time."],
      [
        "Your rights",
        "You may access, correct or erase your personal data and raise a grievance with us or the Data Protection Board of India.",
      ],
    ],
  },
  terms: {
    title: "Terms of Use",
    summary: "The terms that apply when you use this website and buy from us.",
    sections: [
      ["Prices", "All prices are in Indian Rupees and inclusive of all taxes. The price charged is the one shown at checkout."],
      [
        "Astrology",
        "Our zodiac fragrances are inspired by astrological tradition. They are perfumes, and we make no claims about their effect on fortune, health or well-being.",
      ],
      ["Product use", "For external use only. Flammable: keep away from heat and flame. Patch-test if you have sensitive skin."],
    ],
  },
  grievance: {
    title: "Grievance Redressal",
    summary: "As required by the Consumer Protection (E-Commerce) Rules, 2020.",
    sections: [
      ["Grievance officer", "Name, designation and contact details will be published here before launch."],
      ["Timelines", "We acknowledge every complaint within 48 hours and resolve it within one month."],
      ["Seller", `${site.legal.legalName}, ${site.legal.address}.`],
    ],
  },
};

/** Built-in policy text, used until a version is published from the admin. */
export const DEFAULT_POLICIES = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k, { title: v.title, summary: v.summary, sections: v.sections.map(([heading, body]) => ({ heading, body })) }]),
) as Record<PolicySlug, PolicyText>;

export const POLICY_SLUGS = Object.keys(RAW) as PolicySlug[];
