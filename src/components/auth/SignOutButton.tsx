"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        })
      }
      className={cn("flex items-center gap-2 text-sm text-muted hover:text-fg disabled:opacity-60", className)}
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}
