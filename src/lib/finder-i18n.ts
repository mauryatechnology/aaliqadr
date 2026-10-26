export type SupportedLang = "en" | "hi" | "ar" | "gu" | "ur" | "fr" | "de";

export interface FinderTranslations {
  eyebrow: string;
  heroTitle: string;
  vedicTab: string;
  westernTab: string;
  directTab: string;
  vedicHeading: string;
  vedicSubheading: string;
  dobLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  optionalLabel: string;
  placeSearchPlaceholder: string;
  personalizedFor: string;
  tobLabel: string;
  pobLabel: string;
  pickOnMapBtn: string;
  unknownTimeLabel: string;
  calculateBtn: string;
  calculatingBtn: string;
  privacyNote: string;
  disclaimer: string;
  westernHeading: string;
  westernSubheading: string;
  directHeading: string;
  directSubheading: string;
  moonSignLabel: string;
  birthStarLabel: string;
  rulingGrahaLabel: string;
  moonDegreesLabel: string;
  temperamentLabel: string;
  yoniLabel: string;
  nadiLabel: string;
  fragranceHeading: string;
  intensityLabel: string;
  topNotesLabel: string;
  heartNotesLabel: string;
  baseNotesLabel: string;
  discoverFragranceBtn: string;
  exploreHouseBtn: string;
  verifiedBadge: string;
}

/** English ships with the page; other languages load on demand (plan.md F6). */
export const FINDER_EN: FinderTranslations = {
    eyebrow: "Find Your Sign · Astrological Match",
    heroTitle: "Which fragrance is written for you?",
    vedicTab: "Vedic Moon Sign",
    westernTab: "Western Sun Sign",
    directTab: "Browse All 12 Signs",
    vedicHeading: "Find Your Vedic Moon Sign & Perfume",
    vedicSubheading: "In Indian Vedic astrology, your true sign is determined by the position of the Moon at your exact birth time. Enter your birth details below to discover your signature scent.",
    dobLabel: "Date of Birth *",
    nameLabel: "Your Full Name",
    namePlaceholder: "e.g., Rahul or Aanya",
    optionalLabel: "Optional",
    placeSearchPlaceholder: "Search any city, town, or state worldwide...",
    personalizedFor: "Specially formulated for",
    tobLabel: "Time of Birth",
    pobLabel: "Place of Birth (City / Coordinates)",
    pickOnMapBtn: "Pick on Map",
    unknownTimeLabel: "I do not know my exact birth time (Use 12:00 PM standard noon)",
    calculateBtn: "Calculate Vedic Moon Sign & Perfume Match",
    calculatingBtn: "Calculating Kundali & Verifying...",
    privacyNote: "🔒 Privacy First: All calculations run completely inside your local browser. Your personal birth data is never transmitted to or stored on any server.",
    disclaimer: "✦ Astrological Guidance Notice: Planetary positions and sign mappings are system-generated approximations based on astronomical ephemeris models. For formal Janam Kundali rituals, please verify with your personal astrologer or panditji.",
    westernHeading: "Find Your Western Sun Sign",
    westernSubheading: "Select your birth calendar date to discover the solar constellation active during your birth season.",
    directHeading: "Direct Zodiac & Rashi Selection",
    directSubheading: "Already know your Zodiac sign or Vedic Rashi? Select your constellation below to explore its signature Extrait de Parfum.",
    moonSignLabel: "Moon Sign (Rashi)",
    birthStarLabel: "Birth Star (Nakshatra)",
    rulingGrahaLabel: "Star Ruling Graha",
    moonDegreesLabel: "Moon Degrees",
    temperamentLabel: "Temperament (Gana)",
    yoniLabel: "Animal Totem (Yoni)",
    nadiLabel: "Constitution (Nadi)",
    fragranceHeading: "Your Astrological Signature Fragrance",
    intensityLabel: "Intensity:",
    topNotesLabel: "Top Notes",
    heartNotesLabel: "Heart Notes",
    baseNotesLabel: "Base Notes",
    discoverFragranceBtn: "Discover Fragrance",
    exploreHouseBtn: "Explore Sign House",
    verifiedBadge: "Calculated privately on your device",
  };

export async function loadFinderTranslations(lang: SupportedLang): Promise<FinderTranslations> {
  if (lang === "en") return FINDER_EN;
  const { FINDER_OTHER } = await import("./finder-i18n-langs");
  return FINDER_OTHER[lang] ?? FINDER_EN;
}

