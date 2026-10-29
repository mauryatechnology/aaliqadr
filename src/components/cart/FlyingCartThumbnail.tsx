"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASINGS } from "@/config/motion";
import { useReducedMotionPreference } from "@/lib/use-motion";

type FlyItem = {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  imageUrl?: string;
};

export function FlyingCartThumbnail() {
  const reduced = useReducedMotionPreference();
  const [items, setItems] = useState<FlyItem[]>([]);

  useEffect(() => {
    if (reduced) return;

    const handler = (e: CustomEvent<{ startRect: DOMRect; imageUrl?: string }>) => {
      const cartIcon = document.getElementById("header-cart-button");
      if (!cartIcon) return;
      const endRect = cartIcon.getBoundingClientRect();
      const id = `${Date.now()}-${Math.random()}`;

      setItems((prev) => [
        ...prev,
        {
          id,
          startX: e.detail.startRect.left + e.detail.startRect.width / 2,
          startY: e.detail.startRect.top + e.detail.startRect.height / 2,
          endX: endRect.left + endRect.width / 2,
          endY: endRect.top + endRect.height / 2,
          imageUrl: e.detail.imageUrl,
        },
      ]);

      // Trigger cart button pulse once thumbnail reaches icon
      setTimeout(() => {
        cartIcon.dispatchEvent(new CustomEvent("cart-pulse"));
      }, 700);

      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 950);
    };

    window.addEventListener("fly-to-cart", handler as EventListener);
    return () => window.removeEventListener("fly-to-cart", handler as EventListener);
  }, [reduced]);

  if (reduced || items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX - 18,
              y: item.startY - 18,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: item.endX - 18,
              y: item.endY - 18,
              scale: 0.35,
              opacity: 0.8,
            }}
            exit={{ opacity: 0, scale: 0.1 }}
            transition={{
              duration: 0.75,
              ease: EASINGS.luxury,
            }}
            className="fixed size-9 rounded-full border border-gold/60 bg-surface/90 shadow-[0_0_20px_rgba(201,169,110,0.5)] flex items-center justify-center p-1 backdrop-blur-sm"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="size-full object-contain" />
            ) : (
              <span className="size-3 rounded-full bg-gold animate-pulse" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function triggerFlyToCart(sourceEl: HTMLElement, imageUrl?: string) {
  const rect = sourceEl.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent("fly-to-cart", {
      detail: { startRect: rect, imageUrl },
    })
  );
}
