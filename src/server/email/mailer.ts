import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";

/**
 * Transactional email over SMTP (docs/08 §3). `sendMail` never throws into callers: a failed
 * email must not fail an order or a payment. Failures are logged with the recipient masked.
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

export async function sendMail(mail: Mail): Promise<boolean> {
  try {
    await getTransport().sendMail({ from: env.EMAIL_FROM, replyTo: mail.replyTo ?? env.SUPPORT_EMAIL, ...mail });
    return true;
  } catch (err) {
    console.error(JSON.stringify({ evt: "email.failed", to: maskEmail(mail.to), subject: mail.subject, error: (err as Error).message }));
    return false;
  }
}

/** Connection + credentials check without sending anything. */
export async function verifyMailer(): Promise<void> {
  await getTransport().verify();
}
