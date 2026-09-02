"use client";

import { useState } from "react";

type Props = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMonth: string | null; // "YYYY-MM" or null for "All"
  onMonthChange: (month: string | null) => void;
  placeholder?: string;
};

function getLagosCurrentYM(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM
}

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-NG", { month: "short", year: "numeric" });
}

function addMonths(ym: string, delta: number): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function SearchMonthToolbar({
  searchQuery,
  onSearchChange,
  selectedMonth,
  onMonthChange,
  placeholder = "Search...",
}: Props) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const currentYM = getLagosCurrentYM();
  const activeYM = selectedMonth || currentYM;
  const isCurrentMonth = selectedMonth === currentYM;
  const isAll = selectedMonth === null;

  function handlePrevMonth() {
    if (isAll) {
      onMonthChange(currentYM);
    } else {
      onMonthChange(addMonths(activeYM, -1));
    }
  }

  function handleNextMonth() {
    if (isAll) return;
    if (isCurrentMonth) return;
    const next = addMonths(activeYM, 1);
    if (next > currentYM) {
      onMonthChange(currentYM);
    } else {
      onMonthChange(next);
    }
  }

  return (
    <div className="w-full">
      {/* ── Mobile Expanded Search Mode (Shown when mobile search icon is tapped) ── */}
      {mobileSearchOpen ? (
        <div className="flex sm:hidden items-center gap-2 w-full animate-in fade-in duration-150">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border pl-10 pr-9 py-2 text-xs font-medium focus:outline-none transition-colors"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--accent)",
                color: "var(--text-primary)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold text-sm leading-none"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="px-3 py-2 rounded-2xl border bg-white font-bold text-xs text-stone-600 flex-shrink-0"
            style={{ borderColor: "var(--border-color)" }}
          >
            Done
          </button>
        </div>
      ) : (
        /* ── Standard Mode (Mobile Compact Row / Desktop Full Row) ── */
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Mobile Search Button (Compact 36px icon pill) */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            className="flex sm:hidden items-center gap-1.5 px-3 py-2 rounded-2xl border bg-white text-xs font-bold transition-all shadow-2xs relative flex-shrink-0"
            style={{
              borderColor: searchQuery ? "var(--accent-border)" : "var(--border-color)",
              color: searchQuery ? "var(--accent)" : "var(--text-muted)",
              background: searchQuery ? "var(--accent-dim)" : "var(--bg-surface)",
            }}
            title="Search records"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="truncate max-w-[80px]">
              {searchQuery ? searchQuery : "Search"}
            </span>
            {searchQuery && (
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            )}
          </button>

          {/* Desktop Search Input Box (Hidden on mobile when collapsed) */}
          <div className="hidden sm:block relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border pl-10 pr-9 py-2.5 text-xs font-medium focus:outline-none transition-colors"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold text-sm leading-none"
              >
                &times;
              </button>
            )}
          </div>

          {/* Month Selector Widget — Unbroken & Always Visible */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Previous Month Arrow */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-2xl border bg-white flex items-center justify-center transition-colors hover:bg-stone-50 active:scale-95 shadow-2xs"
              style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
              title="Previous month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Month Label / All Toggle Pill */}
            <button
              type="button"
              onClick={() => {
                if (isAll) {
                  onMonthChange(currentYM);
                } else {
                  onMonthChange(null);
                }
              }}
              className="px-3 py-2 rounded-2xl border font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs select-none"
              style={{
                background: isAll ? "var(--bg-surface)" : "var(--accent-dim)",
                borderColor: isAll ? "var(--border-color)" : "var(--accent-border)",
                color: isAll ? "var(--text-muted)" : "var(--accent)",
              }}
              title={isAll ? "Switch to month filter" : "Show all time"}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 opacity-80">
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3a.75.75 0 011.5 0v1.5h.75d0a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM3.75 9v9.75a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V9H3.75z" clipRule="evenodd" />
              </svg>
              <span>{isAll ? "All Time" : getMonthLabel(activeYM)}</span>
            </button>

            {/* Next Month Arrow */}
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isCurrentMonth || isAll}
              className="w-9 h-9 rounded-2xl border bg-white flex items-center justify-center transition-colors hover:bg-stone-50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
              style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
              title="Next month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
