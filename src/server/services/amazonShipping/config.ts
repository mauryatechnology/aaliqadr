import "server-only";
import { env } from "@/env";

export interface AmazonShippingConfig {
  mode: "sandbox" | "production";
  baseUrl: string;
  lwaTokenUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  businessId: string;
  warehouse: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email: string;
    phone: string;
  };
  cronSchedule: string;
  currency: string;
  weightUnit: string;
  dimensionUnit: string;
  useSandboxSampleAddress: boolean;
}

/**
 * Validates and returns the Amazon Shipping configuration.
 * Fails fast with a clean, actionable error list if any required variable is missing.
 */
export function getAmazonShippingConfig(): AmazonShippingConfig {
  const missing: string[] = [];

  const mode = (env.SPAPI_MODE || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
  const baseUrl =
    env.SPAPI_BASE_URL ||
    (mode === "production"
      ? "https://sellingpartnerapi-na.amazon.com"
      : "https://sandbox.sellingpartnerapi-na.amazon.com");

  const lwaTokenUrl = env.LWA_TOKEN_URL || "https://api.amazon.com/auth/o2/token";
  const clientId = env.LWA_CLIENT_ID?.trim() || "";
  const clientSecret = env.LWA_CLIENT_SECRET?.trim() || "";
  const refreshToken = env.LWA_REFRESH_TOKEN?.trim() || "";
  const businessId = env.AMAZON_SHIPPING_BUSINESS_ID?.trim() || "AmazonShipping_US";

  if (!clientId) missing.push("LWA_CLIENT_ID");
  if (!clientSecret) missing.push("LWA_CLIENT_SECRET");
  if (!refreshToken) missing.push("LWA_REFRESH_TOKEN");

  const warehouseName = env.WAREHOUSE_NAME?.trim() || "";
  const warehouseLine1 = env.WAREHOUSE_ADDRESS_LINE1?.trim() || "";
  const warehouseCity = env.WAREHOUSE_CITY?.trim() || "";
  const warehouseState = env.WAREHOUSE_STATE?.trim() || "";
  const warehousePostalCode = env.WAREHOUSE_POSTAL_CODE?.trim() || "";
  const warehouseCountry = env.WAREHOUSE_COUNTRY?.trim() || "";
  const warehouseEmail = env.WAREHOUSE_EMAIL?.trim() || "";
  const warehousePhone = env.WAREHOUSE_PHONE?.trim() || "";

  if (!warehouseName) missing.push("WAREHOUSE_NAME");
  if (!warehouseLine1) missing.push("WAREHOUSE_ADDRESS_LINE1");
  if (!warehouseCity) missing.push("WAREHOUSE_CITY");
  if (!warehouseState) missing.push("WAREHOUSE_STATE");
  if (!warehousePostalCode) missing.push("WAREHOUSE_POSTAL_CODE");
  if (!warehouseCountry) missing.push("WAREHOUSE_COUNTRY");
  if (!warehouseEmail) missing.push("WAREHOUSE_EMAIL");
  if (!warehousePhone) missing.push("WAREHOUSE_PHONE");

  if (missing.length > 0) {
    throw new Error(
      `Amazon Shipping is not fully configured. Missing required environment variables:\n` +
        missing.map((k) => `  • ${k}`).join("\n") +
        `\nPlease fill these in your .env file.`,
    );
  }

  const currency = env.AMAZON_CURRENCY?.trim() || "USD";
  const weightUnit = env.AMAZON_WEIGHT_UNIT?.trim() || "POUND";
  const dimensionUnit = env.AMAZON_DIMENSION_UNIT?.trim() || "INCH";

  // Sample address is only allowed in sandbox mode
  const useSandboxSampleAddress =
    mode === "sandbox" &&
    String(env.AMAZON_SANDBOX_USE_SAMPLE_ADDRESS ?? "true").toLowerCase() === "true";

  return {
    mode,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    lwaTokenUrl,
    clientId,
    clientSecret,
    refreshToken,
    businessId,
    warehouse: {
      name: warehouseName,
      addressLine1: warehouseLine1,
      city: warehouseCity,
      state: warehouseState,
      postalCode: warehousePostalCode,
      country: warehouseCountry,
      email: warehouseEmail,
      phone: warehousePhone,
    },
    cronSchedule: env.TRACKING_CRON || "0 */2 * * *",
    currency,
    weightUnit,
    dimensionUnit,
    useSandboxSampleAddress,
  };
}
