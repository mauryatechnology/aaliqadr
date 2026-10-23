"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, Quote, RemoveFormatting, Underline } from "lucide-react";

/**
 * Lightweight rich-text editor for product descriptions: a contentEditable with a small
 * toolbar. The server sanitises the HTML on save (server/catalog/rich-text.ts), so the
 * browser's markup quirks never reach the store.
 */
export function RichText({ value, onChange, label, minHeight = 180 }: { value: string; onChange: (html: string) => void; label: string; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  // Only push outside changes into the DOM (typing would otherwise reset the caret).
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  function run(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function link() {
    const url = window.prompt("Link address (https://…)", "https://");
    if (url && /^https:\/\/\S+$/.test(url)) run("createLink", url);
  }

  const tools: { Icon: typeof Bold; label: string; cmd: string; arg?: string }[] = [
    { Icon: Bold, label: "Bold", cmd: "bold" },
    { Icon: Italic, label: "Italic", cmd: "italic" },
    { Icon: Underline, label: "Underline", cmd: "underline" },
    { Icon: Heading3, label: "Heading", cmd: "formatBlock", arg: "h3" },
    { Icon: List, label: "Bulleted list", cmd: "insertUnorderedList" },
    { Icon: ListOrdered, label: "Numbered list", cmd: "insertOrderedList" },
    { Icon: Quote, label: "Quote", cmd: "formatBlock", arg: "blockquote" },
    { Icon: Link2, label: "Link", cmd: "link" },
    { Icon: RemoveFormatting, label: "Clear formatting", cmd: "clear" },
  ];

  function onTool(cmd: string, arg?: string) {
    if (cmd === "link") link();
    else if (cmd === "clear") {
      run("removeFormat");
      run("formatBlock", "p");
    } else run(cmd, arg);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
      <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-0.5 border-b border-neutral-200 bg-neutral-50 p-1">
        {tools.map(({ Icon, label: l, cmd, arg }) => (
          <button key={l} type="button" title={l} aria-label={l} onMouseDown={(e) => e.preventDefault()} onClick={() => onTool(cmd, arg)} className="rounded p-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900">
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={(e) => {
          // Paste as plain text: formatting from Word or web pages is noise here.
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        style={{ minHeight }}
        className="prose-admin max-w-none px-3 py-2 text-sm leading-relaxed text-neutral-900 outline-none [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc"
      />
    </div>
  );
}
