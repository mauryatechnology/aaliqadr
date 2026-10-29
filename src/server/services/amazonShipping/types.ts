export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: "INCH" | "CENTIMETER" | string;
}

export interface PackageWeight {
  value: number;
  unit: "POUND" | "KILOGRAM" | "GRAM" | "OUNCE" | string;
}

export interface MoneyValue {
  value: number;
  unit: string;
}

export interface AddressInfo {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
  countryCode: string;
  email?: string;
  phoneNumber?: string;
}

export interface ItemInfo {
  itemValue: MoneyValue;
  description: string;
  itemIdentifier: string;
  quantity: number;
  weight: PackageWeight;
}

export interface PackageInput {
  packageClientReferenceId?: string;
  dimensions: PackageDimensions;
  weight: PackageWeight;
  insuredValue?: MoneyValue;
  items?: ItemInfo[];
}

export interface AmazonRateItem {
  rateId: string;
  carrierId: string;
  carrierName: string;
  serviceId: string;
  serviceName: string;
  totalCharge?: MoneyValue;
  promise?: {
    deliveryWindow?: {
      receiveTime?: string;
      deliverTime?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GetRatesResult {
  requestToken: string;
  rates: AmazonRateItem[];
  rawMeta: Record<string, unknown>;
}

export interface PurchaseResult {
  shipmentId: string;
  trackingId?: string;
  carrierId?: string;
  packageClientReferenceId?: string;
  labelContentsBase64?: string;
  rawMeta: Record<string, unknown>;
}

export interface LabelDocumentResult {
  shipmentId: string;
  trackingId?: string;
  packageClientReferenceId?: string;
  format: string;
  contentsBase64: string;
  rawMeta: Record<string, unknown>;
}

export interface TrackingEventItem {
  code: string;
  time: Date;
  location?: string;
  description: string;
}

export interface TrackingResult {
  trackingId: string;
  carrierId?: string;
  currentStatus: string;
  events: TrackingEventItem[];
  rawMeta: Record<string, unknown>;
}

export interface IShippingProvider {
  name: string;
  getRates(order: unknown, pkg: PackageInput): Promise<GetRatesResult>;
  purchaseShipment(requestToken: string, rateId: string): Promise<PurchaseResult>;
  getLabel(shipmentId: string, packageClientReferenceId?: string): Promise<LabelDocumentResult>;
  getTracking(trackingId: string, carrierId?: string): Promise<TrackingResult>;
}
