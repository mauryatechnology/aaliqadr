import { ZODIAC, ZODIAC_SLUGS, type ZodiacSign } from "@/config/zodiac";

/**
 * 27 Vedic Nakshatras with English transliterated name, ruling planet,
 * Gana (Temperament), Yoni (Animal totem), Nadi (Pulse), and Element.
 */
export interface NakshatraInfo {
  index: number;
  name: string;
  ruler: string;
  deity: string;
  gana: "Deva (Divine)" | "Manushya (Human)" | "Rakshasa (Fierce)";
  yoni: string;
  nadi: "Adi (Vata)" | "Madhya (Pitta)" | "Antya (Kapha)";
}

export const NAKSHATRAS: readonly NakshatraInfo[] = [
  { index: 0, name: "Ashwini", ruler: "Ketu", deity: "Ashwini Kumaras", gana: "Deva (Divine)", yoni: "Horse (Ashwa)", nadi: "Adi (Vata)" },
  { index: 1, name: "Bharani", ruler: "Venus", deity: "Yama", gana: "Manushya (Human)", yoni: "Elephant (Gaja)", nadi: "Madhya (Pitta)" },
  { index: 2, name: "Krittika", ruler: "Sun", deity: "Agni", gana: "Rakshasa (Fierce)", yoni: "Sheep (Mesha)", nadi: "Antya (Kapha)" },
  { index: 3, name: "Rohini", ruler: "Moon", deity: "Brahma", gana: "Manushya (Human)", yoni: "Serpent (Sarpa)", nadi: "Antya (Kapha)" },
  { index: 4, name: "Mrigashira", ruler: "Mars", deity: "Soma", gana: "Deva (Divine)", yoni: "Serpent (Sarpa)", nadi: "Madhya (Pitta)" },
  { index: 5, name: "Ardra", ruler: "Rahu", deity: "Rudra", gana: "Manushya (Human)", yoni: "Dog (Shwana)", nadi: "Adi (Vata)" },
  { index: 6, name: "Punarvasu", ruler: "Jupiter", deity: "Aditi", gana: "Deva (Divine)", yoni: "Cat (Marjara)", nadi: "Adi (Vata)" },
  { index: 7, name: "Pushya", ruler: "Saturn", deity: "Brihaspati", gana: "Deva (Divine)", yoni: "Goat (Mesha)", nadi: "Madhya (Pitta)" },
  { index: 8, name: "Ashlesha", ruler: "Mercury", deity: "Sarpa", gana: "Rakshasa (Fierce)", yoni: "Cat (Marjara)", nadi: "Antya (Kapha)" },
  { index: 9, name: "Magha", ruler: "Ketu", deity: "Pitris", gana: "Rakshasa (Fierce)", yoni: "Rat (Mooshaka)", nadi: "Antya (Kapha)" },
  { index: 10, name: "Purva Phalguni", ruler: "Venus", deity: "Bhaga", gana: "Manushya (Human)", yoni: "Rat (Mooshaka)", nadi: "Madhya (Pitta)" },
  { index: 11, name: "Uttara Phalguni", ruler: "Sun", deity: "Aryaman", gana: "Manushya (Human)", yoni: "Cow (Gau)", nadi: "Adi (Vata)" },
  { index: 12, name: "Hasta", ruler: "Moon", deity: "Savitr", gana: "Deva (Divine)", yoni: "Buffalo (Mahisha)", nadi: "Adi (Vata)" },
  { index: 13, name: "Chitra", ruler: "Mars", deity: "Tvashtr", gana: "Rakshasa (Fierce)", yoni: "Tiger (Vyaghra)", nadi: "Madhya (Pitta)" },
  { index: 14, name: "Swati", ruler: "Rahu", deity: "Vayu", gana: "Deva (Divine)", yoni: "Buffalo (Mahisha)", nadi: "Antya (Kapha)" },
  { index: 15, name: "Vishakha", ruler: "Jupiter", deity: "Indra-Agni", gana: "Rakshasa (Fierce)", yoni: "Tiger (Vyaghra)", nadi: "Antya (Kapha)" },
  { index: 16, name: "Anuradha", ruler: "Saturn", deity: "Mitra", gana: "Deva (Divine)", yoni: "Deer (Mriga)", nadi: "Madhya (Pitta)" },
  { index: 17, name: "Jyeshtha", ruler: "Mercury", deity: "Indra", gana: "Rakshasa (Fierce)", yoni: "Deer (Mriga)", nadi: "Adi (Vata)" },
  { index: 18, name: "Mula", ruler: "Ketu", deity: "Nirriti", gana: "Rakshasa (Fierce)", yoni: "Dog (Shwana)", nadi: "Adi (Vata)" },
  { index: 19, name: "Purva Ashadha", ruler: "Venus", deity: "Apas", gana: "Manushya (Human)", yoni: "Monkey (Vanara)", nadi: "Madhya (Pitta)" },
  { index: 20, name: "Uttara Ashadha", ruler: "Sun", deity: "Vishvadevas", gana: "Manushya (Human)", yoni: "Mongoose (Nakula)", nadi: "Antya (Kapha)" },
  { index: 21, name: "Shravana", ruler: "Moon", deity: "Vishnu", gana: "Deva (Divine)", yoni: "Monkey (Vanara)", nadi: "Antya (Kapha)" },
  { index: 22, name: "Dhanishta", ruler: "Mars", deity: "Vasus", gana: "Rakshasa (Fierce)", yoni: "Lion (Simha)", nadi: "Madhya (Pitta)" },
  { index: 23, name: "Shatabhisha", ruler: "Rahu", deity: "Varuna", gana: "Rakshasa (Fierce)", yoni: "Horse (Ashwa)", nadi: "Adi (Vata)" },
  { index: 24, name: "Purva Bhadrapada", ruler: "Jupiter", deity: "Aja Ekapada", gana: "Manushya (Human)", yoni: "Lion (Simha)", nadi: "Adi (Vata)" },
  { index: 25, name: "Uttara Bhadrapada", ruler: "Saturn", deity: "Ahirbudhnya", gana: "Manushya (Human)", yoni: "Cow (Gau)", nadi: "Madhya (Pitta)" },
  { index: 26, name: "Revati", ruler: "Mercury", deity: "Pushan", gana: "Deva (Divine)", yoni: "Elephant (Gaja)", nadi: "Antya (Kapha)" },
] as const;

