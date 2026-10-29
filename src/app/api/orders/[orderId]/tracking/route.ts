import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { Order } from "@/server/models/Order";
import { Shipment } from "@/server/models/Shipment";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  // 1. Fetch order with accessKey for ownership check
  const order = await Order.findById(orderId).select("+accessKey");
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 2. Verify ownership via Better Auth session or guest access key
  const user = await getSessionUser();
  const url = new URL(request.url);
  const queryAccessKey = url.searchParams.get("accessKey") || request.headers.get("x-order-access-key");

  let isAuthorized = false;

  if (user) {
    if (user.role === "staff" || user.role === "admin" || user.role === "owner") {
      isAuthorized = true;
    } else if (order.userId && order.userId === user.id) {
      isAuthorized = true;
    } else if (order.contact?.email && user.email.toLowerCase() === order.contact.email.toLowerCase()) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized && queryAccessKey && order.accessKey === queryAccessKey) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: user ? "You do not have permission to view tracking for this order" : "Please sign in to view order tracking" },
      { status: user ? 403 : 401 },
    );
  }

  // 3. Query ONLY from our DB. Never call Amazon here. Never return label.
  const shipment = await Shipment.findOne({
    orderId,
    status: { $in: ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] },
  }).sort({ createdAt: -1 });

  if (!shipment || !shipment.trackingId) {
    // Check legacy shipment fields if manual courier was used
    if (order.shipment?.awb) {
      return NextResponse.json({
        trackingId: order.shipment.awb,
        carrierName: order.shipment.courier || "Courier",
        currentStatus: order.status === "delivered" ? "DELIVERED" : "IN_TRANSIT",
        events: [],
        lastUpdated: order.shipment.shippedAt || order.updatedAt,
      });
    }

    return NextResponse.json({
      trackingId: null,
      carrierName: null,
      currentStatus: "NOT_SHIPPED",
      events: [],
      lastUpdated: null,
      message: "Shipment not created yet",
    });
  }

  const carrierName =
    shipment.selectedRate?.carrierName ||
    shipment.carrierId ||
    order.shipment?.courier ||
    "Amazon Shipping";

  return NextResponse.json({
    trackingId: shipment.trackingId,
    carrierName,
    currentStatus: shipment.currentStatus || shipment.status,
    events: (shipment.trackingEvents || []).map((ev) => ({
      code: ev.code,
      time: ev.time,
      location: ev.location,
      description: ev.description,
    })),
    lastUpdated: shipment.lastTrackedAt || shipment.updatedAt,
  });
}
