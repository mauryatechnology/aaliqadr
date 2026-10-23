import type { ProductCardDTO } from "@/server/catalog/types";
import { ProductCard } from "./ProductCard";

/** The standard card grid used by shop, category, collection and search pages. */
export function ProductGrid({ items, eager = 4 }: { items: ProductCardDTO[]; eager?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
