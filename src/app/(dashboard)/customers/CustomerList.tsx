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

      {/* ── Total Debt Summary Card ── */}
      {customers.length > 0 && (
        <div
          className="rounded-2xl border p-4 flex items-center justify-between gap-4 bg-white"
          style={{
            borderColor: totalOutstandingDebt > 0 ? "var(--accent-border)" : "rgba(22,163,74,0.25)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: totalOutstandingDebt > 0 ? "var(--accent)" : "var(--success)" }}
            >
              Total Uncollected Debt
            </p>
            <p
              className="text-2xl font-black tracking-tight"
              style={{ color: totalOutstandingDebt > 0 ? "var(--accent)" : "var(--success)" }}
            >
              {formatNaira(totalOutstandingDebt)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {debtorsCount > 0
                ? `${debtorsCount} customer${debtorsCount !== 1 ? "s" : ""} owe you money`
                : "All customer debts are cleared!"}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: totalOutstandingDebt > 0 ? "var(--accent-dim)" : "rgba(22,163,74,0.12)",
              color: totalOutstandingDebt > 0 ? "var(--accent)" : "var(--success)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
              <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
            </svg>
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
                  active ? "shadow-xs" : ""
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a.75.75 0 01-.247.55 14.54 14.54 0 01-3.666 2.052c.983.257 2.02.392 3.09.392 2.193 0 4.24-.555 6.026-1.533a.75.75 0 00.348-.561l.001-.144a6.375 6.375 0 00-5.552-6.326 5.625 5.625 0 010 5.426z" />
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
        <div className="space-y-2.5">
          {filtered.map((c) => {
            const hasDebt = c.total_debt > 0;
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="block rounded-2xl border bg-white p-3.5 transition-all active:scale-[0.98]"
                style={{
                  borderColor: hasDebt ? "var(--accent-border)" : "var(--border-color)",
                  boxShadow: "var(--card-shadow)",
                }}
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
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.6-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
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
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
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
