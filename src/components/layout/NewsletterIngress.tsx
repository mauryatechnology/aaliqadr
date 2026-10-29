"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * The Celestial Ingress (Private Salon Newsletter Client Form)
 * - UX Phase 5: Form validation, loading state, error/success feedback
 * - Interactive salon invitation with instant visual confirmation
 */
export function NewsletterIngress() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setStatus("error");
      setErrorMessage("Please enter an email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    // Simulate luxury salon allocation
    setTimeout(() => {
      setStatus("success");
    }, 600);
  };

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-xl border border-gold/40 bg-gold/[0.08] p-4 text-center sm:text-left transition-all animate-in fade-in"
      >
        <div className="flex items-center gap-2.5 text-gold font-medium">
          <Check className="size-4 shrink-0 stroke-[2.5]" />
          <span className="font-caps text-xs uppercase tracking-wider">
            Ingress Confirmed
          </span>
        </div>
        <p className="mt-1 text-xs text-ivory/90 leading-relaxed font-light">
          Welcome to the Private Solstice Salon. Batch allocations and seasonal astrological insights will be dispatched to <strong className="text-gold font-medium">{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
      <div className="relative flex items-center border border-gold/30 bg-surface/60 p-1 backdrop-blur-md transition-all duration-200 focus-within:border-gold focus-within:shadow-[0_0_16px_rgba(201,169,110,0.2)]">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "loading"}
          placeholder="Enter email for private salon ingress..."
          aria-label="Email address for private salon ingress"
          aria-invalid={status === "error"}
          className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm font-light text-ivory placeholder:text-muted/70 focus:outline-none min-h-[44px]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="font-caps shrink-0 border border-gold/40 bg-gold/15 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-gold font-semibold transition-all duration-200 hover:border-gold hover:bg-gold hover:text-[#0B0A0F] active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Joining...</span>
            </span>
          ) : (
            <span>Join Ingress →</span>
          )}
        </button>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="mt-1.5 text-xs text-red-400 font-medium transition-all"
        >
          {errorMessage}
        </p>
      )}

      <span className="font-sans mt-2 block text-xs text-muted/80 text-center lg:text-left">
        Quiet discretion assured. No unsolicited communications.
      </span>
    </form>
  );
}

