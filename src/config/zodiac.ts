/**
 * Single source of truth for the 12 signs (docs/02). Themes live in code, not the database:
 * there are exactly twelve, they change rarely, and code keeps them typed and DB-free.
 * `scripts/generate-zodiac-css.ts` turns `theme` into CSS variables.
 */

export const ELEMENTS = ["fire", "earth", "air", "water"] as const;
export type Element = (typeof ELEMENTS)[number];

export const ZODIAC_SLUGS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;
export type ZodiacSlug = (typeof ZODIAC_SLUGS)[number];

export const SIGN_ACCENTS: Record<ZodiacSlug, string> = {
  aries: "#C4553A",
  taurus: "#B07A7A",
  gemini: "#D9C98A",
  cancer: "#A9B8C9",
  leo: "#D4A24C",
  virgo: "#8FA58A",
  libra: "#D9A5B3",
  scorpio: "#7A1F3D",
  sagittarius: "#B5652B",
  capricorn: "#5E6B66",
  aquarius: "#7E7BD9",
  pisces: "#8FB8C4",
};

export interface ZodiacTheme {
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  onPrimary: string;
  glow: string;
  gradient: [string, string, string];
}

export interface Note {
  name: string;
  family: string;
}

export interface ZodiacSign {
  slug: ZodiacSlug;
  index: number;
  name: string;
  rashi: string;
  glyph: string;
  /** [month 1-12, day] inclusive, Western tropical dates. */
  start: [number, number];
  end: [number, number];
  element: Element;
  modality: "cardinal" | "fixed" | "mutable";
  rulingPlanet: string;
  gemstone: string;
  traits: string[];
  compatible: ZodiacSlug[];
  fragrance: {
    name: string;
    slug: string;
    mood: string;
    tagline: string;
    intensity: 1 | 2 | 3 | 4 | 5;
    notes: { top: Note[]; heart: Note[]; base: Note[] };
  };
  theme: ZodiacTheme;
  ambient: "embers" | "petals" | "orbs" | "moon" | "sunrays" | "botanical" | "aurora" | "smoke" | "startrails" | "mountains" | "waves" | "lagoon";
}

const n = (name: string, family: string): Note => ({ name, family });

