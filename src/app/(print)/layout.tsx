/** Paper-style pages (invoices, packing slips): no storefront chrome, white ground. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white text-neutral-900 [color-scheme:light]">{children}</div>;
}
