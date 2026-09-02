"use client";

import { useRouter } from "next/navigation";

type Props = {
  currentMonth: string; // "YYYY-MM"
};

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

function addMonths(ym: string, delta: number): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getCurrentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthSelectorClient({ currentMonth }: Props) {
  const router = useRouter();
  const todayYM = getCurrentYM();
  const isCurrentMonth = currentMonth === todayYM;

  function navigate(delta: number) {
    const next = addMonths(currentMonth, delta);
    router.push(`/reports?month=${next}`);
  }

  return (
    <div className="flex items-center gap-3">
      {/* Left Arrow */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors hover:bg-stone-100 active:scale-95"
        style={{ borderColor: "var(--border-color)", color: "var(--text-muted)", background: "var(--bg-surface)" }}
        aria-label="Previous month"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Month Badge */}
      <div
        className="px-4 py-1.5 rounded-xl font-bold text-xs tracking-wide select-none"
        style={{
          background: isCurrentMonth ? "var(--warning-dim)" : "var(--bg-surface)",
          color: isCurrentMonth ? "var(--warning)" : "var(--text-primary)",
          border: "1px solid",
          borderColor: isCurrentMonth ? "var(--warning-border)" : "var(--border-color)",
        }}
      >
        {getMonthLabel(currentMonth)}
        {isCurrentMonth && (
          <span className="ml-1.5 text-[10px] opacity-70 font-semibold">· Current</span>
        )}
      </div>

      {/* Right Arrow */}
      <button
        type="button"
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors hover:bg-stone-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ borderColor: "var(--border-color)", color: "var(--text-muted)", background: "var(--bg-surface)" }}
        aria-label="Next month"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
