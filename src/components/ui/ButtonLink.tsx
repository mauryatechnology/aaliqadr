import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Props = ComponentProps<typeof Link> & { variant?: "primary" | "ghost" };

/** Pill CTA. Primary uses the active sign's colour, so it adapts inside any ZodiacScope. */
export function ButtonLink({ variant = "primary", className, style, ...props }: Props) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 font-caps text-[0.7rem] uppercase tracking-[0.24em] transition-[transform,background-color,box-shadow,color] duration-300 ease-ember hover:-translate-y-0.5",
        variant === "ghost" && "border border-[color-mix(in_oklab,var(--z-accent)_45%,transparent)] text-fg hover:bg-white/5",
        className,
      )}
      style={variant === "primary" ? { background: "var(--z-primary)", color: "var(--z-on-primary)", boxShadow: "0 12px 40px -14px var(--z-glow)", ...style } : style}
    />
  );
}
