import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { adminUser } from "@/server/admin/guard";
import { getProductEditor } from "@/server/admin/queries";
import { editorToInput } from "@/server/admin/product-form";
import { previewProductDoc } from "@/server/services/catalog-admin";
import { fromDoc, type LeanProduct } from "@/server/queries/catalog";
import { productInput } from "@/schemas/product";
import { ProductView } from "@/components/product/ProductView";
import { routes } from "@/lib/routes";

/** Staff-only: the product page as shoppers would see it, from the pending draft if there is one (plan.md §8.5). */

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function Page(props: PageProps<"/preview/product/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Preview {...props} />
    </Suspense>
  );
}

async function Preview({ params }: PageProps<"/preview/product/[id]">) {
  const user = await adminUser("staff");
  if (!user) notFound();
  const { id } = await params;
  const found = await getProductEditor(id);
  if (!found) notFound();
  const parsed = productInput.safeParse(found.draft?.value ?? editorToInput(found.value));
  if (!parsed.success) notFound();
  const p = fromDoc((await previewProductDoc(parsed.data)) as unknown as LeanProduct);

  return (
    <>
      <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-300 px-4 py-2 text-center text-sm text-neutral-900">
        <span>
          <strong>Preview.</strong> {found.draft ? "Showing the unpublished draft." : `Showing the saved version (${found.value.status}).`} Shoppers can&apos;t see this page.
        </span>
        <Link href={routes.adminProduct(id)} className="underline underline-offset-4">Back to the editor</Link>
      </div>
      <ProductView p={p} preview />
    </>
  );
}
