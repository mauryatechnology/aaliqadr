/**
 * Class joining for client components on every page: plain clsx, without tailwind-merge
 * (8.5 KB gzip). Use `cn` from "@/lib/cn" only where later classes must override earlier
 * conflicting ones (server components pay nothing for it).
 */
export { clsx as cx } from "clsx";
