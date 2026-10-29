import "server-only";
import { getAmazonShippingConfig } from "./config";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedToken: CachedToken | null = null;
let inFlightRefresh: Promise<string> | null = null;

/**
 * Returns a valid LWA access token.
 * Caches the token in memory until 5 minutes before expiry.
 * Ensures only a single refresh request is in flight at any given time.
 */
export async function getLwaAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  if (!forceRefresh && cachedToken && cachedToken.expiresAt - now > bufferMs) {
    return cachedToken.accessToken;
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const config = getAmazonShippingConfig();

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await fetch(config.lwaTokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LWA Token request failed with HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };

      if (!data.access_token) {
        throw new Error("LWA response did not include an access_token");
      }

      const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
      cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + expiresInSec * 1000,
      };

      return data.access_token;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/**
 * Clears the cached LWA token (e.g. after receiving a 401 Unauthorized from Amazon).
 */
export function invalidateLwaToken(): void {
  cachedToken = null;
}
