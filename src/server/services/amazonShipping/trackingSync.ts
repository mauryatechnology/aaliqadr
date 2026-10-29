import "server-only";
import { Order } from "@/server/models/Order";
import { Shipment, type ShipmentDoc } from "@/server/models/Shipment";
import { amazonShippingService } from "./amazonShipping.service";

export interface SyncSummary {
  scanned: number;
  synced: number;
  delivered: number;
  errors: number;
  details: Array<{
    orderId: string;
    trackingId?: string;
    status: string;
    error?: string;
  }>;
}

/**
 * Syncs carrier tracking information for active Amazon shipments.
 * Polls Amazon SP-API with controlled concurrency (max 3) and delays.
 */
export async function syncAmazonTracking(): Promise<SyncSummary> {
  const activeShipments = await Shipment.find({
    provider: "amazon_shipping",
    status: { $in: ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    trackingId: { $exists: true, $ne: "" },
  })
    .sort({ lastTrackedAt: 1 })
    .limit(50);

  const summary: SyncSummary = {
    scanned: activeShipments.length,
    synced: 0,
    delivered: 0,
    errors: 0,
    details: [],
  };

  const concurrency = 3;

  // Process in small concurrency batches
  for (let i = 0; i < activeShipments.length; i += concurrency) {
    const batch = activeShipments.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (shipment) => {
        try {
          if (!shipment.trackingId) return;

          const tracking = await amazonShippingService.getTracking(
            shipment.trackingId,
            shipment.carrierId,
          );

          // Update tracking events and status idempotently
          shipment.trackingEvents = tracking.events;
          shipment.lastTrackedAt = new Date();

          if (tracking.currentStatus && tracking.currentStatus !== shipment.status) {
            shipment.status = tracking.currentStatus as ShipmentDoc["status"];
            shipment.currentStatus = tracking.currentStatus;
          }

          await shipment.save();

          // If the parcel has been delivered, update the customer order
          if (shipment.status === "DELIVERED") {
            const deliveredAt = new Date();
            const order = await Order.findById(shipment.orderId);
            if (order && order.status !== "delivered") {
              order.status = "delivered";
              if (order.shipment) {
                order.shipment.deliveredAt = deliveredAt;
              }
              order.history.push({
                at: deliveredAt,
                status: "delivered",
                note: `Amazon Shipping confirmed delivery (AWB: ${shipment.trackingId})`,
                actor: { name: "Amazon Shipping Tracking Bot", role: "system" },
                visibleToCustomer: true,
              });
              await order.save();
            }
            summary.delivered++;
          }

          summary.synced++;
          summary.details.push({
            orderId: shipment.orderId,
            trackingId: shipment.trackingId,
            status: shipment.status,
          });
        } catch (err: unknown) {
          summary.errors++;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[AmazonShipping] Error syncing tracking for order ${shipment.orderId}:`, errMsg);

          // Record error to shipment without breaking the loop
          shipment.errors.push({
            at: new Date(),
            message: errMsg,
            code: "TRACKING_SYNC_ERROR",
          });
          shipment.lastTrackedAt = new Date();
          await shipment.save().catch(() => {});

          summary.details.push({
            orderId: shipment.orderId,
            trackingId: shipment.trackingId,
            status: shipment.status,
            error: errMsg,
          });
        }
      }),
    );

    // Minor delay between batches to respect rate limits
    if (i + concurrency < activeShipments.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return summary;
}
