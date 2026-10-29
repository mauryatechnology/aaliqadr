import Link from "next/link";
import type { Route } from "next";
import { getContent } from "@/server/queries/engagement";

/** The strip above the header, written in Admin › Content. Cached; renders nothing when off. */
export async function AnnouncementBar() {
  const { announcement: a } = await getContent();
  if (!a.active || !a.text) return null;
  const text = <span className="font-caps tracking-[0.18em]">{a.text}</span>;
  return (
    <div className="relative z-50 bg-gold px-4 py-2.5 text-center text-xs uppercase tracking-[0.2em] font-medium text-obsidian">
      {a.href ? (a.href.startsWith("/") ? <Link href={a.href as Route} className="hover:underline">{text}</Link> : <a href={a.href} className="hover:underline" rel="noreferrer">{text}</a>) : text}
    </div>
  );
}
