import "server-only";
import { formatPrice } from "@/lib/money";
import type { Mail } from "./mailer";

/**
 * Email templates (docs/08 §3.2). Table-based, inline styles, dark-on-ivory so they render the
 * same in Gmail, Outlook and Apple Mail (light and dark). Every template has a text part.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  const button = cta
    ? `<tr><td style="padding:8px 0 24px"><a href="${esc(cta.href)}" style="display:inline-block;background:#0B0A0F;color:#F5F0E6;text-decoration:none;font:600 13px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:16px 28px;border-radius:999px">${esc(cta.label)}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#F5F0E6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E7DCC2;border-radius:16px">
<tr><td style="padding:28px 32px;border-bottom:1px solid #EFE6D2;font:600 18px/1 Georgia,serif;letter-spacing:6px;color:#9C7A2E">AALIQADR</td></tr>
<tr><td style="padding:28px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font:500 26px/1.25 Georgia,serif;color:#1A1714;padding-bottom:16px">${esc(title)}</td></tr>
${bodyHtml}
${button}
</table></td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #EFE6D2;font:13px/1.6 Arial,sans-serif;color:#6B645B"><!--seller--><br>Questions? Reply to this email.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<tr><td style="font:16px/1.65 Arial,sans-serif;color:#3A352F;padding-bottom:14px">${html}</td></tr>`;

export function otpEmail(to: string, otp: string): Mail {
  return {
    to,
    subject: `${otp} is your Aaliqadr sign-in code`,
    html: layout(
      "Your sign-in code",
      p("Enter this code to sign in. It expires in 5 minutes.") +
        `<tr><td style="padding:8px 0 20px;font:600 34px/1 'Courier New',monospace;letter-spacing:10px;color:#1A1714">${esc(otp)}</td></tr>` +
        p("If you didn't ask for this, you can ignore this email."),
    ),
    text: `Your Aaliqadr sign-in code is ${otp}. It expires in 5 minutes. If you didn't ask for this, ignore this email.`,
  };
}

export interface OrderEmailData {
  orderId: string;
  name: string;
  email: string;
  totalP: number;
  paymentMethod: "razorpay" | "cod";
  items: { name: string; variantLabel: string; qty: number; lineTotalP: number; image?: string }[];
  url: string;
}

function itemsTable(o: OrderEmailData): string {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="font:15px/1.5 Arial,sans-serif;color:#3A352F;padding:8px 0;border-bottom:1px solid #EFE6D2">${i.image && /^https:\/\//.test(i.image) ? `<img src="${esc(i.image)}" width="40" height="50" alt="" style="vertical-align:middle;border-radius:6px;object-fit:cover;margin-right:10px">` : ""}${esc(i.name)} · ${esc(i.variantLabel)} × ${i.qty}</td><td align="right" style="font:15px/1.5 Arial,sans-serif;color:#1A1714;padding:8px 0;border-bottom:1px solid #EFE6D2">${formatPrice(i.lineTotalP)}</td></tr>`,
    )
    .join("");
  return `<tr><td style="padding-bottom:18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}<tr><td style="font:600 16px/1.5 Arial,sans-serif;color:#1A1714;padding-top:12px">Total</td><td align="right" style="font:600 16px/1.5 Arial,sans-serif;color:#1A1714;padding-top:12px">${formatPrice(o.totalP)}</td></tr></table></td></tr>`;
}

export function orderConfirmedEmail(o: OrderEmailData): Mail {
  const pay = o.paymentMethod === "cod" ? "You'll pay in cash on delivery." : "Your payment was received.";
  return {
    to: o.email,
    subject: `Order ${o.orderId} confirmed`,
    html: layout(`Thank you, ${o.name.split(" ")[0] ?? o.name}`, p(`Your order <b>${esc(o.orderId)}</b> is confirmed. ${pay}`) + itemsTable(o) + p("We'll email you again when it ships."), {
      label: "View your order",
      href: o.url,
    }),
    text: `Order ${o.orderId} confirmed. ${pay} Total ${formatPrice(o.totalP)}. Track it at ${o.url}`,
  };
}

export function orderShippedEmail(o: Pick<OrderEmailData, "orderId" | "name" | "email" | "url"> & { courier?: string; awb?: string; trackingUrl?: string }): Mail {
  const track = o.courier || o.awb ? `${esc(o.courier ?? "Courier")}${o.awb ? `, tracking number <b>${esc(o.awb)}</b>` : ""}.` : "";
  return {
    to: o.email,
    subject: `Your order ${o.orderId} is on its way`,
    html: layout("Your fragrance is on its way", p(`Order <b>${esc(o.orderId)}</b> has shipped. ${track}`), {
      label: o.trackingUrl ? "Track shipment" : "View your order",
      href: o.trackingUrl ?? o.url,
    }),
    text: `Order ${o.orderId} has shipped${o.awb ? ` (${o.courier ?? "courier"} ${o.awb})` : ""}. ${o.trackingUrl ?? o.url}`,
  };
}

export function orderDeliveredEmail(o: Pick<OrderEmailData, "orderId" | "name" | "email" | "url">): Mail {
  return {
    to: o.email,
    subject: `Order ${o.orderId} delivered`,
    html: layout(
      "Delivered. Enjoy.",
      p(`Order <b>${esc(o.orderId)}</b> was delivered. If anything arrived damaged or leaked, tell us within 48 hours with an unboxing video and we'll replace it.`),
      { label: "View your order", href: o.url },
    ),
    text: `Order ${o.orderId} was delivered. Damaged or leaked? Tell us within 48 hours with an unboxing video. ${o.url}`,
  };
}

export function orderCancelledEmail(o: Pick<OrderEmailData, "orderId" | "name" | "email" | "url"> & { refunded: boolean }): Mail {
  const refund = o.refunded ? "Your refund has been initiated and usually reflects in 5–7 bank working days." : "";
  return {
    to: o.email,
    subject: `Order ${o.orderId} cancelled`,
    html: layout("Your order was cancelled", p(`Order <b>${esc(o.orderId)}</b> has been cancelled. ${refund}`), { label: "View your order", href: o.url }),
    text: `Order ${o.orderId} has been cancelled. ${refund} ${o.url}`,
  };
}

export function adminNewOrderEmail(to: string, o: OrderEmailData & { adminUrl: string }): Mail {
  return {
    to,
    subject: `New order ${o.orderId} · ${formatPrice(o.totalP)} · ${o.paymentMethod === "cod" ? "COD" : "Prepaid"}`,
    html: layout(`New order ${o.orderId}`, p(`${esc(o.name)} (${esc(o.email)})`) + itemsTable(o), { label: "Open in admin", href: o.adminUrl }),
    text: `New order ${o.orderId} from ${o.name}: ${formatPrice(o.totalP)}. ${o.adminUrl}`,
  };
}

const RETURN_COPY: Record<string, { title: string; body: string }> = {
  requested: { title: "We've received your request", body: "Our team will look at your photos and video and reply within 2 working days." },
  approved: { title: "Your request is approved", body: "We'll make this right. You'll hear from us again as soon as it's on its way." },
  rejected: { title: "About your request", body: "We weren't able to approve this request. The note below explains why; reply to this email if you'd like us to look again." },
  received: { title: "We've received the item", body: "Thank you for sending it back. We're completing your refund or replacement now." },
  refunded: { title: "Your refund is on its way", body: "Refunds reach the original payment method in 5–7 bank working days." },
  replaced: { title: "Your replacement has shipped", body: "A fresh one is on its way to you." },
  closed: { title: "Your request is closed", body: "Thank you for your patience." },
};

/** Customer update for a return / damage claim (docs/08 §5). */
export function returnUpdateEmail(r: { id: string; orderId: string; name: string; email: string; status: string; note?: string; refundP?: number; awb?: string; url: string }): Mail {
  const copy = RETURN_COPY[r.status] ?? { title: "An update on your request", body: "" };
  const extra = [
    r.status === "refunded" && r.refundP ? `Refund amount: <strong>${formatPrice(r.refundP)}</strong>.` : "",
    r.awb ? `Tracking number: <strong>${esc(r.awb)}</strong>.` : "",
    r.note ? esc(r.note) : "",
  ].filter(Boolean);
  return {
    to: r.email,
    subject: `${copy.title} · ${r.id} (order ${r.orderId})`,
    html: layout(copy.title, p(`Hi ${esc(r.name.split(" ")[0] ?? r.name)},`) + p(copy.body) + extra.map((x) => p(x)).join(""), { label: "View your order", href: r.url }),
    text: `${copy.title}\n\n${copy.body}\n${extra.join("\n").replace(/<[^>]+>/g, "")}\n\nRequest ${r.id} for order ${r.orderId}: ${r.url}`,
  };
}

