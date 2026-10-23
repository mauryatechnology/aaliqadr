import sanitizeHtml from "sanitize-html";

/**
 * Product descriptions are written in the admin's rich-text editor and rendered as HTML on the
 * product page, so they are sanitised on the server at save time against a small allowlist
 * (docs/06 §7). Pure, so tests import it directly.
 */

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "h3", "h4", "ul", "ol", "li", "a", "blockquote"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    b: "strong",
    i: "em",
    h1: "h3",
    h2: "h3",
    div: "p",
    a: (tagName, attribs) => ({ tagName, attribs: { href: attribs.href ?? "", rel: "nofollow noopener", target: "_blank" } }),
  },
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeRich(html: string): string {
  const clean = sanitizeHtml(html, OPTIONS);
  return clean.replace(/(<br\s*\/?>\s*){3,}/g, "<br><br>").trim();
}

/** Plain text for meta descriptions, JSON-LD and search. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|h3|h4|li|blockquote)>|<br\s*\/?>/gi, "$& "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text (as the seed and older products store it) → paragraphs of HTML. */
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
