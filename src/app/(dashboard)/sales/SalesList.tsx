"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { voidSale } from "@/app/actions/sales";

export type SaleRow = {
  id: string;
  total_amount: number;
  payment_method: string;
  bank_name?: string | null;
  status?: string | null;
  voided_at?: string | null;
  created_at: string;
  notes: string;
  sale_items: {
    quantity: number;
    unit_price: number;
    products: { name: string } | null;
  }[];
  credit_sales?: {
    customers: { name: string; phone?: string | null } | null;
  }[];
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isTodayInLagos(isoDate: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(new Date());
  const saleDate = formatter.format(new Date(isoDate));
  return today === saleDate;
}

function PaymentBadge({ method, bankName }: { method: string; bankName?: string | null }) {
  if (method === "cash") {
    return (
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "var(--success)" }}>
        CASH
      </span>
    );
  }
  if (method === "transfer") {
    return (
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>
        <span>TRANSFER</span>
        {bankName && <span className="font-semibold opacity-85">({bankName})</span>}
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--warning-dim)", color: "var(--warning)" }}>
      CREDIT
    </span>
  );
}

export function SalesList({ sales }: { sales: SaleRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "transfer" | "credit">("all");
  const [confirmSale, setConfirmSale] = useState<SaleRow | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Non-voided active sales count & sum
  const activeSales = sales.filter((s) => s.status !== "voided" && !s.notes?.startsWith("[VOIDED]"));
  const todaySales = activeSales.filter((s) => isTodayInLagos(s.created_at));
  const todayTotal = todaySales.reduce((acc, s) => acc + s.total_amount, 0);

  // Compute bank breakdown for transfer sales (non-voided)
  const transferSales = activeSales.filter((s) => s.payment_method === "transfer" && s.bank_name);
  const bankTotals: Record<string, number> = {};
  for (const s of transferSales) {
    if (s.bank_name) {
      bankTotals[s.bank_name] = (bankTotals[s.bank_name] || 0) + s.total_amount;
    }
  }
  const bankEntries = Object.entries(bankTotals).sort((a, b) => b[1] - a[1]);
  const totalTransferFunds = transferSales.reduce((sum, s) => sum + s.total_amount, 0);

  const filtered = sales.filter((s) => {
    if (paymentFilter !== "all" && s.payment_method !== paymentFilter) return false;

    const term = query.toLowerCase();
    if (!term) return true;

    const itemMatch = s.sale_items.some((i) => i.products?.name.toLowerCase().includes(term));
    const custMatch = s.credit_sales?.some((c) => c.customers?.name.toLowerCase().includes(term));
    const bankMatch = s.bank_name?.toLowerCase().includes(term);
    return itemMatch || custMatch || bankMatch;
  });

  async function handleConfirmVoid() {
    if (!confirmSale) return;
    setVoiding(true);
    setErrorMsg("");

    try {
      const result = await voidSale(confirmSale.id);
      setVoiding(false);

      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }

      setConfirmSale(null);
      router.refresh();
    } catch (err: unknown) {
      setVoiding(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to void sale.");
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Sales History
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sales.length} transaction{sales.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Link
          href="/sales/new"
          id="record-sale-btn"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Record Sale
        </Link>
      </div>

      {/* ── Today's Quick Summary Metrics ── */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-3.5 space-y-1.5 border bg-white"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Sales Today
            </p>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--icon-success-bg)", color: "var(--icon-success-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" />
              </svg>
            </div>
          </div>
          <p className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {formatNaira(todayTotal)}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {todaySales.length} transaction{todaySales.length !== 1 ? "s" : ""} today
          </p>
        </div>

        <div
          className="rounded-2xl p-3.5 space-y-1.5 border bg-white"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Transfer Funds
            </p>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M11.584 2.25a.75.75 0 01.832 0l9 6a.75.75 0 010 1.252l-9 6a.75.75 0 01-.832 0l-9-6a.75.75 0 010-1.252l9-6z" />
                <path d="M12 21.75a.75.75 0 01-.416-.126l-9-6a.75.75 0 01.832-1.248L12 20.088l8.584-5.722a.75.75 0 11.832 1.248l-9 6A.75.75 0 0112 21.75z" />
              </svg>
            </div>
          </div>
          <p className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {formatNaira(totalTransferFunds)}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Across {bankEntries.length} bank account{bankEntries.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

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
            placeholder="Search by product, customer, or bank name..."
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

        {/* Swipable & Mobile-Friendly Payment Filter Chips */}
        <div
          className="p-1 rounded-2xl flex items-center gap-1.5 border bg-white overflow-x-auto no-scrollbar"
          style={{ borderColor: "var(--border-color)" }}
        >
          {(
            [
              { id: "all", label: "All Sales", count: sales.length },
              { id: "cash", label: "Cash", count: sales.filter((s) => s.payment_method === "cash").length },
              { id: "transfer", label: "Transfer", count: sales.filter((s) => s.payment_method === "transfer").length },
              { id: "credit", label: "Credit", count: sales.filter((s) => s.payment_method === "credit").length },
            ] as const
          ).map((tab) => {
            const active = paymentFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentFilter(tab.id)}
                className={`flex-1 min-w-[90px] flex-shrink-0 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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

      {/* ── Bank Accounts Funds Breakdown Section (Positioned UNDER Sales Type Tabs) ── */}
      {(paymentFilter === "transfer" || (paymentFilter === "all" && bankEntries.length > 0)) && (
        <div
          className="rounded-2xl border p-4 bg-white space-y-3.5 transition-all"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06l-6.97-6.97L5.03 11.03a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M12 5.25a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  <path d="M3 19.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 19.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Bank Accounts & Funds
                </h2>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Total transfer funds received per bank
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {formatNaira(totalTransferFunds)}
            </span>
          </div>

          {bankEntries.length === 0 ? (
            <p className="text-xs text-stone-500 py-1">No bank transfers recorded yet.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {bankEntries.map(([bank, amount]) => {
                const pct = totalTransferFunds > 0 ? Math.round((amount / totalTransferFunds) * 100) : 0;
                return (
                  <div key={bank} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M11.584 2.25a.75.75 0 01.832 0l9 6a.75.75 0 010 1.252l-9 6a.75.75 0 01-.832 0l-9-6a.75.75 0 010-1.252l9-6z" />
                          </svg>
                        </div>
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                          {bank}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold" style={{ color: "var(--accent)" }}>
                          {formatNaira(amount)}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-1.5 font-medium">({pct}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: "var(--accent)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sales List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center bg-white space-y-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {sales.length === 0 ? "No sales recorded yet" : "No sales match your filter"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {sales.length === 0
                ? "Record transactions to keep track of daily revenue and bank transfers."
                : "Try selecting another payment filter or clearing your search term."}
            </p>
          </div>
          {sales.length === 0 && (
            <Link
              href="/sales/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              + Record Your First Sale
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => {
            const customerName = sale.credit_sales?.[0]?.customers?.name;
            const isVoided = sale.status === "voided" || Boolean(sale.notes?.startsWith("[VOIDED]"));
            const canVoid = !isVoided && isTodayInLagos(sale.created_at);
            const cleanNotes = sale.notes ? sale.notes.replace(/^\[VOIDED\]\s*/, "").trim() : "";

            return (
              <div
                key={sale.id}
                className={`rounded-2xl border bg-white p-4 transition-all ${
                  isVoided ? "opacity-60 bg-stone-50" : ""
                }`}
                style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-bold text-base ${isVoided ? "line-through text-stone-400" : ""}`}
                        style={{ color: isVoided ? undefined : "var(--text-primary)" }}
                      >
                        {formatNaira(sale.total_amount)}
                      </p>
                      {isVoided && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase">
                          VOIDED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(sale.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <PaymentBadge method={sale.payment_method} bankName={sale.bank_name} />

                      {canVoid && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setConfirmSale(sale);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all"
                          title="Void this sale and return items to inventory"
                        >
                          Void
                        </button>
                      )}
                    </div>
                    {customerName && (
                      <span className="text-[11px] font-semibold flex items-center gap-1 text-stone-700">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-stone-400">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        {customerName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t space-y-1" style={{ borderColor: "var(--border-color)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Items Sold
                  </p>
                  <ul className="space-y-1">
                    {sale.sale_items.map((item, idx) => (
                      <li
                        key={idx}
                        className={`text-xs flex justify-between font-medium ${isVoided ? "line-through" : ""}`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span className="truncate pr-2">
                          {item.quantity}x {item.products?.name || "Item"}
                        </span>
                        <span className="font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {formatNaira(item.unit_price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {cleanNotes && (
                    <p className="text-[11px] pt-1 italic" style={{ color: "var(--text-muted)" }}>
                      Note: {cleanNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Void Confirmation Modal ── */}
      {confirmSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.401 3.003c1.154-1.999 4.043-1.999 5.197 0l7.355 12.748c1.154 2-298 4.5-1.044 4.5H3.09c-2.342 0-3.8-2.5-2.646-4.5L9.401 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Void this sale?
              </h3>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                This will reverse the transaction of <strong>{formatNaira(confirmSale.total_amount)}</strong>:
              </p>
              <ul className="text-xs mt-2 space-y-1 list-disc list-inside text-stone-600 font-medium">
                <li>Items sold will be restored back to inventory stock.</li>
                {confirmSale.payment_method === "credit" && (
                  <li>Any customer debt from this credit sale will be removed.</li>
                )}
                <li>The transaction will be marked as VOIDED.</li>
              </ul>
            </div>

            {errorMsg && (
              <div className="text-xs font-semibold p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={voiding}
                onClick={() => setConfirmSale(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voiding}
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {voiding ? "Voiding..." : "Yes, Void Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