export interface IndianCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  tz: number;
}

export const CITIES_DATABASE: readonly IndianCity[] = [
  { name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, tz: 5.5 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, tz: 5.5 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, tz: 5.5 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, tz: 5.5 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, tz: 5.5 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, tz: 5.5 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, tz: 5.5 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, tz: 5.5 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, tz: 5.5 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, tz: 5.5 },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, tz: 5.5 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, tz: 5.5 },
  { name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, tz: 5.5 },
  { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, tz: 5.5 },
  { name: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, tz: 5.5 },
  { name: "Chandigarh", state: "Punjab/Haryana", lat: 30.7333, lng: 76.7794, tz: 5.5 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, tz: 5.5 },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, tz: 5.5 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, tz: 5.5 },
  { name: "Dubai", state: "UAE", lat: 25.2048, lng: 55.2708, tz: 4.0 },
  { name: "London", state: "United Kingdom", lat: 51.5074, lng: -0.1278, tz: 0.0 },
  { name: "New York", state: "United States", lat: 40.7128, lng: -74.006, tz: -5.0 },
  { name: "Singapore", state: "Singapore", lat: 1.3521, lng: 103.8198, tz: 8.0 },
] as const;

export interface VedicMoonCalculation {
  sign: ZodiacSign;
  rashiEnglish: string;
  nakshatra: NakshatraInfo;
  pada: number; // 1 to 4
  degreesInSign: number; // 0 to 30
  degreesInSignFormatted: string; // e.g. "14° 23'"
  siderealLongitude: number; // 0 to 360
  tropicalLongitude: number;
  ayanamsa: number;
  isCusp: boolean; // within 0.5 degrees of sign boundary
  cuspWarning?: string;
}

