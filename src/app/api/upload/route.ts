import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/server/auth";
import { env, requireConfigured } from "@/env";

/**
 * Issues short-lived Blob client-upload tokens (docs/12 §2): the file goes browser → Blob
 * directly, never through this function. Admins only; product images only.
 */
export async function POST(request: Request) {
  requireConfigured("BLOB_READ_WRITE_TOKEN");
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      token: env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth.api.getSession({ headers: request.headers });
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (role !== "admin" && role !== "owner") throw new Error("Not allowed");
        if (!pathname.startsWith("products/")) throw new Error("Invalid path");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          cacheControlMaxAge: 31536000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
