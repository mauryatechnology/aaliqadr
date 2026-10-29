"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Box,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "./kit/Toaster";
import { Badge, btnPrimary, btnSecondary, FieldLabel, inputCls, type Tone } from "./ui";
import { CopyButton } from "./kit/Bits";

export interface AmazonPackageInfo {
  weightG?: number;
  dimensionsCm?: {
    l: number;
    b: number;
    h: number;
  };
}

export interface AmazonShippingPanelProps {
  orderId: string;
  packageInfo?: AmazonPackageInfo;
}

interface RateItem {
  rateId: string;
  carrierId: string;
  carrierName: string;
  serviceId: string;
  serviceName: string;
  totalCharge?: {
    value: number;
    unit?: string;
    currency?: string;
  };
  promise?: {
    deliveryWindow?: {
      receiveTime?: string;
      deliverTime?: string;
    };
  };
}

interface ShipmentState {
  id: string;
  status: string;
  trackingId?: string;
  carrierId?: string;
  carrierName?: string;
  selectedRate?: RateItem;
  labelUrl?: string;
  hasLabel?: boolean;
  rates?: RateItem[];
  ratesExpiresAt?: string;
}

const STATUS_TONES: Record<string, Tone> = {
  NOT_SHIPPED: "neutral",
  RATES_FETCHED: "amber",
  BOOKING: "blue",
  BOOKED: "green",
  IN_TRANSIT: "blue",
  OUT_FOR_DELIVERY: "violet",
  DELIVERED: "green",
  FAILED: "red",
  CANCELLED: "neutral",
};

