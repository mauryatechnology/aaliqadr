import "server-only";
import { getAmazonShippingConfig } from "./config";
import { getLwaAccessToken, invalidateLwaToken } from "./authService";

export interface AmazonApiError {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export class AmazonShippingError extends Error {
  public status: number;
  public code: string;
  public requestId?: string;
  public details?: unknown;

  constructor(err: AmazonApiError) {
    super(err.message || `Amazon SP-API Error (${err.code || err.status})`);
    this.name = "AmazonShippingError";
    this.status = err.status;
    this.code = err.code;
    this.requestId = err.requestId;
    this.details = err.details;
  }
}

/**
 * Normalizes Amazon SP-API error payloads to a standard format.
 */
function normalizeError(status: number, headers: Headers, bodyText: string): AmazonApiError {
  const requestId = headers.get("x-amzn-requestid") || headers.get("x-amz-request-id") || undefined;
  try {
    const json = JSON.parse(bodyText);
    const errors = json.errors || json.Errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      return {
        status,
        code: first.code || `HTTP_${status}`,
        message: first.message || first.description || "Amazon API error",
        requestId,
        details: errors,
      };
    }
    if (json.message || json.Message) {
      return {
        status,
        code: json.code || `HTTP_${status}`,
        message: json.message || json.Message,
        requestId,
        details: json,
      };
    }
  } catch {
    // If not JSON, use raw text
  }

  return {
    status,
    code: `HTTP_${status}`,
    message: bodyText ? bodyText.slice(0, 300) : `HTTP ${status} response from Amazon`,
    requestId,
  };
}

/**
 * Resilient HTTP client wrapper for Amazon SP-API Shipping v2.
 * - Injects auth and business id headers
 * - Auto-retries 401 with refreshed token
 * - Exponential backoff on 429 and 5xx (max 3 retries)
 * - Never prints tokens or secrets
 */
export async function amazonRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const config = getAmazonShippingConfig();
  const method = options.method || (options.body ? "POST" : "GET");
  const timeoutMs = options.timeoutMs ?? 15000;

  // Build target URL
  let fullUrl = `${config.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  if (options.query) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.query)) {
      if (val !== undefined && val !== null) {
        searchParams.set(key, String(val));
      }
    }
    const qStr = searchParams.toString();
    if (qStr) {
      fullUrl += `${fullUrl.includes("?") ? "&" : "?"}${qStr}`;
    }
  }

  const maxRetries = 3;
  let attempt = 0;
  let hasRefreshedAuth = false;

  while (attempt <= maxRetries) {
    const token = await getLwaAccessToken();

    const headers: Record<string, string> = {
      "x-amz-access-token": token,
      "x-amzn-shipping-business-id": config.businessId,
      Accept: "application/json",
    };

    let serializedBody: string | undefined = undefined;
    if (options.body && method !== "GET") {
      headers["Content-Type"] = "application/json";
      serializedBody = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: serializedBody,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        // Successful response
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return (await response.json()) as T;
        }
        return (await response.text()) as unknown as T;
      }

      // Handle 401 Unauthorized once by refreshing the token
      if (response.status === 401 && !hasRefreshedAuth) {
        invalidateLwaToken();
        hasRefreshedAuth = true;
        attempt++;
        continue;
      }

      // Check if retryable (429 Rate Limit or 5xx Server Error)
      const isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
      if (isRetryable && attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Non-retryable error
      const errorText = await response.text();
      const normalized = normalizeError(response.status, response.headers, errorText);
      throw new AmazonShippingError(normalized);
    } catch (err: unknown) {
      if (err instanceof AmazonShippingError) {
        throw err;
      }

      const isNetworkOrTimeout =
        err instanceof Error &&
        (err.name === "TimeoutError" ||
          err.name === "AbortError" ||
          err.message.includes("fetch failed") ||
          err.message.includes("network"));

      if (isNetworkOrTimeout && attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 5000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw err;
    }
  }

  throw new Error(`Amazon API request exceeded maximum attempts (${maxRetries})`);
}
