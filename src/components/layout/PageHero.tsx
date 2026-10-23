import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Parallax } from "@/components/motion/Parallax";

/**
 * Standard page header: an aurora that drifts slower than the page and a title block that
 * lags slightly behind the scroll, so every page opens with the same sense of depth.
 */
export function PageHero({
  eyebrow,
  title,
  children,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header className={cn("relative isolate overflow-clip", className)}>
      <Parallax speed={-0.45} className="absolute inset-x-0 -inset-y-24 -z-10">
        <div aria-hidden className="aurora" />
      </Parallax>
      <Parallax
        speed={-0.15}
        className={cn(
          "mx-auto flex max-w-[1360px] flex-col gap-4 px-4 pb-10 pt-16 sm:px-6 sm:pt-20",
          align === "center" && "max-w-3xl items-center text-center",
        )}
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display text-5xl leading-none sm:text-7xl">{title}</h1>
        {children}
      </Parallax>
    </header>
  );
}
