import "server-only";
import { site } from "@/config/site";
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
<tr><td style="padding:20px 32px 28px;border-top:1px solid #EFE6D2;font:13px/1.6 Arial,sans-serif;color:#6B645B">${esc(site.legal.legalName)}, ${esc(site.legal.city)}, ${esc(site.legal.state)}<br>Questions? Reply to this email.</td></tr>
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
  items: { name: string; variantLabel: string; qty: number; lineTotalP: number }[];
  url: string;
}

function itemsTable(o: OrderEmailData): string {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="font:15px/1.5 Arial,sans-serif;color:#3A352F;padding:8px 0;border-bottom:1px solid #EFE6D2">${esc(i.name)} · ${esc(i.variantLabel)} × ${i.qty}</td><td align="right" style="font:15px/1.5 Arial,sans-serif;color:#1A1714;padding:8px 0;border-bottom:1px solid #EFE6D2">${formatPrice(i.lineTotalP)}</td></tr>`,
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