export function adminNewReturnEmail(to: string, r: { id: string; orderId: string; reason: string; name: string; adminUrl: string }): Mail {
  return {
    to,
    subject: `New claim ${r.id} on ${r.orderId}: ${r.reason}`,
    html: layout(`New claim ${r.id}`, p(`${esc(r.name)} reported a problem with order ${esc(r.orderId)}: <strong>${esc(r.reason)}</strong>.`), { label: "Review the claim", href: r.adminUrl }),
    text: `${r.name} reported "${r.reason}" on order ${r.orderId}. Review: ${r.adminUrl}`,
  };
}

export function passwordResetEmail(to: string, url: string): Mail {
  return {
    to,
    subject: "Reset your Aaliqadr password",
    html: layout(
      "Reset your password",
      p("Someone asked to reset the password for this account. If it was you, use the button below. The link works once and expires in 30 minutes.") +
        p("If you didn't ask for this, ignore this email; your password stays the same."),
      { label: "Choose a new password", href: url },
    ),
    text: `Reset your Aaliqadr password (link works once, expires in 30 minutes): ${url}\n\nIf you didn't ask for this, ignore this email.`,
  };
}

// ── Alerts and requests (plan.md §10.3, §11.3) ───────────────────────────────

export function backInStockEmail(to: string, x: { name: string; variant: string; url: string }): Mail {
  return {
    to,
    subject: `${x.name} (${x.variant}) is back in stock`,
    html: layout("It's back", p(`${esc(x.name)}, ${esc(x.variant)}, is available again. Stock is limited, so it may not last.`) + p("You asked us to tell you; we won't email you about it again."), { label: "Shop it now", href: x.url }),
    text: `${x.name} (${x.variant}) is back in stock: ${x.url}`,
  };
}

