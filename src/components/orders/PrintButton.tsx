"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white print:hidden">
      Print / Save as PDF
    </button>
  );
}
