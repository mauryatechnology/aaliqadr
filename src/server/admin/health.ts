import "server-only";
import { mongoClient } from "@/server/db/mongo-client";
import { db } from "@/server/db/connect";
import { Order } from "@/server/models/Order";
import { Product } from "@/server/models/Product";
import { ReturnRequest, Review } from "@/server/models/engagement";
import { isConfigured, env } from "@/env";

export interface HealthReport {
  dbOk: boolean;
  pingMs: number;
  dbError: string;
  productCount: number;
  pendingOrders: number;
  openClaims: number;
  pendingReviews: number;
  lastAuditAt?: Date;
  lastAuditAction?: string;
  lastAuditActor?: string;
  integrations: {
    name: string;
    ok: boolean;
    detail: string;
    kind: "database" | "mail" | "payments" | "auth" | "blob";
  }[];
}

export async function getSystemHealth(): Promise<HealthReport> {
  const startPing = Date.now();
  let dbOk = false;
  let pingMs = 0;
  let dbError = "";

  try {
    await db();
    await mongoClient.db().command({ ping: 1 });
    pingMs = Date.now() - startPing;
    dbOk = true;
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : "Database ping failed";
  }

  const [productCount, pendingOrders, openClaims, pendingReviews, lastAudit] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments({ status: { $in: ["confirmed", "processing"] } }),
    ReturnRequest.countDocuments({ status: "requested" }),
    Review.countDocuments({ status: "pending" }),
    mongoClient.db().collection("auditlogs").findOne({}, { sort: { createdAt: -1 } }),
  ]);

  const integrations: HealthReport["integrations"] = [
    {
      name: "MongoDB Atlas",
      ok: dbOk,
      detail: dbOk ? `Connected · Ping ${pingMs} ms` : `Error: ${dbError}`,
      kind: "database",
    },
    {
      name: "Transactional Mailer (SMTP / Resend)",
      ok: isConfigured("SMTP_USER", "SMTP_PASS") || isConfigured("RESEND_API_KEY"),
      detail: isConfigured("SMTP_USER", "SMTP_PASS")
        ? `SMTP configured (${env.SMTP_USER || "active"})`
        : isConfigured("RESEND_API_KEY")
          ? "Resend API configured"
          : "Not configured (fallback preview mode)",
      kind: "mail",
    },
    {
      name: "Razorpay Payments",
      ok: isConfigured("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"),
      detail: isConfigured("RAZORPAY_KEY_ID") ? `Live Key: ${env.RAZORPAY_KEY_ID?.slice(0, 8)}...` : "Missing keys",
      kind: "payments",
    },
    {
      name: "Google OAuth",
      ok: isConfigured("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
      detail: isConfigured("GOOGLE_CLIENT_ID") ? "Configured for social sign-in" : "Disabled (Email OTP active)",
      kind: "auth",
    },
    {
      name: "Vercel Blob Storage",
      ok: isConfigured("BLOB_READ_WRITE_TOKEN"),
      detail: isConfigured("BLOB_READ_WRITE_TOKEN") ? "Media uploads connected" : "Local / fallback media",
      kind: "blob",
    },
  ];

  return {
    dbOk,
    pingMs,
    dbError,
    productCount,
    pendingOrders,
    openClaims,
    pendingReviews,
    lastAuditAt: lastAudit?.createdAt ? new Date(lastAudit.createdAt) : undefined,
    lastAuditAction: lastAudit?.action ? String(lastAudit.action) : undefined,
    lastAuditActor: lastAudit?.actor?.name ? String(lastAudit.actor.name) : undefined,
    integrations,
  };
}
