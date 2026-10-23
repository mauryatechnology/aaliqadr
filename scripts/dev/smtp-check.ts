// Verifies SMTP host and credentials (no email is sent).
import { verifyMailer } from "@/server/email/mailer";
import { env } from "@/env";
verifyMailer()
  .then(() => console.log(`SMTP ok (${env.SMTP_HOST}:${env.SMTP_PORT}); from = ${env.EMAIL_FROM}`))
  .catch((e: Error) => console.log("SMTP ERROR:", e.message))
  .finally(() => process.exit(0));
