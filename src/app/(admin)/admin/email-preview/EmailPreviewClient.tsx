"use client";

import { useState } from "react";
import { Mail, Copy, Check, Smartphone, Monitor } from "lucide-react";

interface TemplateItem {
  id: string;
  label: string;
  mail: {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
}

export function EmailPreviewClient({ templates }: { templates: TemplateItem[] }) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || "");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile" | "text">("desktop");
  const [copied, setCopied] = useState(false);

  const current = templates.find((t) => t.id === selectedId) || templates[0];
  if (!current) return null;

  function copyText() {
    if (!current) return;
    navigator.clipboard.writeText(current.mail.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Template Selectors */}
      <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              selectedId === t.id
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header Info & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-neutral-500" />
            <span className="text-xs text-neutral-500 font-medium">To: {current.mail.to}</span>
          </div>
          <p className="mt-1 font-semibold text-neutral-900 text-sm">
            Subject: {current.mail.subject}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-100">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                viewMode === "desktop" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Monitor className="size-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                viewMode === "mobile" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Smartphone className="size-3.5" /> Mobile (390px)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                viewMode === "text" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Plain Text
            </button>
          </div>

          {viewMode === "text" && (
            <button
              type="button"
              onClick={copyText}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex justify-center rounded-xl border border-neutral-200 bg-neutral-100/70 p-4 min-h-[550px]">
        {viewMode === "text" ? (
          <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 font-mono text-xs whitespace-pre-wrap text-neutral-800 shadow-sm leading-relaxed">
            {current.mail.text}
          </div>
        ) : (
          <div
            className={`transition-all duration-200 rounded-xl overflow-hidden shadow-md border border-neutral-300 bg-white ${
              viewMode === "mobile" ? "w-[390px]" : "w-full max-w-[640px]"
            }`}
          >
            <iframe
              srcDoc={current.mail.html}
              title={current.label}
              className="h-[600px] w-full border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
