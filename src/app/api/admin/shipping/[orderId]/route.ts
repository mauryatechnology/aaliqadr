import { NextResponse } from "next/server";
import { adminUser } from "@/server/admin/guard";
import { Shipment } from "@/server/models/Shipment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const user = await adminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  const shipment = await Shipment.findOne({ orderId }).sort({ createdAt: -1 });

  return NextResponse.json({
    ok: true,
    shipment: shipment
      ? {
          id: shipment._id,
          orderId: shipment.orderId,
          status: shipment.status,
          provider: shipment.provider,
          rates: shipment.rates,
          ratesExpiresAt: shipment.ratesExpiresAt,
          selectedRate: shipment.selectedRate,
          amazonShipmentId: shipment.amazonShipmentId,
          trackingId: shipment.trackingId,
          carrierId: shipment.carrierId,
          labelUrl: shipment.labelUrl,
          hasLabel: Boolean(shipment.labelPath),
          packageInfo: shipment.packageInfo,
          trackingEvents: shipment.trackingEvents,
          currentStatus: shipment.currentStatus,
          lastTrackedAt: shipment.lastTrackedAt,
          createdAt: shipment.createdAt,
          updatedAt: shipment.updatedAt,
        }
      : null,
  });
}
