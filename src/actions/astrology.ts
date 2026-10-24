"use server";

export interface ExternalAstrologyData {
  source: string;
  panchang?: {
    nakshatra: string;
    nakshatraIndex: number;
    tithi: string;
    paksha: string;
    sunrise: string;
    sunset: string;
  };
  horoscope?: {
    luckyColor: string;
    luckyNumber: number;
    prediction: string;
  };
}

/**
 * Calls public, keyless external Vedic Astrology APIs with timeout and safe fallback.
 */
export async function fetchExternalAstrologyAction(params: {
  date: string; // YYYY-MM-DD
  lat?: number;
  lng?: number;
  signSlug?: string;
}): Promise<{ ok: boolean; data?: ExternalAstrologyData }> {
  const lat = params.lat ?? 28.6139; // default New Delhi
  const lng = params.lng ?? 77.209;
  const date = params.date;

  const result: ExternalAstrologyData = {
    source: "External Vedic API (Keyless)",
  };

  try {
    // 1. Fetch Panchang & Nakshatra from keyless Public Vedic Ephemeris
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const panchangUrl = `https://kundlidost-api-833851802975.asia-south1.run.app/api/panchang/public?lat=${lat}&lng=${lng}&date=${date}`;
    const pRes = await fetch(panchangUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    }).catch(() => null);

    clearTimeout(timeout);

    if (pRes && pRes.ok) {
      const pData = await pRes.json();
      if (pData?.nakshatra) {
        result.panchang = {
          nakshatra: pData.nakshatra,
          nakshatraIndex: pData.nakshatraIndex ?? 0,
          tithi: `Tithi ${pData.tithiNumber ?? ""}`,
          paksha: pData.paksha ?? "",
          sunrise: pData.sunrise ?? "",
          sunset: pData.sunset ?? "",
        };
      }
    }

    // 2. Fetch daily horoscope from keyless Vedika Sandbox
    if (params.signSlug) {
      const hController = new AbortController();
      const hTimeout = setTimeout(() => hController.abort(), 3000);

      const hUrl = `https://api.vedika.io/sandbox/astrology/horoscope/${params.signSlug.toLowerCase()}`;
      const hRes = await fetch(hUrl, {
        signal: hController.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }).catch(() => null);

      clearTimeout(hTimeout);

      if (hRes && hRes.ok) {
        const hData = await hRes.json();
        if (hData?.data) {
          result.horoscope = {
            luckyColor: hData.data.luckyColor ?? "",
            luckyNumber: hData.data.luckyNumber ?? 0,
            prediction: hData.data.prediction ?? "",
          };
        }
      }
    }

    return { ok: true, data: result };
  } catch {
    return { ok: false };
  }
}

/**
 * Server Action for Google Translate Public API.
 * Free, zero API key required, runs server-side to avoid browser CORS restrictions.
 */
export async function translateWithGoogleAction(
  text: string,
  targetLang: string
): Promise<{ ok: boolean; translated: string }> {
  if (!text || targetLang === "en") {
    return { ok: true, translated: text };
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { ok: false, translated: text };
    }

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translatedParts = data[0]
        .map((item: unknown) => (Array.isArray(item) ? item[0] : ""))
        .join("");
      return { ok: true, translated: translatedParts || text };
    }
    return { ok: false, translated: text };
  } catch {
    return { ok: false, translated: text };
  }
}
