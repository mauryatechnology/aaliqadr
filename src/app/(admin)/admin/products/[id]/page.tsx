import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { site } from "@/config/site";
import { routes } from "@/lib/routes";
import { adminUser } from "@/server/admin/guard";
import { getProductAdmin } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { ProductEditor, type EditorValue } from "@/components/admin/ProductEditor";

export const metadata = { title: "Edit product" };

const BLANK: EditorValue = {
  name: "",
  slug: "",
  type: "fragrance",
  status: "draft",
  tagline: "",
  description: "",
  howToWear: "",
  notes: { top: [], heart: [], base: [] },
  manufacturer: `${site.legal.legalName}, ${site.legal.city}, ${site.legal.state}`,
  countryOfOrigin: "India",
  genericName: "Extrait de Parfum",
  hsnCode: "33030050",
  gstRatePercent: 18,
  seoTitle: "",
  seoDescription: "",
  sortOrder: 50,
  media: [],
  variants: [{ sku: "AQ-", label: "50 ml", volumeMl: 50, mrp: 0, price: 0, weightG: 380, lowStockThreshold: 5, maxPerOrder: 5, codAllowed: true, isActive: true, initialStock: 0, existing: false }],
};

export default function Page(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProduct {...props} />
    </Suspense>
  );
}

async function AdminProduct({ params }: PageProps<"/admin/products/[id]">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can edit products.</p>;
  const { id } = await params;
  const isNew = id === "new";
  let initial = BLANK;
  if (!isNew) {
    const p = await getProductAdmin(id);
    if (!p) notFound();
    initial = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status as EditorValue["status"],
      zodiacSign: p.zodiacSign,
      concentration: p.concentration,
      tagline: p.tagline,
      description: p.description,
      howToWear: p.howToWear ?? "",
      intensity: p.profile?.intensity,
      notes: p.notes ?? { top: [], heart: [], base: [] },
      manufacturer: p.legal.manufacturer,
      countryOfOrigin: p.legal.countryOfOrigin,
      genericName: p.legal.genericName,
      hsnCode: p.hsnCode,
      gstRatePercent: p.gstRateBps / 100,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      sortOrder: p.sortOrder,
      media: p.media.map((m) => ({ url: m.url, alt: m.alt, width: m.width, height: m.height })),
      variants: p.variants.map((v) => ({
        sku: v.sku,
        label: v.label,
        volumeMl: v.volumeMl,
        mrp: v.mrpP / 100,
        price: v.priceP / 100,
        weightG: v.weightG,
        lowStockThreshold: v.lowStockThreshold,
        maxPerOrder: v.maxPerOrder,
        codAllowed: v.codAllowed,
        isActive: v.isActive,
        initialStock: 0,
        existing: true,
      })),
    };
  }
  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader
        title={isNew ? "New product" : initial.name}
        actions={!isNew && initial.status === "active" ? <Link href={routes.product(initial.slug)} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900">View in store <ExternalLink className="size-4" /></Link> : undefined}
      />
      <ProductEditor initial={initial} isNew={isNew} />
    </>
  );
}
