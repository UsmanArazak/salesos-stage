"use client";

import { useState } from "react";
import Link from "next/link";

type Shop = {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export function ShopTable({ shops }: { shops: Shop[] }) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");

  const filtered = shops.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(query.toLowerCase());
    const matchesPlan = planFilter === "all" || s.plan === planFilter;
    return matchesQuery && matchesPlan;
  });

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
            placeholder="Search by shop name or email..."
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
        <div className="flex gap-2">
          {(["all", "free", "pro"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize"
              style={{
                background: planFilter === p ? "var(--accent-dim)" : "var(--bg-surface)",
                borderColor: planFilter === p ? "var(--accent-border)" : "var(--border-color)",
                color: planFilter === p ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {p === "all" ? "All Plans" : p}
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
            {shops.length === 0 ? "No shops registered yet." : "No shops match your search."}
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
                  <th className="text-left px-5 py-3">Shop Name</th>
                  <th className="text-left px-5 py-3">Owner Email</th>
                  <th className="text-left px-5 py-3">Phone</th>
                  <th className="text-left px-5 py-3">Address</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Registered</th>
                  <th className="text-left px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((shop, i) => (
                  <tr
                    key={shop.id}
                    className="border-b last:border-0 transition-colors hover:bg-gray-50"
                    style={{
                      borderColor: "var(--border-color)",
                      background: i % 2 === 1 ? "var(--bg-elevated)" : "transparent",
                    }}
                  >
                    <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {shop.name}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                      {shop.ownerEmail}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                      {shop.phone || "—"}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate" style={{ color: "var(--text-muted)" }} title={shop.address || ""}>
                      {shop.address || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <PlanBadge plan={shop.plan} />
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(shop.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/superadmin/shops/${shop.id}`}
                        className="text-xs font-semibold transition-colors"
                        style={{ color: "var(--accent)" }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} of {shops.length} shops
        </p>
      )}
    </div>
  );
}
