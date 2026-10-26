"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "./PasswordInput";

const field = "h-12 rounded-xl border border-white/15 bg-black/30 px-4 text-base text-fg placeholder:text-muted/70 focus:border-gold focus:outline-none";
const primary = "flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 font-caps text-xs uppercase tracking-[0.22em] text-obsidian transition-opacity disabled:opacity-50 cursor-pointer";
const secondary = "flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 font-caps text-xs uppercase tracking-[0.22em] text-fg hover:bg-white/10 transition-colors cursor-pointer";

export function TwoFactorCard({
  initiallyEnabled,
  hasPassword,
}: {
  initiallyEnabled: boolean;
  hasPassword: boolean;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [step, setStep] = useState<"idle" | "password" | "verify" | "codes">("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function startEnable() {
    setError("");
    if (!hasPassword) {
      setError("Please set a password on your account first before enabling 2FA.");
      return;
    }
    setStep("password");
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        const res = await authClient.twoFactor.enable({ password });
        if (res.error) {
          setError(res.error.message || "Incorrect password. Please try again.");
          return;
        }
        if (res.data && "totpURI" in res.data) {
          const totpData = res.data as { totpURI?: string; backupCodes?: string[] };
          setTotpUri(totpData.totpURI || "");
          setBackupCodes(totpData.backupCodes || []);
          setStep("verify");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to initiate 2FA.");
      }
    });
  }

  function submitVerification(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        const res = await authClient.twoFactor.verifyTotp({ code });
        if (res.error) {
          setError(res.error.message || "Invalid 6-digit verification code.");
          return;
        }
        setEnabled(true);
        setStep("codes");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    });
  }

  function disable2Fa() {
    if (!password) {
      setError("Please enter your current password below to confirm disabling 2FA.");
      return;
    }
    setError("");
    start(async () => {
      try {
        const res = await authClient.twoFactor.disable({ password });
        if (res.error) {
          setError(res.error.message || "Incorrect password.");
          return;
        }
        setEnabled(false);
        setStep("idle");
        setPassword("");
        setBackupCodes([]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to disable 2FA.");
      }
    });
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="twofa-h">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="twofa-h" className="font-display text-3xl">Two-factor authentication (2FA)</h2>
          <p className="mt-1 text-sm text-muted">
            Protect your account with an Authenticator app (Google Authenticator, 1Password, Authy).
          </p>
        </div>
        {enabled ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <ShieldCheck className="size-3.5" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <ShieldAlert className="size-3.5" /> Off
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {enabled && step !== "codes" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg/80">
            Two-factor authentication is currently required at sign-in for this account.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-xs text-muted">Enter password to disable 2FA</label>
            <div className="flex flex-wrap items-center gap-3">
              <PasswordInput
                id="disable-2fa-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                className={`${field} max-w-xs`}
              />
              <button
                type="button"
                onClick={disable2Fa}
                disabled={pending || !password}
                className={secondary}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Disable 2FA"}
              </button>
            </div>
          </div>
        </div>
      ) : step === "idle" ? (
        <div>
          <p className="text-sm text-muted">
            Staff and administrator roles require 2FA to access the administrative dashboard.
          </p>
          <button
            type="button"
            onClick={startEnable}
            className={`${primary} mt-4`}
          >
            <KeyRound className="size-4" /> Enable 2FA
          </button>
        </div>
      ) : step === "password" ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          <p className="text-sm text-fg/80">
            Enter your current account password to set up your authenticator app.
          </p>
          <div className="flex flex-col gap-1.5 max-w-sm">
            <label htmlFor="enable-2fa-password" className="text-xs text-muted">Password</label>
            <PasswordInput
              id="enable-2fa-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className={field}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setStep("idle"); setError(""); }}
              className={secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !password}
              className={primary}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
            </button>
          </div>
        </form>
      ) : step === "verify" ? (
        <form onSubmit={submitVerification} className="flex flex-col gap-4">
          <p className="text-sm text-fg/80">
            Scan this TOTP URL in your authenticator app or copy the key below, then enter the 6-digit code.
          </p>
          {totpUri && (
            <div className="rounded-xl border border-white/15 bg-black/40 p-3 font-mono text-xs break-all text-gold select-all">
              {totpUri}
            </div>
          )}
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className="text-xs text-muted">6-digit Authenticator Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="123456"
              required
              className={field}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setStep("idle"); setError(""); }}
              className={secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || code.length < 6}
              className={primary}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Verify & Activate"}
            </button>
          </div>
        </form>
      ) : step === "codes" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="size-5" />
            <span className="font-semibold text-sm">Two-factor authentication is now active!</span>
          </div>
          <p className="text-sm text-muted">
            Save these backup codes in a safe place. You can use them to sign in if you lose access to your device:
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-black/40 p-4 font-mono text-xs text-gold">
            {backupCodes.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyBackupCodes}
              className={secondary}
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy Backup Codes"}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className={primary}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
