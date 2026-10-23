import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ZODIAC } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listProductsAdmin } from "@/server/admin/queries";
import { AdminSkeleton, Badge, btnPrimary, Empty, PageHeader, STATUS_TONE, Table, td, th } from "@/components/admin/ui";

export const metadata = { title: "Products" };

const TYPE_LABEL: Record<string, string> = { fragrance: "Signature", bundle: "Bundle", gift_set: "Gift set", body_care: "Body care", accessory: "Accessory" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminProducts />
    </Suspense>
  );
}

async function AdminProducts() {
  const user = await adminUser();
  if (!user) return null;
  const products = await listProductsAdmin();
  const canEdit = hasRole(user, "admin");
  return (
    <>
      <PageHeader
        title="Products"
        description={`${products.length} products. Drafts are hidden from the store until you set them active.`}
        actions={canEdit ? <Link href="/admin/products/new" className={btnPrimary}><Plus className="size-4" /> New product</Link> : undefined}
      />
      {products.length === 0 ? (
        <Empty title="No products yet">Run <code>npm run db:seed</code> or create one.</Empty>
      ) : (
        <Table>
          <thead><tr><th className={th}>Product</th><th className={th}>Type</th><th className={th}>Status</th><th className={th}>Price</th><th className={`${th} text-right`}>Stock</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const prices = p.variants.map((v) => v.priceP);
              const stock = p.variants.reduce((n, v) => n + v.stock, 0);
              const sign = p.zodiacSign ? ZODIAC[p.zodiacSign] : undefined;
              return (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className={td}>
                    {canEdit ? <Link href={routes.adminProduct(p.id)} className="font-medium underline-offset-4 hover:underline">{p.name}</Link> : <span className="font-medium">{p.name}</span>}
                    <span className="block text-xs text-neutral-500">{sign ? `${sign.name} · ${sign.rashi}` : p.slug}</span>
                  </td>
                  <td className={td}>{TYPE_LABEL[p.type] ?? p.type}</td>
                  <td className={td}><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                  <td className={`${td} tabular-nums`}>{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatPrice(prices[0]!) : `${formatPrice(Math.min(...prices))} – ${formatPrice(Math.max(...prices))}`) : "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{stock === 0 ? <Badge tone="red">Sold out</Badge> : stock}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
