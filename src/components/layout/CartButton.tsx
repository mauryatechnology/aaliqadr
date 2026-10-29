"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cart, useCartCount } from "@/lib/cart-store";
import { cx as cn } from "@/lib/cx";

export interface CartButtonProps {
  className?: string;
  iconClassName?: string;
  id?: string;
  variant?: "header" | "bottomNav";
  title?: string;
}

export function CartButton({
  className,
  iconClassName,
  id = "header-cart-button",
  variant = "header",
  title = "Shopping Bag",
}: CartButtonProps = {}) {
  const count = useCartCount();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const onPulse = () => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 450);
    };
    el.addEventListener("cart-pulse", onPulse);
    return () => el.removeEventListener("cart-pulse", onPulse);
  }, [id]);

  const isBottomNav = variant === "bottomNav";

  return (
    <Link
      id={id}
      href="/cart"
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          cart.openDrawer();
        }
      }}
      className={cn(
        isBottomNav
          ? "relative flex flex-col items-center justify-center text-fg/75 hover:text-gold transition-colors duration-200"
          : "group relative grid size-10 sm:size-11 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] place-items-center rounded-full border border-gold/40 bg-[#121016] text-gold/90 shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:border-gold hover:bg-[#1A1622] hover:text-white hover:shadow-[0_0_18px_rgba(201,169,110,0.45)] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg cursor-pointer",
        pulsing && (isBottomNav ? "scale-110 text-gold" : "scale-110 text-gold-soft drop-shadow-[0_0_16px_rgba(201,169,110,0.9)]"),
        className
      )}
      title={title}
      aria-label={count ? `Shopping Bag, ${count} item${count > 1 ? "s" : ""}` : "Shopping Bag, empty"}
    >
      <ShoppingBag
        className={cn(
          isBottomNav
            ? "size-5 stroke-[1.5]"
            : "size-[17px] sm:size-[18px] stroke-[1.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110",
          iconClassName
        )}
      />
      {count > 0 && (
        <span
          aria-live="polite"
          className={cn(
            isBottomNav
              ? "absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-4 text-obsidian"
              : "absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#FCE59F] via-[#E5B552] to-[#B37F22] px-1.5 text-[10.5px] font-extrabold leading-none text-[#0B0A0F] shadow-[0_2px_8px_rgba(0,0,0,0.8),0_0_12px_rgba(229,181,82,0.9)] ring-2 ring-[#0B0A0F] transition-transform duration-300",
            pulsing && "scale-125"
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