export function priceDropEmail(to: string, x: { name: string; fromP: number; toP: number; url: string }): Mail {
  return {
    to,
    subject: `Price drop: ${x.name} is now ${formatPrice(x.toP)}`,
    html: layout("A price drop on your wishlist", p(`${esc(x.name)} is now <strong>${formatPrice(x.toP)}</strong> (was ${formatPrice(x.fromP)} when you saved it).`) + p("Turn these alerts off any time from your wishlist."), { label: "See it", href: x.url }),
    text: `${x.name} is now ${formatPrice(x.toP)} (was ${formatPrice(x.fromP)}): ${x.url}`,
  };
}

export function reviewRequestEmail(to: string, x: { name: string; products: string[]; url: string }): Mail {
  const list = x.products.slice(0, 3).join(", ");
  return {
    to,
    subject: `How is ${x.products[0] ?? "your fragrance"} wearing?`,
    html: layout("How is it wearing?", p(`Hi ${esc(x.name.split(" ")[0] ?? x.name)},`) + p(`You've had ${esc(list)} for a week now. A short review helps other people find their scent, and we read every one.`), { label: "Write a review", href: x.url }),
    text: `How is ${list} wearing? Write a review: ${x.url}`,
  };
}

export function questionAnsweredEmail(to: string, x: { product: string; question: string; answer: string; url: string }): Mail {
  return {
    to,
    subject: `Your question about ${x.product} has an answer`,
    html: layout("We answered your question", p(`<em>${esc(x.question)}</em>`) + p(esc(x.answer)), { label: "See it on the product page", href: x.url }),
    text: `Q: ${x.question}\nA: ${x.answer}\n${x.url}`,
  };
}
