"use client";

import { useState } from "react";

type Subscription = {
  id: string;
  shop_id: string;
  plan: string;
  status: string;
  paystack_ref: string | null;
  renewed_at: string | null;
  expires_at: string | null;
  shopName: string;
  ownerEmail: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft > 0 && daysLeft <= 7;
}

function isExpired(expiresAt: string | null, status: string): boolean {
  if (status === "expired") return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function PlanBadge({ plan }: { plan: string }) {
  const isPro = plan === "pro";
  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg"
      style={{
        background: isPro ? "var(--accent-dim)" : "var(--bg-elevated)",
        color: isPro ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {isPro ? "Pro" : "Free"}
    </span>
  );
}

function StatusBadge({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt: string | null;
}) {
  const expired = isExpired(expiresAt, status);
  const expiring = isExpiringSoon(expiresAt);

  let bg = "var(--success-dim)";
  let color = "var(--success)";
  let label = "Active";

  if (expired) {
    bg = "var(--danger-dim)";
    color = "var(--danger)";
    label = "Expired";
  } else if (expiring) {
    bg = "var(--warning-dim)";
    color = "var(--warning)";
    label = "Expiring Soon";
  }

  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

export function SubscriptionTable({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");

  const filtered = subscriptions.filter((s) => {
    const matchesQuery =
      s.shopName.toLowerCase().includes(query.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(query.toLowerCase()) ||
      (s.paystack_ref ?? "").toLowerCase().includes(query.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "expired"
        ? isExpired(s.expires_at, s.status)
        : !isExpired(s.expires_at, s.status));

    const matchesPlan = planFilter === "all" || s.plan === planFilter;

    return matchesQuery && matchesStatus && matchesPlan;
  });

  // Empty state — Paystack not yet integrated
  if (subscriptions.length === 0) {
    return (
      <div
        className="rounded-2xl border p-10 bg-white text-center space-y-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "var(--bg-elevated)" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-6 h-6"
            style={{ color: "var(--text-muted)" }}
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          No subscription records yet
        </p>
        <p className="text-xs max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
          Subscription records will appear here once Paystack integration is active and shops begin upgrading to Pro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by shop, email or Paystack ref..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
          />
        </div>

        {/* Plan filter */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "free", "pro"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize"
              style={{
                background: planFilter === p ? "var(--accent-dim)" : "var(--bg-surface)",
                borderColor: planFilter === p ? "var(--accent-border)" : "var(--border-color)",
                color: planFilter === p ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {p === "all" ? "All Plans" : p}
            </button>
          ))}
          <div style={{ width: "1px", background: "var(--border-color)" }} />
          {(["all", "active", "expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize"
              style={{
                background: statusFilter === s ? "var(--accent-dim)" : "var(--bg-surface)",
                borderColor: statusFilter === s ? "var(--accent-border)" : "var(--border-color)",
                color: statusFilter === s ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden bg-white"
        style={{ borderColor: "var(--border-color)" }}
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No subscriptions match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-xs font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th className="text-left px-5 py-3">Shop</th>
                  <th className="text-left px-5 py-3">Owner</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Renewed</th>
                  <th className="text-left px-5 py-3">Expires</th>
                  <th className="text-left px-5 py-3">Paystack Ref</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, i) => (
                  <tr
                    key={sub.id}
                    className="border-b last:border-0"
                    style={{
                      borderColor: "var(--border-color)",
                      background: i % 2 === 1 ? "var(--bg-elevated)" : "transparent",
                    }}
                  >
                    <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {sub.shopName}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                      {sub.ownerEmail}
                    </td>
                    <td className="px-5 py-3.5">
                      <PlanBadge plan={sub.plan} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sub.status} expiresAt={sub.expires_at} />
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(sub.renewed_at)}
                    </td>
                    <td
                      className="px-5 py-3.5 font-medium"
                      style={{
                        color: isExpiringSoon(sub.expires_at)
                          ? "var(--warning)"
                          : isExpired(sub.expires_at, sub.status)
                          ? "var(--danger)"
                          : "var(--text-muted)",
                      }}
                    >
                      {formatDate(sub.expires_at)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {sub.paystack_ref ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} of {subscriptions.length} records
        </p>
      )}
    </div>
  );
}