export const ZODIAC: Record<ZodiacSlug, ZodiacSign> = {
  aries: {
    slug: "aries", index: 1, name: "Aries", rashi: "Mesh", glyph: "♈", start: [3, 21], end: [4, 19],
    element: "fire", modality: "cardinal", rulingPlanet: "Mars", gemstone: "Red Coral",
    traits: ["Pioneer", "Courageous", "Impulsive", "Magnetic"],
    compatible: ["leo", "sagittarius", "gemini", "aquarius"],
    fragrance: {
      name: "Ember Crown", slug: "ember-crown-aries", mood: "Ignition", intensity: 5,
      tagline: "A spark of pink pepper and saffron that refuses to sit still",
      notes: {
        top: [n("Pink Pepper", "spicy"), n("Blood Orange", "citrus")],
        heart: [n("Saffron", "spicy"), n("Red Rose", "floral")],
        base: [n("Smoked Amber", "amber"), n("Cedar", "woody")],
      },
    },
    theme: { bg: "#12060A", surface: "#1E0B10", primary: "#C8102E", secondary: "#FF6B35", accent: "#E8B04A", text: "#FBEDE6", muted: "#C9A8A2", onPrimary: "#FFFFFF", glow: "#FF3D2E", gradient: ["#3A0A12", "#C8102E", "#FF6B35"] },
    ambient: "embers",
  },
  taurus: {
    slug: "taurus", index: 2, name: "Taurus", rashi: "Vrishabh", glyph: "♉", start: [4, 20], end: [5, 20],
    element: "earth", modality: "fixed", rulingPlanet: "Venus", gemstone: "Diamond",
    traits: ["Sensual", "Loyal", "Indulgent", "Patient"],
    compatible: ["virgo", "capricorn", "cancer", "pisces"],
    fragrance: {
      name: "Velvet Earth", slug: "velvet-earth-taurus", mood: "Comfort luxury", intensity: 4,
      tagline: "Rose absolute and tonka wrapped in suede, slow and sure",
      notes: {
        top: [n("Pear", "fruity"), n("Cardamom", "spicy")],
        heart: [n("Rose Absolute", "floral"), n("Iris", "powdery")],
        base: [n("Tonka", "gourmand"), n("Sandalwood", "woody"), n("Suede", "leather")],
      },
    },
    theme: { bg: "#0C120C", surface: "#152016", primary: "#3E7C4F", secondary: "#C9A9A6", accent: "#D4B483", text: "#F3EFE6", muted: "#B5B9A8", onPrimary: "#FFFFFF", glow: "#7FB685", gradient: ["#132417", "#3E7C4F", "#C9A9A6"] },
    ambient: "petals",
  },
  gemini: {
    slug: "gemini", index: 3, name: "Gemini", rashi: "Mithun", glyph: "♊", start: [5, 21], end: [6, 20],
    element: "air", modality: "mutable", rulingPlanet: "Mercury", gemstone: "Emerald",
    traits: ["Curious", "Witty", "Dual", "Social"],
    compatible: ["libra", "aquarius", "aries", "leo"],
    fragrance: {
      name: "Twin Breeze", slug: "twin-breeze-gemini", mood: "Spark", intensity: 2,
      tagline: "Bergamot and yuzu that change their mind, beautifully",
      notes: {
        top: [n("Bergamot", "citrus"), n("Yuzu", "citrus"), n("Mint", "aromatic")],
        heart: [n("Neroli", "floral"), n("Lemongrass", "aromatic")],
        base: [n("White Musk", "musk"), n("Vetiver", "woody")],
      },
    },
    theme: { bg: "#0F0E08", surface: "#1C1A10", primary: "#F2C230", secondary: "#9BD0E8", accent: "#E8E2C9", text: "#FFFBEA", muted: "#C9C3A6", onPrimary: "#1A1503", glow: "#FFE27A", gradient: ["#2B2810", "#F2C230", "#9BD0E8"] },
    ambient: "orbs",
  },
  cancer: {
    slug: "cancer", index: 4, name: "Cancer", rashi: "Kark", glyph: "♋", start: [6, 21], end: [7, 22],
    element: "water", modality: "cardinal", rulingPlanet: "Moon", gemstone: "Pearl",
    traits: ["Nurturing", "Intuitive", "Protective", "Nostalgic"],
    compatible: ["scorpio", "pisces", "taurus", "virgo"],
    fragrance: {
      name: "Moon Tide", slug: "moon-tide-cancer", mood: "Moonlit home", intensity: 2,
      tagline: "Sea salt and lotus under a quiet, silver moon",
      notes: {
        top: [n("Sea Salt", "aquatic"), n("White Peach", "fruity")],
        heart: [n("Lotus", "floral"), n("Jasmine Sambac", "floral")],
        base: [n("Ambrette", "musk"), n("Cashmere Musk", "musk")],
      },
    },
    theme: { bg: "#0A0D14", surface: "#141A26", primary: "#C7CED9", secondary: "#8FB7C9", accent: "#E6E2D8", text: "#F4F6FA", muted: "#AEB8C6", onPrimary: "#0E1420", glow: "#CFE3F2", gradient: ["#101828", "#8FB7C9", "#E6E2D8"] },
    ambient: "moon",
  },
  leo: {
    slug: "leo", index: 5, name: "Leo", rashi: "Simha", glyph: "♌", start: [7, 23], end: [8, 22],
    element: "fire", modality: "fixed", rulingPlanet: "Sun", gemstone: "Ruby",
    traits: ["Regal", "Generous", "Dramatic", "Warm"],
    compatible: ["aries", "sagittarius", "gemini", "libra"],
    fragrance: {
      name: "Solar Sovereign", slug: "solar-sovereign-leo", mood: "Spotlight", intensity: 5,
      tagline: "Golden amber and tuberose that walk in like they own the room",
      notes: {
        top: [n("Mandarin", "citrus"), n("Saffron", "spicy")],
        heart: [n("Tuberose", "floral"), n("Orange Blossom", "floral")],
        base: [n("Golden Amber", "amber"), n("Benzoin", "balsamic"), n("Labdanum", "amber")],
      },
    },
    theme: { bg: "#120C04", surface: "#1F1608", primary: "#D4A017", secondary: "#E86A17", accent: "#F6D58B", text: "#FFF7E6", muted: "#D6C29C", onPrimary: "#1F1400", glow: "#FFC24A", gradient: ["#2A1A05", "#D4A017", "#E86A17"] },
    ambient: "sunrays",
  },
  virgo: {
    slug: "virgo", index: 6, name: "Virgo", rashi: "Kanya", glyph: "♍", start: [8, 23], end: [9, 22],
    element: "earth", modality: "mutable", rulingPlanet: "Mercury", gemstone: "Emerald",
    traits: ["Precise", "Grounded", "Thoughtful", "Pure"],
    compatible: ["taurus", "capricorn", "cancer", "scorpio"],
    fragrance: {
      name: "Quiet Harvest", slug: "quiet-harvest-virgo", mood: "Clarity", intensity: 3,
      tagline: "Fig leaf, iris and clean vetiver: nothing out of place",
      notes: {
        top: [n("Green Fig Leaf", "green"), n("Chamomile", "aromatic")],
        heart: [n("Iris", "powdery"), n("Wheat Accord", "gourmand")],
        base: [n("Vetiver", "woody"), n("Hinoki", "woody"), n("Clean Musk", "musk")],
      },
    },
    theme: { bg: "#0E0F0B", surface: "#191B14", primary: "#7A8B5C", secondary: "#B79F7C", accent: "#DCD3BE", text: "#F2F0E8", muted: "#B9B8A8", onPrimary: "#10140A", glow: "#A7B98A", gradient: ["#1C2016", "#7A8B5C", "#DCD3BE"] },
    ambient: "botanical",
  },
  libra: {
    slug: "libra", index: 7, name: "Libra", rashi: "Tula", glyph: "♎", start: [9, 23], end: [10, 22],
    element: "air", modality: "cardinal", rulingPlanet: "Venus", gemstone: "Opal",
    traits: ["Balanced", "Romantic", "Aesthetic", "Diplomatic"],
    compatible: ["gemini", "aquarius", "leo", "sagittarius"],
    fragrance: {
      name: "Harmony Veil", slug: "harmony-veil-libra", mood: "Grace", intensity: 2,
      tagline: "Peony and lychee held in perfect, airy balance",
      notes: {
        top: [n("Lychee", "fruity"), n("Pink Grapefruit", "citrus")],
        heart: [n("Peony", "floral"), n("Violet", "floral"), n("Rose", "floral")],
        base: [n("White Amber", "amber"), n("Sheer Woods", "woody")],
      },
    },
    theme: { bg: "#100B12", surface: "#1C1420", primary: "#E3A6C0", secondary: "#A9B8E8", accent: "#F1D7C8", text: "#FCF3F6", muted: "#CDB6C4", onPrimary: "#2A1220", glow: "#F2BCD4", gradient: ["#2A1A2E", "#E3A6C0", "#A9B8E8"] },
    ambient: "aurora",
  },
  scorpio: {
    slug: "scorpio", index: 8, name: "Scorpio", rashi: "Vrishchik", glyph: "♏", start: [10, 23], end: [11, 21],
    element: "water", modality: "fixed", rulingPlanet: "Mars & Pluto", gemstone: "Red Coral",
    traits: ["Intense", "Mysterious", "Transformative", "Loyal"],
    compatible: ["cancer", "pisces", "virgo", "capricorn"],
    fragrance: {
      name: "Noir Abyss", slug: "noir-abyss-scorpio", mood: "Seduction", intensity: 5,
      tagline: "Oud, dark rose and leather from somewhere far below the surface",
      notes: {
        top: [n("Black Plum", "fruity"), n("Black Pepper", "spicy")],
        heart: [n("Dark Rose", "floral"), n("Leather", "leather")],
        base: [n("Oud", "woody"), n("Patchouli", "earthy"), n("Incense", "resinous")],
      },
    },
    theme: { bg: "#0A0507", surface: "#16090E", primary: "#C2264F", secondary: "#2B0F3A", accent: "#B08D57", text: "#F2E6EA", muted: "#C2A7B0", onPrimary: "#FFFFFF", glow: "#A3133F", gradient: ["#07030A", "#2B0F3A", "#6E0E2A"] },
    ambient: "smoke",
  },
  sagittarius: {
    slug: "sagittarius", index: 9, name: "Sagittarius", rashi: "Dhanu", glyph: "♐", start: [11, 22], end: [12, 21],
    element: "fire", modality: "mutable", rulingPlanet: "Jupiter", gemstone: "Yellow Sapphire",
    traits: ["Adventurous", "Optimistic", "Philosophical", "Free"],
    compatible: ["aries", "leo", "libra", "aquarius"],
    fragrance: {
      name: "Wanderflame", slug: "wanderflame-sagittarius", mood: "Expedition", intensity: 4,
      tagline: "Cinnamon, davana and tobacco leaf for the long road",
      notes: {
        top: [n("Grapefruit", "citrus"), n("Juniper", "aromatic")],
        heart: [n("Cinnamon", "spicy"), n("Cardamom", "spicy"), n("Davana", "fruity")],
        base: [n("Tobacco Leaf", "tobacco"), n("Guaiac Wood", "woody")],
      },
    },
    theme: { bg: "#0E0814", surface: "#1A1024", primary: "#8A5BC7", secondary: "#E07A3F", accent: "#E6C27A", text: "#F6EEFB", muted: "#C6B4D6", onPrimary: "#FFFFFF", glow: "#9E6BDB", gradient: ["#1C0E2C", "#6B3FA0", "#E07A3F"] },
    ambient: "startrails",
  },
  capricorn: {
    slug: "capricorn", index: 10, name: "Capricorn", rashi: "Makar", glyph: "♑", start: [12, 22], end: [1, 19],
    element: "earth", modality: "cardinal", rulingPlanet: "Saturn", gemstone: "Blue Sapphire",
    traits: ["Ambitious", "Disciplined", "Timeless", "Reserved"],
    compatible: ["taurus", "virgo", "scorpio", "pisces"],
    fragrance: {
      name: "Summit Oud", slug: "summit-oud-capricorn", mood: "Authority", intensity: 5,
      tagline: "Black tea, cypress and oud: built to last, like you",
      notes: {
        top: [n("Bergamot", "citrus"), n("Black Tea", "aromatic")],
        heart: [n("Cypress", "woody"), n("Iris Root", "powdery")],
        base: [n("Oud", "woody"), n("Leather", "leather"), n("Vetiver", "woody")],
      },
    },
    theme: { bg: "#0B0C0A", surface: "#151713", primary: "#5E7A6A", secondary: "#6B5440", accent: "#A8A29A", text: "#EEEDE8", muted: "#B3B2AA", onPrimary: "#FFFFFF", glow: "#5E7A6A", gradient: ["#0F130F", "#2F3E36", "#6B5440"] },
    ambient: "mountains",
  },
  aquarius: {
    slug: "aquarius", index: 11, name: "Aquarius", rashi: "Kumbh", glyph: "♒", start: [1, 20], end: [2, 18],
    element: "air", modality: "fixed", rulingPlanet: "Saturn & Uranus", gemstone: "Amethyst",
    traits: ["Visionary", "Independent", "Eccentric", "Humane"],
    compatible: ["gemini", "libra", "aries", "sagittarius"],
    fragrance: {
      name: "Electric Aether", slug: "electric-aether-aquarius", mood: "Future", intensity: 3,
      tagline: "Ozonic ginger and violet leaf, like air before a storm",
      notes: {
        top: [n("Aldehydes", "aldehydic"), n("Ginger", "spicy"), n("Ozonic Accord", "aquatic")],
        heart: [n("Violet Leaf", "green"), n("Lavender", "aromatic")],
        base: [n("Ambroxan", "amber"), n("Mineral Musk", "musk")],
      },
    },
    theme: { bg: "#060B14", surface: "#0E1626", primary: "#2E8BFF", secondary: "#7DF9FF", accent: "#C0C8D8", text: "#EEF5FF", muted: "#A9B8CF", onPrimary: "#04101F", glow: "#4FA8FF", gradient: ["#08132B", "#2E8BFF", "#7DF9FF"] },
    ambient: "waves",
  },
  pisces: {
    slug: "pisces", index: 12, name: "Pisces", rashi: "Meen", glyph: "♓", start: [2, 19], end: [3, 20],
    element: "water", modality: "mutable", rulingPlanet: "Jupiter & Neptune", gemstone: "Yellow Sapphire",
    traits: ["Dreamy", "Empathetic", "Artistic", "Spiritual"],
    compatible: ["cancer", "scorpio", "taurus", "capricorn"],
    fragrance: {
      name: "Dream Lagoon", slug: "dream-lagoon-pisces", mood: "Reverie", intensity: 3,
      tagline: "Water lily and driftwood drifting through a soft vanilla haze",
      notes: {
        top: [n("Water Lily", "floral"), n("Pear", "fruity")],
        heart: [n("Magnolia", "floral"), n("Sea Fennel", "aquatic")],
        base: [n("Driftwood", "woody"), n("Ambergris Accord", "amber"), n("Soft Vanilla", "gourmand")],
      },
    },
    theme: { bg: "#06100F", surface: "#0E1C1B", primary: "#3FB8AF", secondary: "#9C8CD9", accent: "#D8F1EC", text: "#EFFBF9", muted: "#A9C9C4", onPrimary: "#04201E", glow: "#66D9CF", gradient: ["#0A2422", "#3FB8AF", "#9C8CD9"] },
    ambient: "lagoon",
  },
};

export const SIGNS: ZodiacSign[] = ZODIAC_SLUGS.map((s) => ZODIAC[s]);

export const ELEMENT_INFO: Record<Element, { label: string; signs: ZodiacSlug[]; scent: string; collectionSlug: string }> = {
  fire: { label: "Fire", signs: ["aries", "leo", "sagittarius"], scent: "Bold, spicy and warm", collectionSlug: "fire-signs" },
  earth: { label: "Earth", signs: ["taurus", "virgo", "capricorn"], scent: "Woody, rich and grounded", collectionSlug: "earth-signs" },
  air: { label: "Air", signs: ["gemini", "libra", "aquarius"], scent: "Light, floral and airy", collectionSlug: "air-signs" },
  water: { label: "Water", signs: ["cancer", "scorpio", "pisces"], scent: "Aquatic, deep and sensual", collectionSlug: "water-signs" },
};

export function isZodiacSlug(value: string): value is ZodiacSlug {
  return (ZODIAC_SLUGS as readonly string[]).includes(value);
}
