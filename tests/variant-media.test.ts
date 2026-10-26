import { describe, expect, it } from "vitest";
import { coverFor, imagesFor, type MediaSource } from "@/lib/variant-media";
import type { MediaItem } from "@/server/catalog/types";

const img = (id: string, scope: MediaItem["scope"], kind: MediaItem["kind"] = "image"): MediaItem => ({ id, kind, scope, url: `https://x.public.blob.vercel-storage.com/${id}.webp`, alt: id, width: 1600, height: 2000 });

const product = (over: Partial<MediaSource> = {}): MediaSource => ({
  imageAxis: 1,
  display: { sharedAfterVariant: true },
  variants: [
    { sku: "AQ-EMC-50-CL", optionValues: ["50 ml", "Classic"] },
    { sku: "AQ-EMC-50-GB", optionValues: ["50 ml", "Gift box"] },
    { sku: "AQ-EMC-100-GB", optionValues: ["100 ml", "Gift box"] },
  ],
  media: [
    img("shared1", { kind: "shared" }),
    img("shared2", { kind: "shared" }),
    img("giftbox", { kind: "option", axis: 1, value: "Gift box" }),
    img("own100gb", { kind: "variant", sku: "AQ-EMC-100-GB" }),
    img("own100gb-video", { kind: "variant", sku: "AQ-EMC-100-GB" }, "video"),
  ],
  ...over,
});

const ids = (list: MediaItem[]) => list.map((m) => m.id);

describe("imagesFor", () => {
  it("uses a variant's own photos first, then shared, never other variants'", () => {
    expect(ids(imagesFor(product(), "AQ-EMC-100-GB"))).toEqual(["own100gb", "own100gb-video", "shared1", "shared2"]);
  });

  it("falls back to the image-axis value's photos when a variant has none of its own", () => {
    expect(ids(imagesFor(product(), "AQ-EMC-50-GB"))).toEqual(["giftbox", "shared1", "shared2"]);
  });

  it("falls back to shared photos when nothing specific exists", () => {
    expect(ids(imagesFor(product(), "AQ-EMC-50-CL"))).toEqual(["shared1", "shared2"]);
  });

  it("hides shared photos after a variant's own when that's switched off", () => {
    expect(ids(imagesFor(product({ display: { sharedAfterVariant: false } }), "AQ-EMC-100-GB"))).toEqual(["own100gb", "own100gb-video"]);
    // ...but a variant with nothing specific still shows the shared set.
    expect(ids(imagesFor(product({ display: { sharedAfterVariant: false } }), "AQ-EMC-50-CL"))).toEqual(["shared1", "shared2"]);
  });

  it("ignores option photos when no image axis is set", () => {
    expect(ids(imagesFor(product({ imageAxis: undefined }), "AQ-EMC-50-GB"))).toEqual(["shared1", "shared2"]);
  });

  it("honours legacy variant mediaIds", () => {
    const p = product({ variants: [{ sku: "AQ-ARI-50", optionValues: ["50 ml"], mediaIds: ["shared2"] }, { sku: "AQ-ARI-10", optionValues: ["10 ml"] }], imageAxis: undefined, media: [img("shared1", { kind: "shared" }), img("shared2", { kind: "shared" })] });
    expect(ids(imagesFor(p, "AQ-ARI-50"))).toEqual(["shared2", "shared1"]);
    // A legacy-claimed photo is not shown for other variants.
    expect(ids(imagesFor(p, "AQ-ARI-10"))).toEqual(["shared1"]);
  });

  it("returns the product's shared set when no variant is given", () => {
    expect(ids(imagesFor(product()))).toEqual(["shared1", "shared2"]);
  });
});

describe("coverFor", () => {
  it("is the first image, never a video", () => {
    const p = product({ media: [img("v", { kind: "variant", sku: "AQ-EMC-50-CL" }, "video"), img("s", { kind: "shared" })] });
    expect(coverFor(p, "AQ-EMC-50-CL")?.id).toBe("s");
  });
});