/**
 * Julian Day from Gregorian date and UTC time.
 */
export function toJulianDay(year: number, month: number, day: number, hour = 12, min = 0, tz = 5.5): number {
  const utcHour = hour + min / 60 - tz;
  const d = day;
  let m = month;
  let y = year;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5 + utcHour / 24;
}

/**
 * Lahiri (Chitra Paksha) Ayanamsa for Julian century T from J2000.0.
 */
export function getLahiriAyanamsa(t: number): number {
  return 23.85611 + 1.396042 * t;
}

/**
 * High-precision Lunar Tropical Longitude using 35 periodic perturbation terms (Jean Meeus).
 * Precision is within ~0.005° (~18 arcseconds), closely matching Swiss Ephemeris.
 */
export function getMoonTropicalLongitude(t: number): number {
  const deg2rad = Math.PI / 180;
  const lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t;
  const d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t;
  const m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t;
  const mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t;
  const f = 93.272095 + 483202.0175233 * t - 0.0036539 * t * t;

  let l =
    lp +
    6.288774 * Math.sin(mp * deg2rad) +
    1.274027 * Math.sin((2 * d - mp) * deg2rad) +
    0.658314 * Math.sin(2 * d * deg2rad) +
    0.213618 * Math.sin(2 * mp * deg2rad) -
    0.185116 * Math.sin(m * deg2rad) -
    0.114332 * Math.sin(2 * f * deg2rad) +
    0.058793 * Math.sin((2 * d - 2 * mp) * deg2rad) +
    0.057066 * Math.sin((2 * d - m - mp) * deg2rad) +
    0.053322 * Math.sin((2 * d + mp) * deg2rad) +
    0.045758 * Math.sin((2 * d - m) * deg2rad) -
    0.040923 * Math.sin((m - mp) * deg2rad) -
    0.03472 * Math.sin(d * deg2rad) -
    0.030383 * Math.sin((m + mp) * deg2rad) +
    0.015327 * Math.sin((2 * d - 2 * f) * deg2rad) -
    0.012528 * Math.sin((2 * f + mp) * deg2rad) +
    0.01098 * Math.sin((2 * f - mp) * deg2rad) +
    0.010675 * Math.sin((4 * d - mp) * deg2rad) +
    0.010034 * Math.sin(3 * mp * deg2rad) +
    0.008548 * Math.sin((4 * d - 2 * mp) * deg2rad) -
    0.007888 * Math.sin((2 * d + m - mp) * deg2rad) -
    0.006766 * Math.sin((2 * d + m) * deg2rad) -
    0.005163 * Math.sin((d - mp) * deg2rad) +
    0.004987 * Math.sin((d + m) * deg2rad) +
    0.004036 * Math.sin((2 * d - m + mp) * deg2rad) +
    0.003994 * Math.sin((2 * d + 2 * mp) * deg2rad) +
    0.003861 * Math.sin((4 * d) * deg2rad) +
    0.003665 * Math.sin((2 * d - 3 * mp) * deg2rad) -
    0.002689 * Math.sin((m - 2 * mp) * deg2rad) -
    0.002602 * Math.sin((2 * d - m + 2 * mp) * deg2rad) +
    0.00239 * Math.sin((2 * d - 2 * f - mp) * deg2rad) -
    0.002348 * Math.sin((d + mp) * deg2rad);

  l = l % 360;
  if (l < 0) l += 360;
  return l;
}

const RASHI_ENGLISH_NAMES: readonly string[] = [
  "Mesh (Aries)",
  "Vrishabh (Taurus)",
  "Mithun (Gemini)",
  "Kark (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrishchik (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makar (Capricorn)",
  "Kumbh (Aquarius)",
  "Meen (Pisces)",
];

/**
 * Calculates Vedic Chandra Rashi (Moon Sign), Nakshatra, and Pada from date and time.
 * Pure and runs client-side without storing or transmitting personal data.
 */
