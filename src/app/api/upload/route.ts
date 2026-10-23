import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/server/auth";
import { env, requireConfigured } from "@/env";

/**
 * Issues short-lived Blob client-upload tokens (docs/12 §2): the file goes browser → Blob
 * directly, never through this function. Each path prefix has its own audience and limits.
 */

const IMAGES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIDEOS = ["video/mp4", "video/webm"];
const MB = 1024 * 1024;

type Rule = { roles: string[]; types: string[]; maxBytes: (pathname: string) => number };

const RULES: Record<string, Rule> = {
  // Catalogue media: product galleries, A+ blocks, categories and collections.
  "products/": { roles: ["admin", "owner"], types: [...IMAGES, ...VIDEOS], maxBytes: (p) => (/\.(mp4|webm)$/i.test(p) ? 60 * MB : 8 * MB) },
  "catalog/": { roles: ["admin", "owner"], types: IMAGES, maxBytes: () => 8 * MB },
  // Customer evidence for damage/leak claims and review photos (docs/08 §5).
  "returns/": { roles: ["customer", "staff", "admin", "owner"], types: [...IMAGES, ...VIDEOS], maxBytes: (p) => (/\.(mp4|webm|mov)$/i.test(p) ? 60 * MB : 8 * MB) },
  "reviews/": { roles: ["customer", "staff", "admin", "owner"], types: IMAGES, maxBytes: () => 6 * MB },
  // Storefront content (banners).
  "content/": { roles: ["admin", "owner"], types: IMAGES, maxBytes: () => 8 * MB },
};

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
        if (!session) throw new Error("Sign in to upload");
        const role = (session.user as { role?: string }).role ?? "customer";
        const prefix = Object.keys(RULES).find((p) => pathname.startsWith(p));
        const rule = prefix ? RULES[prefix] : undefined;
        if (!rule) throw new Error("Invalid path");
        if (!rule.roles.includes(role)) throw new Error("Not allowed");
        // Customer uploads live under their own id, so one customer can't overwrite another's.
        if ((prefix === "returns/" || prefix === "reviews/") && role === "customer" && !pathname.startsWith(`${prefix}${session.user.id}/`)) throw new Error("Invalid path");
        return {
          allowedContentTypes: rule.types,
          maximumSizeInBytes: rule.maxBytes(pathname),
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
