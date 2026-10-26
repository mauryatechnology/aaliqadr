import "server-only";
import { createHash } from "node:crypto";

/**
 * Password policy (plan.md §6.7): 12–128 characters, not a known-breached password.
 * The breach check uses Have I Been Pwned's k-anonymity range API: only the first five
 * characters of the SHA-1 hash leave the server, never the password.
 */

export const PASSWORD_MIN = 12;

export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(2500), cache: "no-store" });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    // The check is a safeguard, not a gate: if the service is unreachable, length rules still apply.
    return false;
  }
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > 128) return "Use at most 128 characters.";
  if (/^(.)\1+$/.test(password)) return "Avoid repeating one character.";
  return null;
}
