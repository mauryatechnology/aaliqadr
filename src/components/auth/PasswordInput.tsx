"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Password field with a show/hide toggle (plan.md §7). The value is hidden again whenever
 * `hideSignal` changes (pass a counter bumped on submit) and when the page is hidden.
 */
export function PasswordInput({ id, className, hideSignal, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; hideSignal?: number }) {
  const [visible, setVisible] = useState(false);
  const [seenSignal, setSeenSignal] = useState(hideSignal);
  // Re-hide after a submit (a new hideSignal), adjusting state during render.
  if (hideSignal !== seenSignal) {
    setSeenSignal(hideSignal);
    setVisible(false);
  }

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && setVisible(false);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={cn("w-full pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
