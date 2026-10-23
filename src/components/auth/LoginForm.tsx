"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useId, useState, useTransition } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/** Passwordless sign-in: email → 6-digit code, or Google (docs/06 §2). */
export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
      if (error) return setError(error.message ?? "We couldn't send a code. Please try again.");
      setStep("code");
      setInfo(`We sent a 6-digit code to ${email.trim()}. It expires in 5 minutes.`);
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
      if (error) return setError(error.message ?? "That code didn't work. Check it and try again.");
      router.replace(safeNext as Route);
      router.refresh();
    });
  }

  function google() {
    setError(null);
    start(async () => {
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: safeNext });
      if (error) setError(error.message ?? "Google sign-in is unavailable right now.");
    });
  }

  return (
    <div className="surface flex flex-col gap-6 p-7 sm:p-9">
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
          <label htmlFor={emailId} className="text-sm font-medium">
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-base text-fg placeholder:text-muted/70 focus:border-gold focus:outline-none"
          />
          <button type="submit" disabled={pending || !email.includes("@")} className="flex h-13 items-center justify-center gap-2 rounded-full bg-gold font-caps text-xs uppercase tracking-[0.22em] text-obsidian transition-opacity disabled:opacity-50">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
          <button type="button" onClick={() => setStep("email")} className="flex items-center gap-2 self-start text-sm text-muted hover:text-fg">
            <ArrowLeft className="size-4" /> Use a different email
          </button>
          <label htmlFor={codeId} className="text-sm font-medium">
            6-digit code
          </label>
          <input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-14 rounded-xl border border-white/15 bg-black/30 px-4 text-center font-mono text-2xl tracking-[0.5em] text-fg focus:border-gold focus:outline-none"
          />
          <button type="submit" disabled={pending || code.length !== 6} className="flex h-13 items-center justify-center gap-2 rounded-full bg-gold font-caps text-xs uppercase tracking-[0.22em] text-obsidian disabled:opacity-50">
            {pending && <Loader2 className="size-4 animate-spin" />} Sign in
          </button>
          <button type="button" onClick={() => sendCode()} disabled={pending} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
            Resend code
          </button>
        </form>
      )}

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-300">{error}</span> : info ? <span className="text-muted">{info}</span> : null}
      </p>

      {googleEnabled && step === "email" && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>
          <button type="button" onClick={google} disabled={pending} className="flex h-13 items-center justify-center gap-3 rounded-full border border-white/20 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}
