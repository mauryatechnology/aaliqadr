import { discountPercent, formatPrice, type Paise } from "@/lib/money";
import { cn } from "@/lib/cn";

export function Price({ priceP, mrpP, from = false, className }: { priceP: Paise; mrpP?: Paise; from?: boolean; className?: string }) {
  const off = mrpP ? discountPercent(mrpP, priceP) : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-xs text-muted">from</span>}
      <span className="font-medium text-fg">{formatPrice(priceP)}</span>
      {off > 0 && mrpP ? (
        <>
          <s className="text-sm text-muted" aria-label={`MRP ${formatPrice(mrpP)}`}>
            {formatPrice(mrpP)}
          </s>
          <span className="text-xs text-accent">{off}% off</span>
        </>
      ) : null}
    </span>
  );
}
