import { NextResponse } from "next/server";
import { adminUser } from "@/server/admin/guard";
import { Order } from "@/server/models/Order";
import { Shipment } from "@/server/models/Shipment";
import { amazonShippingService } from "@/server/services/amazonShipping/amazonShipping.service";
import { saveShippingLabel } from "@/server/services/amazonShipping/storage";

export async function POST(
  request: Request,
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

  let body: { rateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const rateId = body.rateId?.trim();
  if (!rateId) {
    return NextResponse.json({ error: "rateId is required" }, { status: 400 });
  }

  const existingShipment = await Shipment.findOne({ orderId }).sort({ createdAt: -1 });
  if (!existingShipment || !existingShipment.requestToken) {
    return NextResponse.json({ error: "No active rate session found for this order" }, { status: 404 });
  }

  // 1. Check rate expiry
  if (existingShipment.ratesExpiresAt && new Date() > new Date(existingShipment.ratesExpiresAt)) {
    return NextResponse.json(
      { error: "Rates have expired. Please fetch shipping rates again." },
      { status: 409 },
    );
  }

  // 2. Atomic lock: Ensure only one purchase can proceed
  const lockedShipment = await Shipment.findOneAndUpdate(
    {
      orderId,
      status: { $in: ["NOT_SHIPPED", "RATES_FETCHED"] },
    },
    {
      $set: { status: "BOOKING" },
    },
    { new: true },
  );

  if (!lockedShipment) {
    return NextResponse.json(
      { error: "Shipment is already booked or a booking is currently in progress" },
      { status: 409 },
    );
  }

  if (!lockedShipment.requestToken) {
    return NextResponse.json({ error: "Missing requestToken in shipment session" }, { status: 400 });
  }

  const selectedRate = lockedShipment.rates.find((r) => r.rateId === rateId);

  try {
    // 3. Purchase shipment on Amazon SP-API
    const purchaseResult = await amazonShippingService.purchaseShipment(lockedShipment.requestToken, rateId);

    // 4. Retrieve label document if not included in purchase response
    let labelContentsBase64 = purchaseResult.labelContentsBase64;
    if (!labelContentsBase64) {
      const labelDoc = await amazonShippingService.getLabel(
        purchaseResult.shipmentId,
        purchaseResult.packageClientReferenceId,
      );
      labelContentsBase64 = labelDoc.contentsBase64;
    }

    // 5. Store label file (local file or Vercel Blob; never in MongoDB)
    const storageRes = await saveShippingLabel(
      labelContentsBase64,
      orderId,
      purchaseResult.shipmentId,
    );

    // 6. Update Shipment record
    const carrierName = selectedRate?.carrierName || purchaseResult.carrierId || "Amazon Shipping";
    const trackingId = purchaseResult.trackingId || lockedShipment.trackingId || "";

    lockedShipment.status = "BOOKED";
    lockedShipment.amazonShipmentId = purchaseResult.shipmentId;
    lockedShipment.trackingId = trackingId;
    lockedShipment.carrierId = purchaseResult.carrierId || selectedRate?.carrierId;
    lockedShipment.packageClientReferenceId = purchaseResult.packageClientReferenceId;
    lockedShipment.labelPath = storageRes.labelPath;
    lockedShipment.labelUrl = storageRes.labelUrl;
    lockedShipment.selectedRate = selectedRate;
    lockedShipment.currentStatus = "BOOKED";
    lockedShipment.lastTrackedAt = new Date();
    lockedShipment.rawMeta = purchaseResult.rawMeta;

    await lockedShipment.save();

    // 7. Update Order and legacy shipment fields
    const order = await Order.findById(orderId);
    if (order) {
      order.shipmentId = lockedShipment._id.toString();
      order.shipmentStatus = "BOOKED";
      order.shipment = {
        courier: carrierName,
        awb: trackingId,
        trackingUrl: trackingId ? `https://track.amazon.com/tracking/${trackingId}` : undefined,
        shippedAt: new Date(),
      };

      if (order.status === "confirmed" || order.status === "processing") {
        order.status = "shipped";
      }

      order.history.push({
        at: new Date(),
        status: order.status,
        note: `Amazon Shipping shipment booked (${carrierName}, Tracking ID: ${trackingId})`,
        actor: { name: user.name, role: user.role, userId: user.id },
        visibleToCustomer: true,
      });

      await order.save();
    }

    return NextResponse.json({
      ok: true,
      shipment: {
        id: lockedShipment._id,
        status: lockedShipment.status,
        shipmentId: lockedShipment.amazonShipmentId,
        trackingId: lockedShipment.trackingId,
        carrierId: lockedShipment.carrierId,
        carrierName,
        labelUrl: lockedShipment.labelUrl,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to purchase shipment";
    console.error("[AmazonShipping] Purchase error:", err);

    // Rollback atomic lock so admin can retry
    lockedShipment.status = "RATES_FETCHED";
    lockedShipment.errors.push({
      at: new Date(),
      message: errorMsg,
      code: "PURCHASE_ERROR",
    });

    await lockedShipment.save().catch(() => {});

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
