import "server-only";
import { amazonRequest } from "./client";
import { getAmazonShippingConfig } from "./config";
import {
  fromAmazonPurchaseResponse,
  fromAmazonRatesResponse,
  fromAmazonTrackingResponse,
  sanitizeRawMeta,
  toAmazonRatesRequest,
  type OrderLike,
} from "./mapper";
import type {
  GetRatesResult,
  IShippingProvider,
  LabelDocumentResult,
  PackageInput,
  PurchaseResult,
  TrackingResult,
} from "./types";

export class AmazonShippingService implements IShippingProvider {
  public readonly name = "amazon_shipping";

  /**
   * Request dynamic shipping rates and services for an order parcel.
   */
  async getRates(order: OrderLike, pkg: PackageInput): Promise<GetRatesResult> {
    const config = getAmazonShippingConfig();
    const requestPayload = toAmazonRatesRequest(order, pkg, config);

    const rawResponse = await amazonRequest<Record<string, unknown>>("/shipping/v2/shipments/rates", {
      method: "POST",
      body: requestPayload,
    });

    return fromAmazonRatesResponse(rawResponse);
  }

  /**
   * Purchase a shipment using a previously obtained requestToken and selected rateId.
   */
  async purchaseShipment(requestToken: string, rateId: string): Promise<PurchaseResult> {
    const purchasePayload = {
      requestToken,
      rateId,
      requestedDocumentSpecification: {
        format: "PNG",
        size: {
          width: 4,
          length: 6,
          unit: "INCH",
        },
        dpi: 300,
        pageLayout: "DEFAULT",
        needFileJoining: false,
        requestedDocumentTypes: ["LABEL"],
      },
    };

    const rawResponse = await amazonRequest<Record<string, unknown>>("/shipping/v2/shipments", {
      method: "POST",
      body: purchasePayload,
    });

    return fromAmazonPurchaseResponse(rawResponse);
  }

  /**
   * Retrieves the shipping label document from Amazon SP-API.
   */
  async getLabel(shipmentId: string, packageClientReferenceId?: string): Promise<LabelDocumentResult> {
    const query: Record<string, string> = {
      format: "PNG",
      dpi: "300",
    };
    if (packageClientReferenceId) {
      query.packageClientReferenceId = packageClientReferenceId;
    }

    const rawResponse = await amazonRequest<Record<string, unknown>>(
      `/shipping/v2/shipments/${encodeURIComponent(shipmentId)}/documents`,
      {
        method: "GET",
        query,
      },
    );

    const payload = (rawResponse.payload as Record<string, unknown>) || rawResponse;
    const detail = (payload.packageDocumentDetail ||
      (Array.isArray(payload.packageDocumentDetails) ? payload.packageDocumentDetails[0] : null) ||
      payload) as Record<string, unknown>;

    const docs = Array.isArray(detail?.packageDocuments)
      ? (detail.packageDocuments as Array<Record<string, unknown>>)
      : Array.isArray(payload.packageDocuments)
        ? (payload.packageDocuments as Array<Record<string, unknown>>)
        : [];

    const labelDoc = docs.find((d) => String(d.type).toUpperCase() === "LABEL") || docs[0];

    if (!labelDoc || typeof labelDoc.contents !== "string" || !labelDoc.contents) {
      throw new Error(`No label document contents found in Amazon response for shipment ${shipmentId}`);
    }

    return {
      shipmentId,
      trackingId: String(detail?.trackingId || payload.trackingId || ""),
      packageClientReferenceId: detail?.packageClientReferenceId ? String(detail.packageClientReferenceId) : undefined,
      format: String(labelDoc.format || "PNG"),
      contentsBase64: labelDoc.contents,
      rawMeta: sanitizeRawMeta(rawResponse),
    };
  }

  /**
   * Queries real-time carrier tracking status and event history for a tracking number.
   */
  async getTracking(trackingId: string, carrierId?: string): Promise<TrackingResult> {
    const query: Record<string, string> = {
      trackingId,
    };
    if (carrierId) {
      query.carrierId = carrierId;
    }

    const rawResponse = await amazonRequest<Record<string, unknown>>("/shipping/v2/tracking", {
      method: "GET",
      query,
    });

    return fromAmazonTrackingResponse(rawResponse);
  }
}

export const amazonShippingService = new AmazonShippingService();
