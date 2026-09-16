"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { voidSale } from "@/app/actions/sales";
import { SearchMonthToolbar } from "@/components/ui/SearchMonthToolbar";

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

function getLagosCurrentYM(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM
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
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--success-dim)", color: "var(--icon-success-text)" }}>
        CASH
      </span>
    );
  }
  if (method === "transfer") {
    return (
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "var(--info-dim)", color: "var(--icon-info-text)" }}>
        <span>TRANSFER</span>
        {bankName && <span className="font-semibold opacity-85">({bankName})</span>}
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
      CREDIT
    </span>
  );
}

export function SalesList({ sales }: { sales: SaleRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(getLagosCurrentYM());
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
    // Payment filter
    if (paymentFilter !== "all" && s.payment_method !== paymentFilter) return false;

    // Month filter
    if (selectedMonth !== null) {
      if (!s.created_at.startsWith(selectedMonth)) return false;
    }

    // Search query filter
    const term = query.toLowerCase();
    if (!term) return true;

    const itemMatch = s.sale_items.some((i) => i.products?.name.toLowerCase().includes(term));
    const custMatch = s.credit_sales?.some((c) => c.customers?.name.toLowerCase().includes(term));
    const bankMatch = s.bank_name?.toLowerCase().includes(term);
    const noteMatch = s.notes?.toLowerCase().includes(term);
    const amtMatch = String(s.total_amount).includes(term);
    return itemMatch || custMatch || bankMatch || noteMatch || amtMatch;
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
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Sales History
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} shown
          </p>
        </div>
        <Link
          href="/sales/new"
          id="record-sale-btn"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
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
              style={{ background: "var(--info-dim)", color: "var(--icon-info-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
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

      {/* ── Search Bar + Month Filter Toolbar ── */}
      <SearchMonthToolbar
        searchQuery={query}
        onSearchChange={setQuery}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        placeholder="Search sales by product, customer, or bank name..."
      />

      {/* ── Payment Filter Chips ── */}
      <div className="space-y-3">
        <div
          className="p-1 rounded-2xl flex items-center gap-1.5 border bg-white overflow-x-auto no-scrollbar"
          style={{ borderColor: "var(--border-color)" }}
        >
          {(
            [
              { id: "all", label: "All Sales" },
              { id: "cash", label: "Cash" },
              { id: "transfer", label: "Transfer" },
              { id: "credit", label: "Credit" },
            ] as const
          ).map((tab) => {
            const isSelected = paymentFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentFilter(tab.id)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-center ${
                  isSelected
                    ? "bg-[var(--text-primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--icon-neutral-bg)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Bank Account Funds Breakdown Card */}
        {paymentFilter === "transfer" && bankEntries.length > 0 && (
          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{ background: "var(--info-dim)", borderColor: "var(--info-border)" }}
          >
            <div className="flex justify-between items-center">
              <p className="text-xs font-extrabold uppercase tracking-wider">
                Bank Accounts & Funds
              </p>
              <span className="text-[11px] font-bold" style={{ color: "var(--icon-info-text)" }}>
                Total: {formatNaira(totalTransferFunds)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {bankEntries.map(([bank, total]) => (
                <div
                  key={bank}
                  className="flex justify-between items-center p-2.5 rounded-xl border text-xs shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--info-border)" }}
                >
                  <span className="font-medium truncate pr-2" style={{ color: "var(--text-primary)" }}>
                    🏦 {bank}
                  </span>
                  <span className="font-bold flex-shrink-0" style={{ color: "var(--icon-info-text)" }}>
                    {formatNaira(total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Void Sale Confirmation Modal ── */}
      {confirmSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4" style={{ borderColor: "var(--border-color)" }}>
            <div className="w-10 h-10 rounded-full bg-[var(--icon-danger-bg)] text-[var(--icon-danger-text)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Void Sale #{confirmSale.id.slice(0, 8)}?
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Voiding this {formatNaira(confirmSale.total_amount)} sale will restock all included inventory items and mark the sale as canceled.
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs font-semibold p-2.5 rounded-xl bg-[var(--icon-danger-bg)] border border-[var(--danger-border)] text-[var(--icon-danger-text)]">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={voiding}
                onClick={() => setConfirmSale(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-[var(--icon-neutral-bg)] hover:opacity-80 transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voiding}
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--danger)] hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {voiding ? "Voiding..." : "Yes, Void Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sales List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center bg-white space-y-3"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--icon-neutral-bg)] text-[var(--icon-neutral-text)] flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              No sales transactions found
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {query ? `No sales match "${query}"` : "Try selecting a different filter or month."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => {
            const isVoided = sale.status === "voided" || sale.notes?.startsWith("[VOIDED]");
            const customerObj = (Array.isArray(sale.credit_sales) ? sale.credit_sales[0] : sale.credit_sales) as {
              customers?: { name: string; phone?: string | null } | null;
            } | undefined | null;
            const customerName = customerObj?.customers?.name;

            return (
              <div
                key={sale.id}
                className={`rounded-2xl border p-4 transition-all bg-white ${
                  isVoided ? "opacity-60 bg-[var(--icon-neutral-bg)] border-[var(--border-color)]" : ""
                }`}
                style={{
                  borderColor: isVoided ? "var(--border-color)" : "var(--border-color)",
                  boxShadow: isVoided ? "none" : "var(--card-shadow)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PaymentBadge method={sale.payment_method} bankName={sale.bank_name} />
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {formatDate(sale.created_at)}
                      </span>
                      {isVoided && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--icon-danger-bg)] text-[var(--icon-danger-text)]">
                          VOIDED
                        </span>
                      )}
                    </div>

                    {/* Customer Name if Credit Sale */}
                    {customerName && (
                      <p className="text-xs font-bold mt-1 flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[var(--icon-neutral-text)]">
                          <path d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        <span>Customer: {customerName}</span>
                      </p>
                    )}

                    {/* Sale Items List */}
                    <div className="mt-2 space-y-1">
                      {sale.sale_items?.map((item, idx) => (
                        <p key={idx} className="text-xs font-medium truncate" style={{ color: "var(--text-muted)" }}>
                          {item.quantity}x {item.products?.name || "Product Item"}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 space-y-2">
                    <p
                      className={`text-base font-black ${
                        isVoided ? "line-through text-[var(--icon-neutral-text)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {formatNaira(sale.total_amount)}
                    </p>

                    {!isVoided && (
                      <button
                        type="button"
                        onClick={() => setConfirmSale(sale)}
                        className="text-[11px] font-bold text-[var(--icon-danger-text)] hover:opacity-80 underline decoration-[var(--danger-border)] transition-colors"
                      >
                        Void Sale
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
