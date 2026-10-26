"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useCartDrawer } from "@/lib/cart-store";

const CartDrawer = dynamic(() => import("./CartDrawer").then((m) => m.CartDrawer), { ssr: false });

/** Loads the cart drawer's code the first time it opens, then keeps it mounted (plan.md §13.1 budget). */
export function CartDrawerHost() {
  const [open] = useCartDrawer();
  const [loaded, setLoaded] = useState(false);
  if (open && !loaded) setLoaded(true);
  return loaded ? <CartDrawer /> : null;
}
