import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isConfigured } from "@/env";
import { db } from "@/server/db/connect";
import { EmailLog } from "@/server/models/commerce";
import { businessOf, getSettings } from "@/server/services/settings";

/**
 * Transactional email (docs/08 §3): Resend's API when RESEND_API_KEY is set, SMTP otherwise.
 * `sendMail` never throws into callers: a failed email must not fail an order or a payment.
 * Every send is recorded in the email log (plan.md §13.4); console logs mask the recipient.
 */

let transport: Transporter | null = null;

function getTransport(): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: 2,
  });
  return transport;
}

export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** The footer line of every email: the seller's current details from Settings. */
async function withSeller(mail: Mail): Promise<Mail> {
  if (!mail.html.includes(SELLER_MARK)) return mail;
  let line = "";
  try {
    const b = businessOf(await getSettings());
    line = `${b.legalName}, ${b.city}, ${b.state}`.replace(/[<>&"]/g, "");
  } catch {
    // Settings unreachable: the default from config is already in the text part.
  }
  return { ...mail, html: mail.html.replace(SELLER_MARK, line) };
}
export const SELLER_MARK = "<!--seller-->";

async function viaResend(mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [mail.to], reply_to: mail.replyTo ?? env.SUPPORT_EMAIL, subject: mail.subject, html: mail.html, text: mail.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function sendMail(input: Mail): Promise<boolean> {
  const provider = isConfigured("RESEND_API_KEY") ? "resend" : "smtp";
  let error: string | undefined;
  try {
    const mail = await withSeller(input);
    if (provider === "resend") await viaResend(mail);
    else await getTransport().sendMail({ from: env.EMAIL_FROM, replyTo: mail.replyTo ?? env.SUPPORT_EMAIL, ...mail });
  } catch (err) {
    error = (err as Error).message;
    console.error(JSON.stringify({ evt: "email.failed", provider, to: maskEmail(input.to), subject: input.subject, error }));
  }
  try {
    await db();
    await EmailLog.create({ to: input.to, subject: input.subject.slice(0, 200), status: error ? "failed" : "sent", provider, error: error?.slice(0, 300) });
  } catch {
    // The log is best-effort; never fail the caller because of it.
  }
  return !error;
}

/** Connection + credentials check without sending anything. */
export async function verifyMailer(): Promise<void> {
  if (isConfigured("RESEND_API_KEY")) {
    const res = await fetch("https://api.resend.com/domains", { headers: { authorization: `Bearer ${env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return;
  }
  await getTransport().verify();
}
