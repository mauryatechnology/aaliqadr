"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, X } from "lucide-react";
import type { ChecklistItem } from "@/lib/publish-checklist";
import { cn } from "@/lib/cn";

/**
 * Save-bar summary of what stops this product going live (blockers) and what would make it
 * better (warnings), plus problems the server returned, each linking to its editor section.
 */
export function PublishChecklist({ items, serverIssues, status, onJump }: { items: ChecklistItem[]; serverIssues: { message: string; section: string }[]; status: string; onJump?: (section: string) => void }) {
  const [open, setOpen] = useState(false);
  const block = items.filter((i) => i.level === "blocker");
  const warn = items.filter((i) => i.level === "warning");
  const all = [...serverIssues.map((i) => ({ ...i, level: "blocker" as const })), ...items];
  const label = serverIssues.length ? `${serverIssues.length} to fix` : block.length ? `${block.length} before going live` : warn.length ? `Ready · ${warn.length} tip${warn.length === 1 ? "" : "s"}` : "Ready to go live";
  const tone = serverIssues.length || (block.length && status === "active") ? "text-red-700 border-red-200 bg-red-50" : block.length ? "text-amber-800 border-amber-200 bg-amber-50" : "text-emerald-800 border-emerald-200 bg-emerald-50";
  const Icon = serverIssues.length || block.length ? CircleAlert : warn.length ? AlertTriangle : CheckCircle2;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium", tone)}>
        <Icon className="size-4" aria-hidden /> {label}
      </button>
      {open && all.length > 0 && (
        <div role="dialog" aria-label="Publish checklist" className="absolute bottom-12 left-0 z-30 w-[min(92vw,420px)] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Publish checklist</p>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-neutral-100"><X className="size-4" /></button>
          </div>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm">
            {all.map((i, n) => (
              <li key={n}>
                <a
                  href={`#${i.section}`}
                  onClick={(e) => {
                    if (onJump) {
                      e.preventDefault();
                      onJump(i.section);
                    }
                    setOpen(false);
                  }}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50"
                >
                  {i.level === "blocker" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-label="Blocker" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Tip" />}
                  <span>{i.message}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">Blockers only stop &quot;Active&quot;; you can always save a draft.</p>
        </div>
      )}
    </div>
  );
}
