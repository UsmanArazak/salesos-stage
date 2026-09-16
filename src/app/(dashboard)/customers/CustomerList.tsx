"use client";

import { useState } from "react";
import Link from "next/link";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  total_debt: number;
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "debtors">("all");

  const totalOutstandingDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const debtorsCount = customers.filter((c) => (c.total_debt || 0) > 0).length;

  const filtered = customers.filter((c) => {
    if (tabFilter === "debtors" && (c.total_debt || 0) <= 0) return false;
    const term = query.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(term);
  });

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Debt
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Track customer debts and outstanding balances
          </p>
        </div>
        <Link
          href="/customers/new"
          id="add-customer-btn"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Customer
        </Link>
      </div>

      {/* ── Total Debt Summary: Hero ── */}
      {customers.length > 0 && (
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: totalOutstandingDebt > 0
              ? "linear-gradient(135deg, var(--bg-base) 0%, var(--accent-dim) 100%)"
              : "linear-gradient(135deg, var(--bg-base) 0%, var(--success-dim) 100%)",
            border: totalOutstandingDebt > 0 ? "1px solid var(--accent-border)" : "1px solid var(--success-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
            style={{ background: totalOutstandingDebt > 0 ? "var(--accent)" : "var(--success)" }}
          />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <span
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2"
                style={{ color: totalOutstandingDebt > 0 ? "var(--icon-accent-text)" : "var(--icon-success-text)" }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block animate-pulse"
                  style={{ background: totalOutstandingDebt > 0 ? "var(--accent)" : "var(--success)" }}
                />
                Total Uncollected Debt
              </span>
              <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {formatNaira(totalOutstandingDebt)}
              </p>
              <p className="text-xs mt-1" style={{ color: totalOutstandingDebt > 0 ? "var(--icon-accent-text)" : "var(--icon-success-text)" }}>
                {debtorsCount > 0
                  ? `${debtorsCount} customer${debtorsCount !== 1 ? "s" : ""} owe you money`
                  : "All customer debts are cleared!"}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: totalOutstandingDebt > 0 ? "var(--icon-accent-bg)" : "var(--icon-success-bg)",
                color: totalOutstandingDebt > 0 ? "var(--icon-accent-text)" : "var(--icon-success-text)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-colors bg-white"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
          />
        </div>

        {/* Segmented Filter Chips */}
        <div
          className="p-1 rounded-2xl flex items-center gap-1 border bg-white overflow-x-auto no-scrollbar"
          style={{ borderColor: "var(--border-color)" }}
        >
          {(
            [
              { id: "all", label: "All Customers", count: customers.length },
              { id: "debtors", label: "Debtors Only", count: debtorsCount },
            ] as const
          ).map((tab) => {
            const active = tabFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabFilter(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  active ? "shadow-sm" : ""
                }`}
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#ffffff" : "var(--text-muted)",
                }}
              >
                <span>{tab.label}</span>
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px]"
                  style={{
                    background: active ? "rgba(255,255,255,0.25)" : "var(--icon-neutral-bg)",
                    color: active ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center bg-white space-y-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {customers.length === 0 ? "No customers saved yet" : "No matching customers"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {customers.length === 0
                ? "Save your regular customers here to track credit sales, debts, and full purchase history."
                : "Try adjusting your search query or switching to All Customers."}
            </p>
          </div>
          {customers.length === 0 && (
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              + Add Your First Customer
            </Link>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden divide-y divide-[var(--border-color)]"
          style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}
        >
          {filtered.map((c) => {
            const hasDebt = c.total_debt > 0;
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="block p-3.5 transition-all active:opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                      style={{
                        background: hasDebt ? "var(--accent-dim)" : "var(--icon-neutral-bg)",
                        color: hasDebt ? "var(--accent)" : "var(--icon-neutral-text)",
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate" style={{ color: "var(--text-primary)" }}>
                        {c.name}
                      </p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {c.phone || "No phone number"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {hasDebt ? (
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                        Owes {formatNaira(c.total_debt)}
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: "var(--success-dim)", color: "var(--icon-success-text)", borderColor: "var(--success-border)" }}>
                        Clear
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
