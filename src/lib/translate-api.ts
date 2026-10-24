/**
 * Free Google Translate Public API integration (Zero API Key required).
 * Uses Google's official gtx translation endpoint for fast text translations.
 */
export async function translateText(text: string, targetLang: string, sourceLang = "en"): Promise<string> {
  if (!text || targetLang === "en") return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return text;
    }

    const data = await res.json();
    // Google returns nested arrays: [[["Translated", "Original", ...]]]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translatedParts = data[0].map((item: unknown) => (Array.isArray(item) ? item[0] : "")).join("");
      return translatedParts || text;
    }
    return text;
  } catch {
    return text;
  }
}
