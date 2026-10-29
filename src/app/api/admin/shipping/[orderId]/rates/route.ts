import { NextResponse } from "next/server";
import { adminUser } from "@/server/admin/guard";
import { Order } from "@/server/models/Order";
import { Shipment } from "@/server/models/Shipment";
import { amazonShippingService } from "@/server/services/amazonShipping/amazonShipping.service";
import { getAmazonShippingConfig } from "@/server/services/amazonShipping/config";
import type { PackageInput } from "@/server/services/amazonShipping/types";

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

  let body: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    weightUnit?: string;
    dimensionUnit?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const weight = Number(body.weight);
  const length = Number(body.length);
  const width = Number(body.width);
  const height = Number(body.height);

  if (!weight || weight <= 0 || !length || length <= 0 || !width || width <= 0 || !height || height <= 0) {
    return NextResponse.json(
      { error: "Package weight, length, width, and height must be positive numbers" },
      { status: 400 },
    );
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const config = getAmazonShippingConfig();

    const packageInput: PackageInput = {
      packageClientReferenceId: `${order._id}-pkg-1`,
      dimensions: {
        length,
        width,
        height,
        unit: body.dimensionUnit || config.dimensionUnit,
      },
      weight: {
        value: weight,
        unit: body.weightUnit || config.weightUnit,
      },
    };

    const ratesResult = await amazonShippingService.getRates(order.toObject(), packageInput);

    const ratesExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    let shipment = await Shipment.findOne({
      orderId,
      status: { $in: ["NOT_SHIPPED", "RATES_FETCHED"] },
    });

    if (!shipment) {
      shipment = new Shipment({
        orderId,
        provider: "amazon_shipping",
        status: "RATES_FETCHED",
      });
    }

    shipment.status = "RATES_FETCHED";
    shipment.requestToken = ratesResult.requestToken;
    shipment.rates = ratesResult.rates;
    shipment.ratesExpiresAt = ratesExpiresAt;
    shipment.packageInfo = packageInput;
    shipment.rawMeta = ratesResult.rawMeta;

    await shipment.save();

    return NextResponse.json({
      ok: true,
      requestToken: ratesResult.requestToken,
      rates: ratesResult.rates,
      ratesExpiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch Amazon rates";
    console.error("[AmazonShipping] GetRates error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