export function AmazonShippingPanel({ orderId, packageInfo }: AmazonShippingPanelProps) {
  // Package form inputs with defaults
  const [weight, setWeight] = useState<string>(
    packageInfo?.weightG ? String((packageInfo.weightG / 453.592).toFixed(2)) : "1.0",
  );
  const [length, setLength] = useState<string>(
    packageInfo?.dimensionsCm ? String((packageInfo.dimensionsCm.l / 2.54).toFixed(1)) : "8.0",
  );
  const [width, setWidth] = useState<string>(
    packageInfo?.dimensionsCm ? String((packageInfo.dimensionsCm.b / 2.54).toFixed(1)) : "6.0",
  );
  const [height, setHeight] = useState<string>(
    packageInfo?.dimensionsCm ? String((packageInfo.dimensionsCm.h / 2.54).toFixed(1)) : "4.0",
  );
  const [weightUnit, setWeightUnit] = useState<string>("POUND");
  const [dimensionUnit, setDimensionUnit] = useState<string>("INCH");

  // Shipping & Rates state
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [shipment, setShipment] = useState<ShipmentState | null>(null);
  const [rates, setRates] = useState<RateItem[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [ratesExpiresAt, setRatesExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // In-flight action loaders
  const [fetchingRates, setFetchingRates] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Load initial shipment status on mount
  const refreshShipment = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shipping/${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.shipment) {
          setShipment(data.shipment);
          if (Array.isArray(data.shipment.rates) && data.shipment.rates.length > 0) {
            setRates(data.shipment.rates);
            if (data.shipment.selectedRate?.rateId) {
              setSelectedRateId(data.shipment.selectedRate.rateId);
            } else {
              setSelectedRateId(data.shipment.rates[0]?.rateId || null);
            }
          }
          if (data.shipment.ratesExpiresAt) {
            setRatesExpiresAt(new Date(data.shipment.ratesExpiresAt));
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh shipment:", err);
    }
  }, [orderId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch(`/api/admin/shipping/${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (ignore || !data.shipment) return;
        setShipment(data.shipment);
        if (Array.isArray(data.shipment.rates) && data.shipment.rates.length > 0) {
          setRates(data.shipment.rates);
          if (data.shipment.selectedRate?.rateId) {
            setSelectedRateId(data.shipment.selectedRate.rateId);
          } else {
            setSelectedRateId(data.shipment.rates[0]?.rateId || null);
          }
        }
        if (data.shipment.ratesExpiresAt) {
          setRatesExpiresAt(new Date(data.shipment.ratesExpiresAt));
        }
      } catch (err) {
        console.error("Failed to load shipment:", err);
      } finally {
        if (!ignore) {
          setLoadingInitial(false);
        }
      }
    }

    init();
    return () => {
      ignore = true;
    };
  }, [orderId]);

  // 2. 10-minute rate expiry countdown timer
  useEffect(() => {
    if (!ratesExpiresAt) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [ratesExpiresAt]);

  const secondsRemaining = ratesExpiresAt
    ? Math.max(0, Math.floor((ratesExpiresAt.getTime() - now) / 1000))
    : 0;

  const isRateExpired = Boolean(ratesExpiresAt && secondsRemaining <= 0);

  // Format countdown mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 3. Request dynamic shipping rates
  const handleGetRates = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const numWeight = parseFloat(weight);
    const numLength = parseFloat(length);
    const numWidth = parseFloat(width);
    const numHeight = parseFloat(height);

    if (!numWeight || numWeight <= 0 || !numLength || numLength <= 0 || !numWidth || numWidth <= 0 || !numHeight || numHeight <= 0) {
      toast.error("Please enter valid positive numbers for parcel weight and dimensions.");
      return;
    }

    try {
      setFetchingRates(true);
      const res = await fetch(`/api/admin/shipping/${encodeURIComponent(orderId)}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: numWeight,
          length: numLength,
          width: numWidth,
          height: numHeight,
          weightUnit,
          dimensionUnit,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const message = data.error || "Failed to retrieve Amazon Shipping rates";
        setErrorMsg(message);
        toast.error(message);
        return;
      }

      setRates(data.rates || []);
      if (Array.isArray(data.rates) && data.rates.length > 0) {
        setSelectedRateId(data.rates[0]!.rateId);
      }
      if (data.ratesExpiresAt) {
        setRatesExpiresAt(new Date(data.ratesExpiresAt));
      }
      toast.success(`Found ${data.rates?.length || 0} delivery services from Amazon Shipping.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error fetching rates";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setFetchingRates(false);
    }
  };

  // 4. Purchase selected rate
  const handleConfirmPurchase = async () => {
    if (!selectedRateId) {
      toast.error("Please select a courier delivery service first.");
      return;
    }

    if (isRateExpired) {
      toast.error("Rates have expired. Please fetch rates again.");
      setShowConfirmModal(false);
      return;
    }

    try {
      setPurchasing(true);
      setErrorMsg(null);

      const res = await fetch(`/api/admin/shipping/${encodeURIComponent(orderId)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateId: selectedRateId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message = data.error || "Shipment purchase failed";
        setErrorMsg(message);
        toast.error(message);
        return;
      }

      toast.success("Shipment booked successfully! Shipping label is ready.");
      setShowConfirmModal(false);
      // Reload shipment state to show booked status
      await refreshShipment();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error purchasing shipment";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  };

  // If order already has a booked shipment
  const isBooked =
    shipment &&
    ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(shipment.status);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-neutral-500">
        <Loader2 className="mr-2 size-4 animate-spin text-neutral-600" />
        <span>Loading Amazon Shipping status…</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // A. BOOKED / COMPLETED SHIPMENT STATE
  // ─────────────────────────────────────────────────────────────
  if (isBooked) {
    const trackingId = shipment.trackingId || "—";
    const carrier = shipment.carrierName || shipment.selectedRate?.carrierName || "Amazon Shipping";
    const service = shipment.selectedRate?.serviceName || "Standard";
    const labelUrl = `/api/admin/shipping/${encodeURIComponent(orderId)}/label`;

    return (
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            <span className="font-semibold text-emerald-950">Shipment Created</span>
          </div>
          <Badge tone={STATUS_TONES[shipment.status] || "green"}>{shipment.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-neutral-700">
          <div>
            <span className="text-neutral-500">Carrier:</span> <span className="font-medium">{carrier}</span>
          </div>
          <div>
            <span className="text-neutral-500">Service:</span> <span className="font-medium">{service}</span>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-2.5">
          <span className="text-[11px] text-neutral-500">Amazon Tracking ID (AWB):</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-neutral-900">{trackingId}</span>
            {trackingId !== "—" && <CopyButton value={trackingId} label="Copy AWB" />}
          </div>
        </div>

        <div className="mt-1 flex gap-2">
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(btnPrimary, "flex-1 h-9 text-xs")}
          >
            <Printer className="size-3.5" aria-hidden />
            <span>Print / View Label</span>
          </a>
          <a
            href={labelUrl}
            download={`shipping-label-${orderId}.png`}
            className={cn(btnSecondary, "flex-1 h-9 text-xs")}
          >
            <Download className="size-3.5" aria-hidden />
            <span>Download PNG</span>
          </a>
        </div>

        {trackingId && trackingId !== "—" && (
          <a
            href={`https://track.amazon.com/tracking/${trackingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 underline"
          >
            <span>Live carrier track link</span>
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // B. ACTIVE RATE SHOPPING & BOOKING FLOW
  // ─────────────────────────────────────────────────────────────
  const selectedRate = rates.find((r) => r.rateId === selectedRateId);

  return (
    <div className="flex flex-col gap-3.5">
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">Shipping Notice</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 1. Package Specifications Form */}
      <form onSubmit={handleGetRates} className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs">
        <div className="flex items-center justify-between font-semibold text-neutral-800">
          <span className="flex items-center gap-1.5">
            <Box className="size-3.5 text-neutral-600" aria-hidden />
            <span>Package Dimensions &amp; Weight</span>
          </span>
          <span className="text-[11px] text-neutral-500 font-normal">Standard parcel</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FieldLabel label="Weight" className="text-xs">
            <div className="flex gap-1">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={cn(inputCls, "h-8 text-xs")}
                placeholder="1.0"
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                aria-label="Weight Unit"
                className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-xs text-neutral-700"
              >
                <option value="POUND">lb</option>
                <option value="KILOGRAM">kg</option>
                <option value="GRAM">g</option>
              </select>
            </div>
          </FieldLabel>

          <FieldLabel label="Dimensions (L × W × H)" className="text-xs">
            <div className="flex gap-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className={cn(inputCls, "h-8 text-xs px-1 text-center")}
                title="Length"
                placeholder="L"
              />
              <span className="self-center text-neutral-400">×</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className={cn(inputCls, "h-8 text-xs px-1 text-center")}
                title="Width"
                placeholder="W"
              />
              <span className="self-center text-neutral-400">×</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={cn(inputCls, "h-8 text-xs px-1 text-center")}
                title="Height"
                placeholder="H"
              />
              <select
                value={dimensionUnit}
                onChange={(e) => setDimensionUnit(e.target.value)}
                aria-label="Dimension Unit"
                className="h-8 rounded-lg border border-neutral-300 bg-white px-1.5 text-xs text-neutral-700"
              >
                <option value="INCH">in</option>
                <option value="CENTIMETER">cm</option>
              </select>
            </div>
          </FieldLabel>
        </div>

        <button
          type="submit"
          disabled={fetchingRates}
          className={cn(btnPrimary, "w-full h-8 text-xs mt-1")}
        >
          {fetchingRates ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Truck className="size-3.5" />
          )}
          <span>{fetchingRates ? "Fetching live rates…" : "Get shipping rates"}</span>
        </button>
      </form>

      {/* 2. Rates List & Expiry Timer */}
      {rates.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="font-semibold text-neutral-900">Available delivery services</span>
            {ratesExpiresAt && (
              <span
                className={cn(
                  "flex items-center gap-1 font-mono text-[11px] font-medium px-2 py-0.5 rounded-full",
                  isRateExpired
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                    : "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
                )}
                title="Amazon Shipping rate quote expires after 10 minutes"
              >
                <Clock className="size-3" />
                <span>{isRateExpired ? "Expired" : formatTimer(secondsRemaining)}</span>
              </span>
            )}
          </div>

          {isRateExpired ? (
            <div className="flex flex-col items-center gap-2 py-3 text-center">
              <p className="text-neutral-600">Rate quote has expired after 10 minutes.</p>
              <button
                type="button"
                onClick={() => handleGetRates()}
                className={cn(btnSecondary, "h-8 text-xs")}
              >
                <RefreshCw className="size-3 mr-1" /> Fetch rates again
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rates.map((rate) => {
                const isSelected = selectedRateId === rate.rateId;
                const charge = rate.totalCharge
                  ? `${rate.totalCharge.currency || rate.totalCharge.unit || "USD"} ${rate.totalCharge.value.toFixed(2)}`
                  : "Rate on request";
                const promise = rate.promise?.deliveryWindow?.deliverTime
                  ? new Date(rate.promise.deliveryWindow.deliverTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : null;

                return (
                  <label
                    key={rate.rateId}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                      isSelected
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                        : "border-neutral-200 hover:bg-neutral-50/50",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="amazonRate"
                        checked={isSelected}
                        onChange={() => setSelectedRateId(rate.rateId)}
                        className="size-3.5 text-neutral-900 focus:ring-neutral-900"
                      />
                      <div>
                        <p className="font-medium text-neutral-900">
                          {rate.serviceName || rate.serviceId}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {rate.carrierName || rate.carrierId}
                          {promise && ` · Expected by ${promise}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums text-neutral-900">{charge}</span>
                  </label>
                );
              })}

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!selectedRateId || isRateExpired}
                className={cn(btnPrimary, "w-full h-9 text-xs mt-2")}
              >
                <Check className="size-3.5" />
                <span>Purchase shipment</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl text-neutral-900">
            <h3 className="text-base font-semibold">Confirm Shipment Purchase</h3>
            <div className="mt-2 text-xs leading-relaxed text-neutral-600">
              <p className="rounded-lg bg-amber-50 p-2.5 text-amber-900 border border-amber-200 mb-3">
                <strong>Charges will apply:</strong> Purchasing this rate creates a binding carrier booking and generates an official shipping label.
              </p>
              {selectedRate && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Service:</span>
                    <span className="font-medium">{selectedRate.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Carrier:</span>
                    <span className="font-medium">{selectedRate.carrierName}</span>
                  </div>
                  {selectedRate.totalCharge && (
                    <div className="flex justify-between border-t border-neutral-200 pt-1 mt-1">
                      <span className="font-medium">Total Charge:</span>
                      <span className="font-bold tabular-nums">
                        {selectedRate.totalCharge.currency || "USD"} {selectedRate.totalCharge.value.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={purchasing}
                onClick={handleConfirmPurchase}
                className={cn(btnPrimary, "flex-1 text-xs h-9")}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Booking shipment…</span>
                  </>
                ) : (
                  "Confirm &amp; Purchase"
                )}
              </button>
              <button
                type="button"
                disabled={purchasing}
                onClick={() => setShowConfirmModal(false)}
                className={cn(btnSecondary, "text-xs h-9")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
