import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

/**
 * Standard Luxury Button System (Phase 3 Standardized Interactive Elements)
 * - Clear primary, secondary, ghost, and dark variants
 * - Min 44x44px touch target on all sizes (WCAG 2.5.5)
 * - Visible keyboard tab focus (:focus-visible)
 * - Smooth 150-250ms transitions with active press states
 * - Accessible disabled & loading states
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          // Base: Touch target min 44px, typography, flex centering, smooth transition
          "inline-flex items-center justify-center gap-2 rounded-full font-caps font-semibold uppercase select-none cursor-pointer",
          "transition-all duration-200 ease-lux",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none disabled:shadow-none",

          // Sizes (All enforce min-h-[44px] min-w-[44px])
          size === "sm" && "min-h-[44px] min-w-[44px] px-5 py-2 text-xs tracking-[0.16em]",
          size === "md" && "min-h-[44px] min-w-[44px] px-7 py-3 text-xs sm:text-[13px] tracking-[0.18em]",
          size === "lg" && "min-h-[48px] min-w-[48px] px-9 py-3.5 text-xs sm:text-sm tracking-[0.20em]",

          // Variants
          variant === "primary" && [
            "bg-gold text-[#0B0A0F] shadow-[0_4px_18px_rgba(201,169,110,0.25)]",
            "hover:bg-[#E0C892] hover:shadow-[0_6px_26px_rgba(201,169,110,0.4)] hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-98 active:bg-[#9C7F4C]",
            "focus-visible:ring-gold focus-visible:ring-offset-bg",
          ],

          variant === "secondary" && [
            "border border-gold/40 bg-surface/50 text-ivory",
            "hover:border-gold hover:text-gold hover:bg-gold/10 hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-98 active:border-[#9C7F4C]",
            "focus-visible:ring-gold focus-visible:ring-offset-bg",
          ],

          variant === "ghost" && [
            "text-gold bg-transparent",
            "hover:bg-gold/10 hover:text-gold-soft",
            "active:scale-98 active:bg-gold/15",
            "focus-visible:ring-gold focus-visible:ring-offset-bg",
          ],

          variant === "dark" && [
            "bg-[#1A1612] text-[#FAF7F2] border border-[#1A1612]",
            "hover:bg-[#73531F] hover:border-[#73531F] hover:shadow-[0_6px_20px_rgba(115,83,31,0.25)] hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-98 active:bg-[#5C4218]",
            "focus-visible:ring-[#73531F] focus-visible:ring-offset-[#FAF7F2]",
          ],

          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="size-4 animate-spin stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

