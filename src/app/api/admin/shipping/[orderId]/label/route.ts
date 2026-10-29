import { NextResponse } from "next/server";
import { adminUser } from "@/server/admin/guard";
import { Shipment } from "@/server/models/Shipment";
import { getShippingLabelBuffer } from "@/server/services/amazonShipping/storage";

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

  const shipment = await Shipment.findOne({
    orderId,
    status: { $in: ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] },
  }).sort({ createdAt: -1 });

  if (!shipment || !shipment.labelPath) {
    return NextResponse.json({ error: "Label not found for this order" }, { status: 404 });
  }

  try {
    const buffer = await getShippingLabelBuffer(shipment.labelPath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="shipping-label-${orderId}.png"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[AmazonShipping] Label download error:", err);
    return NextResponse.json({ error: "Failed to read shipping label file" }, { status: 500 });
  }
}
