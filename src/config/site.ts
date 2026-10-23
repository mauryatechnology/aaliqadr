export const site = {
  name: "Aaliqadr",
  tagline: "A fragrance written in your stars",
  description:
    "Aaliqadr crafts twelve luxury Extrait de Parfum fragrances, one for every rashi. Find the scent written in your stars.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
  brandGold: "#C4A044",
  obsidian: "#0B0A0F",
  ivory: "#F5F0E6",
  // Public defaults from the existing product label; editable later via admin settings (docs/04 §4.16).
  legal: {
    legalName: "Aaliqadr Organics Pvt. Ltd.",
    city: "Bhopal",
    state: "Madhya Pradesh",
    stateCode: "23",
    country: "India",
    address: "12/B, Saeed Colony Rd, Housing Board Colony, Saeed Colony, Karond, Bhopal, Madhya Pradesh 462011",
    /** Printed on tax invoices. Fill in once GST registration is confirmed (docs/14 §1). */
    gstin: "",
  },
  support: {
    phone: "+91 89826 75004",
    email: "",
    hours: "Mon–Sat, 10 am – 7 pm IST",
  },
  freeShippingAboveP: 149900,
  social: {
    instagram: "",
    facebook: "",
    youtube: "",
  },
} as const;
