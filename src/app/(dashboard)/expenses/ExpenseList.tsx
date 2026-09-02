"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateExpense, deleteExpense } from "@/app/actions/expenses";
import { SearchMonthToolbar } from "@/components/ui/SearchMonthToolbar";

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
};

type DatePeriod = "today" | "this_week" | "this_month" | "all";

function getLagosTodayISO(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

function getLagosCurrentYM(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM
}

function isDateInPeriod(dateStr: string, period: DatePeriod): boolean {
  if (period === "all") return true;
  const todayISO = getLagosTodayISO();
  if (period === "today") return dateStr === todayISO;

  if (period === "this_month") {
    const [year, month] = todayISO.split("-");
    return dateStr.startsWith(`${year}-${month}`);
  }

  if (period === "this_week") {
    const today = new Date(todayISO);
    const dayOfWeek = today.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const check = new Date(dateStr);
    return check >= monday && check <= sunday;
  }

  return true;
}

// Category Icons
function CategoryIcon({ category }: { category: string }) {
  switch (category.toLowerCase()) {
    case "rent":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-600">
          <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 00-.75.75v18a.75.75 0 001.5 0V18h15v3a.75.75 0 001.5 0V3a.75.75 0 00-.75-.75h-16.5zM6 4.5h3v3H6v-3zm0 4.5h3v3H6V9zm0 4.5h3v3H6v-3zm6-9h3v3h-3v-3zm0 4.5h3v3h-3V9zm0 4.5h3v3h-3v-3z" clipRule="evenodd" />
        </svg>
      );
    case "stock":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      );
    case "transport":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-600">
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875H3.375zM15 6.375c0-1.036.84-1.875 1.875-1.875h.586c.995 0 1.95.395 2.653 1.098l.94.94A3.75 3.75 0 0122.152 9.19l.348 2.087A3.75 3.75 0 0122.5 12v1.5h-7.5V6.375z" />
          <path fillRule="evenodd" d="M3.75 15a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0zm12 0a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" clipRule="evenodd" />
        </svg>
      );
    case "salary":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-600">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.6-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-stone-600">
          <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a.375.375 0 01-.375-.375V6.75A3.75 3.75 0 0010.5 3H5.625z" clipRule="evenodd" />
        </svg>
      );
  }
}

function CategoryBgColor(category: string): string {
  switch (category.toLowerCase()) {
    case "rent": return "bg-purple-50";
    case "stock": return "bg-blue-50";
    case "transport": return "bg-amber-50";
    case "salary": return "bg-emerald-50";
    default: return "bg-stone-100";
  }
}

