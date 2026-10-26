"use client";

import { useEffect, useState, useTransition } from "react";
import { Laptop, Loader2, LogOut, Smartphone } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Row = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string; updatedAt?: Date | string };

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function describe(ua?: string | null) {
  if (!ua) return { name: "Unknown device", mobile: false };
  const mobile = /iphone|android|mobile/i.test(ua);
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome\//i.test(ua) ? "Chrome" : /firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : "Browser";
  const os = /windows/i.test(ua) ? "Windows" : /mac os x/i.test(ua) && !mobile ? "macOS" : /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /linux/i.test(ua) ? "Linux" : "";
  return { name: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

/** "Where you're signed in" with sign-out per device and for every other device (plan.md §6.10). */
export function SessionsList({ currentToken }: { currentToken: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    authClient.listSessions().then(({ data }) => setRows(((data ?? []) as Row[]).toSorted((a, b) => (a.token === currentToken ? -1 : b.token === currentToken ? 1 : 0))));

  useEffect(() => {
    load();
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <div className="h-24 animate-pulse rounded-xl bg-white/5" />;
  const others = rows.filter((r) => r.token !== currentToken);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-white/10">
        {rows.map((r) => {
          const d = describe(r.userAgent);
          const Icon = d.mobile ? Smartphone : Laptop;
          const current = r.token === currentToken;
          return (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <Icon className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{d.name} {current && <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">This device</span>}</p>
                <p className="text-xs text-muted">Signed in {dateFmt.format(new Date(r.createdAt))}{r.ipAddress ? ` · ${r.ipAddress}` : ""}</p>
              </div>
              {!current && (
                <button type="button" disabled={pending} onClick={() => start(async () => { await authClient.revokeSession({ token: r.token }); setMsg("Signed out that device."); await load(); })} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/60">
                  Sign out
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <button type="button" disabled={pending} onClick={() => start(async () => { await authClient.revokeOtherSessions(); setMsg("Signed out of every other device."); await load(); })} className="flex items-center gap-2 self-start rounded-full border border-white/20 px-4 py-2 text-sm hover:border-gold/60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Sign out all other devices
        </button>
      )}
      <p aria-live="polite" className="min-h-5 text-sm text-muted">{msg}</p>
    </div>
  );
}
