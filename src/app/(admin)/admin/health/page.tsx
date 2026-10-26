import { Suspense } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Database, Mail, CreditCard, Shield, Server, Clock, RefreshCw } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { getSystemHealth } from "@/server/admin/health";
import { AdminSkeleton, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "System health" };

const ICON_MAP = {
  database: Database,
  mail: Mail,
  payments: CreditCard,
  auth: Shield,
  blob: Server,
};

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <SystemHealth />
    </Suspense>
  );
}

async function SystemHealth() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can view system health.</p>;

  const health = await getSystemHealth();

  return (
    <>
      <PageHeader
        title="System health"
        description="Live integration status, background job status and operational queues."
      />

      <div className="flex flex-col gap-6">
        {/* Overall Status Banner */}
        <div className={`flex items-center justify-between rounded-xl border p-4 ${health.dbOk ? "border-emerald-200 bg-emerald-50/70" : "border-red-200 bg-red-50/70"}`}>
          <div className="flex items-center gap-3">
            {health.dbOk ? (
              <CheckCircle2 className="size-6 text-emerald-600" />
            ) : (
              <XCircle className="size-6 text-red-600" />
            )}
            <div>
              <p className="font-semibold text-neutral-900">
                {health.dbOk ? "All Core Systems Operational" : "System Degraded"}
              </p>
              <p className="text-xs text-neutral-600">
                Database Ping: {health.pingMs} ms
              </p>
            </div>
          </div>
          <span className="text-xs text-neutral-500 font-mono">Next.js 16.4</span>
        </div>

        {/* Operational Queues Strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-xs text-neutral-500">Orders to Dispatch</span>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{health.pendingOrders}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-xs text-neutral-500">Open Claims & Returns</span>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{health.openClaims}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-xs text-neutral-500">Reviews Awaiting Moderation</span>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{health.pendingReviews}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-xs text-neutral-500">Active Catalogue Products</span>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{health.productCount}</p>
          </div>
        </div>

        {/* Integrations List */}
        <Card title="Connected Integrations">
          <div className="flex flex-col divide-y divide-neutral-100">
            {health.integrations.map((item) => {
              const Icon = ICON_MAP[item.kind] || Server;
              return (
                <div key={item.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                      <p className="text-xs text-neutral-500">{item.detail}</p>
                    </div>
                  </div>
                  {item.ok ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-4" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="size-4" /> Optional / Off
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Background Crons & Activity */}
        <Card title="Background Jobs & Cron Health">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-neutral-100 p-3 bg-neutral-50">
              <dt className="flex items-center gap-1.5 font-medium text-neutral-900">
                <Clock className="size-4 text-neutral-500" /> Catalog Schedule Cron
              </dt>
              <dd className="mt-1 text-xs text-neutral-600">
                Route: <code className="font-mono">/api/cron/catalog-schedule</code> (Secured via CRON_SECRET)
              </dd>
            </div>
            <div className="rounded-lg border border-neutral-100 p-3 bg-neutral-50">
              <dt className="flex items-center gap-1.5 font-medium text-neutral-900">
                <RefreshCw className="size-4 text-neutral-500" /> Media Sweep Cron
              </dt>
              <dd className="mt-1 text-xs text-neutral-600">
                Route: <code className="font-mono">/api/cron/media-sweep</code> (Finds orphaned photos)
              </dd>
            </div>
            <div className="rounded-lg border border-neutral-100 p-3 bg-neutral-50 sm:col-span-2">
              <dt className="font-medium text-neutral-900">Last Recorded Activity Event</dt>
              <dd className="mt-1 text-xs text-neutral-600">
                {health.lastAuditAt ? (
                  <>
                    <span className="font-mono">{health.lastAuditAction}</span> by{" "}
                    <strong>{health.lastAuditActor || "System"}</strong> at{" "}
                    {health.lastAuditAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                  </>
                ) : (
                  "No activity events recorded yet."
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