export function ExpenseList({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(getLagosCurrentYM());
  const [period, setPeriod] = useState<DatePeriod | "month">("month");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Edit State
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirmation Modal State
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const categories = ["All", "Rent", "Stock", "Transport", "Salary", "Other"];
  const editCategories = ["Rent", "Stock", "Transport", "Salary", "Other"];

  const filtered = expenses.filter((e) => {
    // 1. Category Filter
    if (categoryFilter !== "All" && e.category !== categoryFilter) return false;

    // 2. Month Filter (if selected) or Date Period
    if (selectedMonth !== null) {
      if (!e.date.startsWith(selectedMonth)) return false;
    } else if (period !== "month") {
      if (!isDateInPeriod(e.date, period as DatePeriod)) return false;
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(term);
      const matchCat = e.category?.toLowerCase().includes(term);
      const matchAmt = String(e.amount).includes(term);
      if (!matchDesc && !matchCat && !matchAmt) return false;
    }

    return true;
  });

  const totalFilteredAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  function openEditModal(e: ExpenseRow) {
    setEditingExpense(e);
    setEditAmount(String(e.amount));
    setEditCategory(e.category);
    setEditDescription(e.description || "");
    setEditDate(e.date);
    setEditError("");
  }

  async function handleSaveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editingExpense) return;
    const numAmount = parseFloat(editAmount);
    if (!numAmount || numAmount <= 0) {
      setEditError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!editCategory) {
      setEditError("Please select a category.");
      return;
    }
    if (!editDate) {
      setEditError("Please enter a date.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const res = await updateExpense(editingExpense.id, {
        amount: numAmount,
        category: editCategory,
        description: editDescription.trim(),
        date: editDate,
      });
      setSavingEdit(false);

      if ("error" in res) {
        setEditError(res.error);
        return;
      }

      setEditingExpense(null);
      router.refresh();
    } catch (err: unknown) {
      setSavingEdit(false);
      setEditError(err instanceof Error ? err.message : "Failed to update expense.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmExpense) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await deleteExpense(deleteConfirmExpense.id);
      setDeleting(false);
      if ("error" in res) {
        setDeleteError(res.error);
      } else {
        setDeleteConfirmExpense(null);
        router.refresh();
      }
    } catch (err: unknown) {
      setDeleting(false);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete expense.");
    }
  }

  const periodLabel = selectedMonth
    ? `Expenses (${new Date(selectedMonth + "-01").toLocaleDateString("en-NG", { month: "long", year: "numeric" })})`
    : "All Time Expenses";

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Expenses
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Log and track daily shop operational costs
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Expense
        </Link>
      </div>

      {/* ── Search Bar + Month Filter Toolbar ── */}
      <SearchMonthToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        placeholder="Search expenses by note, category, or amount..."
      />

      {/* ── Period Selector Buttons ── */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl border bg-stone-100/70" style={{ borderColor: "var(--border-color)" }}>
        {(["today", "this_week", "this_month", "all"] as DatePeriod[]).map((p) => {
          const isActive = selectedMonth === null && period === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedMonth(null);
                setPeriod(p);
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {p === "today" ? "Today" : p === "this_week" ? "This Week" : p === "this_month" ? "This Month" : "All"}
            </button>
          );
        })}
      </div>

      {/* ── Total Expense Metric Card ── */}
      <div
        className="rounded-2xl border p-4 flex items-center justify-between gap-4 bg-white"
        style={{
          borderColor: "rgba(220,38,38,0.2)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 mb-1">
            {periodLabel}
          </p>
          <p className="text-3xl font-black tracking-tight text-red-600">
            ₦{totalFilteredAmount.toLocaleString("en-US")}
          </p>
          <p className="text-xs mt-1 text-stone-500 font-medium">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} {categoryFilter !== "All" ? `in ${categoryFilter}` : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0 text-red-600">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border"
            style={{
              background: categoryFilter === c ? "var(--accent-dim)" : "var(--bg-surface)",
              borderColor: categoryFilter === c ? "var(--accent-border)" : "var(--border-color)",
              color: categoryFilter === c ? "var(--accent)" : "var(--text-dim)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── Expense List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center bg-white space-y-3"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a.375.375 0 01-.375-.375V6.75A3.75 3.75 0 0010.5 3H5.625z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              No expenses recorded
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {searchQuery
                ? `No expenses found matching "${searchQuery}".`
                : categoryFilter === "All"
                ? "No expenses logged for this selected period."
                : `No ${categoryFilter.toLowerCase()} expenses found for this period.`}
            </p>
          </div>
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            + Log An Expense
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border bg-white p-3.5 transition-all flex items-center justify-between gap-3"
              style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Category Icon Circle */}
                <div className={`w-9 h-9 rounded-full ${CategoryBgColor(e.category)} flex items-center justify-center flex-shrink-0`}>
                  <CategoryIcon category={e.category} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                      {e.category}
                    </span>
                    <span className="text-[10px] font-medium text-stone-400">
                      {new Date(e.date).toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="font-semibold text-xs truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {e.description || "No description"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-extrabold text-sm text-red-600">
                  −₦{e.amount.toLocaleString("en-US")}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(e)}
                    className="p-1.5 rounded-xl border text-stone-500 hover:bg-stone-50 transition-colors"
                    style={{ borderColor: "var(--border-color)" }}
                    title="Edit Expense"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirmExpense(e);
                    }}
                    className="p-1.5 rounded-xl border text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                    title="Delete Expense"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.272 0c.967.031 1.71.84 1.71 1.838v.203H8.854v-.203c0-.998.743-1.807 1.71-1.838zM10.5 11.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm3 0a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4" style={{ borderColor: "var(--border-color)" }}>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.272 0c.967.031 1.71.84 1.71 1.838v.203H8.854v-.203c0-.998.743-1.807 1.71-1.838zM10.5 11.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm3 0a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Delete Expense?
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Permanently delete ₦{deleteConfirmExpense.amount.toLocaleString("en-US")} ({deleteConfirmExpense.category})? This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="text-xs font-semibold p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmExpense(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Edit Expense
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Category *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {editCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        editCategory === cat
                          ? "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Fuel for generator"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              {editError && (
                <div className="text-xs font-semibold p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editAmount}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ background: "var(--accent)" }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
