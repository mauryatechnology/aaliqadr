import { formatPrice, type Paise } from "@/lib/money";
import { cx as cn } from "@/lib/cx";

export function Price({
  priceP,
  from = false,
  className,
}: {
  priceP: Paise;
  mrpP?: Paise;
  from?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 text-ivory", className)}>
      {from && <span className="text-xs text-muted font-normal">from</span>}
      <span className="font-display font-medium text-ivory">{formatPrice(priceP)}</span>
    </span>
  );
}

