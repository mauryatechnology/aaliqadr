"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { setMyPasswordAction } from "@/actions/account";
import { PasswordInput } from "./PasswordInput";

const field = "h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-base text-fg placeholder:text-muted/70 focus:border-gold focus:outline-none";
const primary = "flex h-13 items-center justify-center gap-2 rounded-full bg-gold font-caps text-xs uppercase tracking-[0.22em] text-obsidian transition-opacity disabled:opacity-50";

/** Simple strength hint: length plus character variety (the server enforces the real policy). */
function strength(p: string): { label: string; pct: number } {
  if (!p) return { label: "", pct: 0 };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  const score = Math.min(4, Math.floor(p.length / 4) + variety - 2);
  return [{ label: "Too short", pct: 15 }, { label: "Weak", pct: 30 }, { label: "Fair", pct: 55 }, { label: "Good", pct: 80 }, { label: "Strong", pct: 100 }][Math.max(0, p.length < 12 ? 0 : score)]!;
}

function NewPasswordFields({ password, setPassword, confirm, setConfirm, hideSignal }: { password: string; setPassword: (v: string) => void; confirm: string; setConfirm: (v: string) => void; hideSignal: number }) {
  const a = useId();
  const b = useId();
  const s = strength(password);
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={a} className="text-sm font-medium">New password</label>
        <PasswordInput id={a} hideSignal={hideSignal} autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className={field} aria-describedby={`${a}-hint`} />
        <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${s.pct}%` }} /></div>
        <p id={`${a}-hint`} className="text-xs text-muted">At least 12 characters. A short phrase is easy to remember and hard to guess.{s.label ? ` Strength: ${s.label}.` : ""}</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={b} className="text-sm font-medium">Confirm new password</label>
        <PasswordInput id={b} hideSignal={hideSignal} autoComplete="new-password" maxLength={128} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
      </div>
    </>
  );
}

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const id = useId();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (sent)
    return (
      <div className="surface flex flex-col gap-4 p-7 text-center sm:p-9">
        <Mail className="mx-auto size-8 text-gold" aria-hidden />
        <p>If an account exists for <strong>{email}</strong>, we&apos;ve emailed a link to choose a new password. It works once and expires in 30 minutes.</p>
        <Link href="/login" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">Back to sign in</Link>
      </div>
    );
  return (
    <form
      className="surface flex flex-col gap-4 p-7 sm:p-9"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const { error: err } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
          // Same answer whether or not the account exists (no account enumeration).
          if (err?.status === 429) return setError("Too many requests. Please try again in an hour.");
          setSent(true);
        });
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">Email address</label>
      <input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="you@example.com" />
      <button type="submit" disabled={pending || !email.includes("@")} className={primary}>{pending && <Loader2 className="size-4 animate-spin" />} Email me a reset link</button>
      <p aria-live="polite" className="min-h-5 text-sm text-red-300">{error}</p>
      <p className="text-sm text-muted">No password yet? <Link href="/login" className="underline underline-offset-4 hover:text-fg">Sign in with an email code</Link>, then set one under Account › Security.</p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hide, setHide] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (!token) return <p className="surface p-7 text-sm">This reset link is incomplete. <Link href="/forgot-password" className="underline">Request a new one</Link>.</p>;
  if (done)
    return (
      <div className="surface flex flex-col items-center gap-4 p-7 text-center sm:p-9">
        <Check className="size-8 text-gold" aria-hidden />
        <p>Your password has been changed and you&apos;ve been signed out everywhere.</p>
        <button type="button" className={`${primary} w-full`} onClick={() => router.replace("/login")}>Sign in</button>
      </div>
    );
  return (
    <form
      className="surface flex flex-col gap-4 p-7 sm:p-9"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setHide((n) => n + 1);
        if (password !== confirm) return setError("The two passwords don't match.");
        start(async () => {
          const { error: err } = await authClient.resetPassword({ newPassword: password, token });
          if (err) return setError(err.message?.includes("token") || err.message?.includes("TOKEN") ? "This link has expired or was already used. Request a new one." : (err.message ?? "That didn't work. Please try again."));
          setDone(true);
        });
      }}
    >
      <NewPasswordFields password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} hideSignal={hide} />
      <button type="submit" disabled={pending || password.length < 12} className={primary}>{pending && <Loader2 className="size-4 animate-spin" />} Save new password</button>
      <p aria-live="polite" className="min-h-5 text-sm text-red-300">{error}</p>
    </form>
  );
}

/** Account › Security: set a first password (OTP/Google accounts) or change the current one. */
export function AccountPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const currentId = useId();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hide, setHide] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        setHide((n) => n + 1);
        if (password !== confirm) return setMsg({ ok: false, text: "The two passwords don't match." });
        start(async () => {
          if (hasPassword) {
            const { error } = await authClient.changePassword({ currentPassword: current, newPassword: password, revokeOtherSessions: true });
            if (error) return setMsg({ ok: false, text: error.status === 400 && /password/i.test(error.message ?? "") ? (error.message ?? "") : "Your current password isn't right." });
          } else {
            const res = await setMyPasswordAction(password);
            if (!res.ok) return setMsg({ ok: false, text: res.error });
          }
          setCurrent("");
          setPassword("");
          setConfirm("");
          setMsg({ ok: true, text: hasPassword ? "Password changed. Other devices were signed out." : "Password set. You can now sign in with it." });
          router.refresh();
        });
      }}
    >
      {hasPassword && (
        <div className="flex flex-col gap-2">
          <label htmlFor={currentId} className="text-sm font-medium">Current password</label>
          <PasswordInput id={currentId} hideSignal={hide} autoComplete="current-password" maxLength={128} required value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
        </div>
      )}
      <NewPasswordFields password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} hideSignal={hide} />
      <button type="submit" disabled={pending || password.length < 12} className={`${primary} sm:w-64`}>{pending && <Loader2 className="size-4 animate-spin" />} {hasPassword ? "Change password" : "Set password"}</button>
      <p aria-live="polite" className={`min-h-5 text-sm ${msg?.ok ? "text-emerald-300" : "text-red-300"}`}>{msg?.text}</p>
    </form>
  );
}