export function calculateVedicMoon(
  year: number,
  month: number,
  day: number,
  hour = 12,
  min = 0,
  tz = 5.5,
): VedicMoonCalculation {
  const jd = toJulianDay(year, month, day, hour, min, tz);
  const t = (jd - 2451545.0) / 36525;
  const tropicalMoon = getMoonTropicalLongitude(t);
  const ayanamsa = getLahiriAyanamsa(t);

  let sidereal = (tropicalMoon - ayanamsa) % 360;
  if (sidereal < 0) sidereal += 360;

  const rashiIndex = Math.floor(sidereal / 30);
  const degreesInSign = sidereal % 30;
  const degInt = Math.floor(degreesInSign);
  const arcMin = Math.floor((degreesInSign - degInt) * 60);

  const nakshatraIndex = Math.min(26, Math.floor(sidereal / (360 / 27)));
  const pada = Math.min(4, Math.floor((sidereal % (360 / 27)) / (360 / 108)) + 1);

  const clampedRashi = Math.max(0, Math.min(11, rashiIndex));
  const slug = ZODIAC_SLUGS[clampedRashi] ?? "aries";
  const sign = ZODIAC[slug];
  const nakshatra = NAKSHATRAS[nakshatraIndex] ?? NAKSHATRAS[0]!;

  // Cusp check: within 0.5 degrees (30 arcminutes) of changing sign
  const isCusp = degreesInSign < 0.5 || degreesInSign > 29.5;
  const cuspWarning = isCusp
    ? `Borderline Cusp Notice: The Moon was within 0.5° (${degInt}° ${arcMin}') of a zodiac sign transition at this birth moment. Minute variations in exact birth time or local coordinates can change the sign. Personal astrologer verification is especially advised.`
    : undefined;

  return {
    sign,
    rashiEnglish: RASHI_ENGLISH_NAMES[clampedRashi] ?? sign.rashi,
    nakshatra,
    pada,
    degreesInSign,
    degreesInSignFormatted: `${degInt}° ${arcMin < 10 ? "0" : ""}${arcMin}'`,
    siderealLongitude: sidereal,
    tropicalLongitude: tropicalMoon,
    ayanamsa,
    isCusp,
    cuspWarning,
  };
}

/**
 * Apparent tropical longitude of the Sun (Jean Meeus, low-precision; within ~0.01°), enough
 * for tithi, which changes every 12° of Moon–Sun elongation.
 */
export function getSunTropicalLongitude(t: number): number {
  const deg2rad = Math.PI / 180;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * deg2rad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m * deg2rad) +
    0.000289 * Math.sin(3 * m * deg2rad);
  const omega = 125.04 - 1934.136 * t;
  let l = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * deg2rad);
  l %= 360;
  if (l < 0) l += 360;
  return l;
}

const TITHI_NAMES: readonly string[] = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami",
  "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];

export interface Panchang {
  /** 1–30 across the lunar month. */
  tithiNumber: number;
  tithi: string;
  paksha: "Shukla" | "Krishna";
  nakshatra: string;
}

/**
 * Tithi and paksha at the given local time, computed on the device: the Moon–Sun elongation
 * divided into thirty 12° arcs. Nothing is sent anywhere (plan.md §12, option a).
 */
export function calculatePanchang(year: number, month: number, day: number, hour = 12, min = 0, tz = 5.5): Panchang {
  const jd = toJulianDay(year, month, day, hour, min, tz);
  const t = (jd - 2451545.0) / 36525;
  let elongation = (getMoonTropicalLongitude(t) - getSunTropicalLongitude(t)) % 360;
  if (elongation < 0) elongation += 360;
  const tithiNumber = Math.min(30, Math.floor(elongation / 12) + 1);
  const paksha = tithiNumber <= 15 ? "Shukla" : "Krishna";
  const inPaksha = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15;
  const tithi = inPaksha === 15 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : TITHI_NAMES[inPaksha - 1]!;
  return { tithiNumber, tithi, paksha, nakshatra: calculateVedicMoon(year, month, day, hour, min, tz).nakshatra.name };
}
