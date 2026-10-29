import type { ProductCardDTO } from "@/server/catalog/types";
import { cn } from "@/lib/cn";
import { ProductCard } from "./ProductCard";

/** The standard card grid used by shop, category, collection and search pages. */
export function ProductGrid({
  items,
  eager = 4,
  className,
}: {
  items: ProductCardDTO[];
  eager?: number;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
