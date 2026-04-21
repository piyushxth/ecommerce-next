import Link from "next/link";

import {
  getAdminMetrics,
  getRecentOrders,
  LOW_STOCK_THRESHOLD,
} from "@/lib/admin/metrics";

export const dynamic = "force-dynamic";

// Cheap money formatter. Prices are stored as plain numbers today (noted in
// ProductVariant.ts); swap for a proper integer-cents formatter when we
// migrate.
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_BADGE: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  shipped:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  delivered:
    "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  cancelled:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  refunded:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

export default async function AdminOverviewPage() {
  const [metrics, recent] = await Promise.all([
    getAdminMetrics(),
    getRecentOrders(5),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Inventory and order snapshot across the store.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Revenue · 30d"
          value={money(metrics.revenue.last30Days)}
          hint={`All-time ${money(metrics.revenue.allTime)}`}
        />
        <MetricTile
          label="Orders · 7d"
          value={metrics.orders.last7Days.toLocaleString()}
          hint={`${metrics.orders.today} today`}
        />
        <MetricTile
          label="Pending orders"
          value={metrics.orders.pending.toLocaleString()}
          hint={metrics.orders.pending > 0 ? "Needs fulfilment" : "All clear"}
          tone={metrics.orders.pending > 0 ? "warning" : undefined}
        />
        <MetricTile
          label="Paid orders"
          value={metrics.orders.paid.toLocaleString()}
          hint={`${metrics.orders.shipped} shipped · ${metrics.orders.delivered} delivered`}
        />

        <MetricTile
          label="Published products"
          value={metrics.products.published.toLocaleString()}
          hint={`${metrics.products.unpublished} hidden`}
        />
        <MetricTile
          label={`Low-stock variants (≤ ${LOW_STOCK_THRESHOLD})`}
          value={metrics.products.lowStockVariants.toLocaleString()}
          hint="Needs restock soon"
          tone={metrics.products.lowStockVariants > 0 ? "warning" : undefined}
        />
        <MetricTile
          label="Out-of-stock variants"
          value={metrics.products.outOfStockVariants.toLocaleString()}
          hint="Unbuyable right now"
          tone={metrics.products.outOfStockVariants > 0 ? "danger" : undefined}
        />
        <MetricTile
          label="Total users"
          value={metrics.users.total.toLocaleString()}
          hint={`${metrics.users.newLast7Days} new · 7d`}
        />
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Recent orders
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Latest {recent.length} orders across all users.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
          >
            View all →
          </Link>
        </header>

        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No orders yet.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_BADGE[o.status] ??
                        "bg-neutral-200 text-neutral-800"
                      }`}
                    >
                      {o.status}
                    </span>
                    <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {o.id}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-600 dark:text-neutral-400">
                    {o.userName ?? o.userEmail ?? "Unknown"} · {o.itemCount}{" "}
                    {o.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {money(o.totalAmount)}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {dateFmt.format(o.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "danger";
}) {
  const toneBorder =
    tone === "danger"
      ? "border-rose-200 dark:border-rose-900/50"
      : tone === "warning"
        ? "border-amber-200 dark:border-amber-900/50"
        : "border-neutral-200 dark:border-neutral-800";

  return (
    <div
      className={`rounded-xl border bg-white p-4 dark:bg-neutral-900 ${toneBorder}`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums dark:text-neutral-100">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
