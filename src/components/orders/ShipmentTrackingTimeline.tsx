"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Loader2, Package, Truck } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TrackingEvent {
  code?: string;
  time: Date | string;
  location?: string;
  description: string;
}

export interface TrackingResponse {
  trackingId: string | null;
  carrierName: string | null;
  currentStatus: string;
  events: TrackingEvent[];
  lastUpdated: string | null;
  message?: string;
}

export interface ShipmentTrackingTimelineProps {
  orderId: string;
  accessKey?: string;
  orderStatus?: string;
  className?: string;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const TIMELINE_STEPS = [
  { key: "ORDERED", label: "Ordered", description: "Order confirmed and verified" },
  { key: "SHIPPED", label: "Shipped", description: "Packed and carrier booking confirmed" },
  { key: "IN_TRANSIT", label: "In Transit", description: "On the way to destination hub" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", description: "Courier agent out for delivery" },
  { key: "DELIVERED", label: "Delivered", description: "Package handed over safely" },
] as const;

function getStepIndex(currentStatus: string): number {
  const s = currentStatus.toUpperCase();
  if (s === "DELIVERED") return 4;
  if (s === "OUT_FOR_DELIVERY" || s === "OUTFORDELIVERY") return 3;
  if (s === "IN_TRANSIT" || s === "INTRANSIT" || s === "PICKUP_DONE" || s === "RECEIVED") return 2;
  if (s === "BOOKED" || s === "SHIPPED") return 1;
  return 0; // ORDERED
}

/**
 * Vertical Flipkart/Amazon-style shipment tracking timeline.
 * Fetches data strictly from GET /api/orders/:orderId/tracking.
 * Strictly customer-facing: never exposes labels, secrets, or admin controls.
 */
export function ShipmentTrackingTimeline({
  orderId,
  accessKey,
  orderStatus,
  className,
}: ShipmentTrackingTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTracking() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/orders/${encodeURIComponent(orderId)}/tracking${
          accessKey ? `?accessKey=${encodeURIComponent(accessKey)}` : ""
        }`;

        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 404) {
            setTrackingData(null);
            return;
          }
          throw new Error("Unable to load tracking details");
        }

        const data: TrackingResponse = await res.json();
        if (!cancelled) {
          setTrackingData(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error loading tracking");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (orderId) {
      fetchTracking();
    }

    return () => {
      cancelled = true;
    };
  }, [orderId, accessKey]);

  if (loading) {
    return (
      <div className={cn("surface flex items-center justify-center p-6 text-sm text-muted", className)}>
        <Loader2 className="mr-2 size-4 animate-spin text-gold" />
        <span>Loading live shipment tracking…</span>
      </div>
    );
  }

  // 1. Empty State: Shipment not created yet
  const hasShipment =
    trackingData &&
    trackingData.trackingId &&
    trackingData.currentStatus !== "NOT_SHIPPED" &&
    orderStatus !== "pending_payment";

  if (!hasShipment || error) {
    return (
      <div className={cn("surface flex flex-col items-center justify-center gap-2 p-6 text-center sm:p-8", className)}>
        <div className="grid size-12 place-items-center rounded-full bg-white/5 text-muted">
          <Package className="size-6 text-gold/80" aria-hidden />
        </div>
        <h4 className="font-display text-lg text-fg">Shipment not created yet</h4>
        <p className="max-w-md text-xs text-muted leading-relaxed">
          We are handcrafting and preparing your perfume parcel. Real-time carrier tracking checkpoints will appear here as soon as the package is dispatched.
        </p>
      </div>
    );
  }

  const currentStep = getStepIndex(trackingData.currentStatus);
  const lastUpdatedTime = trackingData.lastUpdated ? new Date(trackingData.lastUpdated) : null;

  return (
    <div className={cn("surface flex flex-col gap-6 p-6 sm:p-8", className)}>
      {/* Header Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-gold/10 text-gold">
            <Truck className="size-5" aria-hidden />
          </div>
          <div>
            <h4 className="font-display text-lg text-fg">
              {trackingData.carrierName || "Amazon Shipping"}
            </h4>
            <p className="font-mono text-xs text-muted">
              AWB: <span className="text-fg">{trackingData.trackingId}</span>
            </p>
          </div>
        </div>

        {lastUpdatedTime && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="size-3.5 text-gold/70" />
            <span>Updated {dateFmt.format(lastUpdatedTime)}</span>
          </div>
        )}
      </div>

      {/* 2. 5-Step Vertical Flipkart/Amazon-Style Progress Tracker */}
      <div className="py-1">
        <ol className="relative ml-3 flex flex-col gap-6 border-l border-white/15 pl-6" aria-label="Shipment Journey">
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <li key={step.key} className="relative">
                {/* Milestone Node */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-[37px] top-0.5 grid size-6 place-items-center rounded-full text-xs font-semibold ring-4 ring-obsidian transition-colors",
                    isCompleted && "bg-gold text-obsidian",
                    isCurrent && "bg-gold text-obsidian ring-gold/40 shadow-sm shadow-gold/50 animate-pulse",
                    isPending && "bg-white/10 text-muted",
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5 stroke-[3]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Milestone Details */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "font-medium",
                        isCurrent && "text-gold font-semibold",
                        isCompleted && "text-fg",
                        isPending && "text-muted",
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold uppercase tracking-wider">
                        Current Status
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 3. Granular Carrier Activity Checkpoints (if any events returned by carrier) */}
      {trackingData.events && trackingData.events.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs">
          <p className="mb-3 font-semibold text-fg">Carrier Checkpoints</p>
          <ol className="relative ml-2 flex flex-col gap-3.5 border-l border-white/15 pl-4">
            {trackingData.events.map((ev, i) => {
              const evTime = typeof ev.time === "string" ? new Date(ev.time) : ev.time;
              const isFirst = i === 0;

              return (
                <li key={i} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[21px] top-1 size-2 rounded-full ring-2 ring-obsidian",
                      isFirst ? "bg-gold" : "bg-white/40",
                    )}
                  />
                  <p className={cn("font-medium", isFirst ? "text-fg" : "text-muted")}>
                    {ev.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    <time dateTime={evTime ? evTime.toISOString() : undefined}>
                      {evTime ? dateFmt.format(evTime) : "—"}
                    </time>
                    {ev.location && <span> · {ev.location}</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
