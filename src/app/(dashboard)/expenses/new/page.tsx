"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logExpense } from "@/app/actions/expenses";

export default function NewExpensePage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid amount greater than zero.");
      setLoading(false);
      return;
    }

    const result = await logExpense({ amount: val, category, description, date });

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/expenses");
      router.refresh();
    }
  }

  const categories = ["Rent", "Stock", "Transport", "Salary", "Other"];
  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="w-9 h-9 rounded-2xl border flex items-center justify-center transition-colors bg-white hover:bg-stone-50"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Log Expense
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Record money spent on shop operational costs
          </p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <div
        className="rounded-2xl border p-5 bg-white space-y-4"
        style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
              Amount (₦) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-stone-400">
                ₦
              </span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                placeholder="0"
                className="w-full rounded-2xl border pl-8 pr-3.5 py-3 text-base font-bold focus:outline-none transition-colors"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 no-scrollbar">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold border bg-stone-50 hover:bg-stone-100 transition-colors text-stone-600"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  +₦{amt.toLocaleString("en-US")}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
              Category *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {categories.map((c) => {
                const isSelected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="py-2.5 px-2 text-xs font-bold rounded-2xl border transition-all text-center"
                    style={{
                      background: isSelected ? "var(--accent-dim)" : "var(--bg-surface)",
                      borderColor: isSelected ? "var(--accent-border)" : "var(--border-color)",
                      color: isSelected ? "var(--accent)" : "var(--text-dim)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
              Description / Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Transport to market, Generator fuel..."
              className="w-full rounded-2xl border px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
              Expense Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl px-4 py-3 text-xs font-semibold border bg-red-50 border-red-200 text-red-600">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full font-bold py-3.5 rounded-2xl text-xs text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "Saving Expense..." : "Log Expense"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
