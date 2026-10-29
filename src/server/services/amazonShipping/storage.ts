import "server-only";
import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { env, isConfigured } from "@/env";

export interface LabelStorageResult {
  labelPath: string;
  labelUrl?: string;
}

/**
 * Saves binary PNG shipping label to Vercel Blob (if configured) or local filesystem.
 * Never stores base64 content in MongoDB.
 */
export async function saveShippingLabel(
  base64Contents: string,
  orderId: string,
  shipmentId: string,
): Promise<LabelStorageResult> {
  const cleanBase64 = base64Contents.replace(/^data:image\/png;base64,/, "").trim();
  const buffer = Buffer.from(cleanBase64, "base64");
  const fileName = `label-${orderId}-${shipmentId}.png`;

  // 1. Try Vercel Blob if token is available and not a placeholder
  if (isConfigured("BLOB_READ_WRITE_TOKEN")) {
    try {
      const blob = await put(`shipping-labels/${fileName}`, buffer, {
        access: "public",
        contentType: "image/png",
        token: env.BLOB_READ_WRITE_TOKEN,
      });

      return {
        labelPath: blob.url,
        labelUrl: blob.url,
      };
    } catch (err) {
      console.error("[AmazonShipping] Failed to store label to Vercel Blob, falling back to disk:", err);
    }
  }

  // 2. Local filesystem storage
  const uploadDir = path.join(process.cwd(), "public", "uploads", "shipping-labels");
  await fs.promises.mkdir(uploadDir, { recursive: true });
  const localFilePath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(localFilePath, buffer);

  return {
    labelPath: localFilePath,
    labelUrl: `/uploads/shipping-labels/${fileName}`,
  };
}

/**
 * Retrieves the raw PNG Buffer for streaming / downloading the shipping label.
 */
export async function getShippingLabelBuffer(labelPath: string): Promise<Buffer> {
  if (labelPath.startsWith("http://") || labelPath.startsWith("https://")) {
    const res = await fetch(labelPath, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`Failed to fetch label from storage URL (${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return fs.promises.readFile(labelPath);
}
