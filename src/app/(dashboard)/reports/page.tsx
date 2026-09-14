import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { MonthSelectorClient } from "./MonthSelectorClient";

function formatNaira(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("en-US").format(abs);
  return (amount < 0 ? "-₦" : "₦") + formatted;
}

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

// SVG Icons
function IconTrendUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IconTrendDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceRoleSupabaseClient();
  const shopId = session.user.shopId;

  // -- Determine selected month from URL param or default to current month --
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedYM = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
    ? searchParams.month
    : currentYM;

  const [selYear, selMonth] = selectedYM.split("-").map(Number);

  // Selected month date boundaries
  const monthStart = new Date(selYear, selMonth - 1, 1).toISOString();
  const monthEnd = new Date(selYear, selMonth, 1).toISOString();
  const monthStartYMD = `${selYear}-${String(selMonth).padStart(2, "0")}-01`;
  const monthEndYMD = `${selYear}-${String(selMonth).padStart(2, "0")}-${new Date(selYear, selMonth, 0).getDate()}`;

  // Today & Yesterday (always live)
  const todayISO = now.toISOString().split("T")[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split("T")[0];

  // -- Parallel data fetches --
  const [
    { data: salesMonth },
    { data: expensesMonth },
    { data: customersRaw },
    { data: productsRaw },
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total_amount, created_at, payment_method, bank_name, notes")
      .eq("shop_id", shopId)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
    supabase
      .from("expenses")
      .select("amount, date")
      .eq("shop_id", shopId)
      .gte("date", monthStartYMD)
      .lte("date", monthEndYMD),
    supabase
      .from("customers")
      .select("id, name, total_debt, phone")
      .eq("shop_id", shopId),
    supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("shop_id", shopId)
      .eq("archived", false),
  ]);

  const salesM = (salesMonth ?? []).filter((s) => !s.notes?.startsWith("[VOIDED]"));
  const expensesM = expensesMonth ?? [];

  // Sale items for COGS
  const saleIds = salesM.map((s) => s.id);
  const { data: saleItemsRaw } = saleIds.length > 0
    ? await supabase
        .from("sale_items")
        .select("sale_id, product_id, unit_cost, unit_price, quantity")
        .in("sale_id", saleIds)
    : { data: [] };
  const saleItems = saleItemsRaw ?? [];

  // -- Computations --
  const isTodayDate = (s: string) => s.startsWith(todayISO);
  const isYesterdayDate = (s: string) => s.startsWith(yesterdayISO);

  // Today
  const salesTodayRows = salesM.filter((s) => isTodayDate(s.created_at));
  const idsToday = salesTodayRows.map((s) => s.id);
  const revenueToday = salesTodayRows.reduce((sum, s) => sum + s.total_amount, 0);
  const cogsToday = saleItems.filter((i) => idsToday.includes(i.sale_id)).reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
  const expToday = expensesM.filter((e) => isTodayDate(e.date)).reduce((sum, e) => sum + e.amount, 0);
  const profitToday = revenueToday - cogsToday;

  // Yesterday
  const salesYestRows = salesM.filter((s) => isYesterdayDate(s.created_at));
  const idsYest = salesYestRows.map((s) => s.id);
  const revenueYest = salesYestRows.reduce((sum, s) => sum + s.total_amount, 0);
  const cogsYest = saleItems.filter((i) => idsYest.includes(i.sale_id)).reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
  const expYest = expensesM.filter((e) => isYesterdayDate(e.date)).reduce((sum, e) => sum + e.amount, 0);
  const profitYest = revenueYest - cogsYest;

  // Month totals
  const revenueMonth = salesM.reduce((sum, s) => sum + s.total_amount, 0);
  const cogsMonth = saleItems.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
  const expMonth = expensesM.reduce((sum, e) => sum + e.amount, 0);
  const profitMonth = revenueMonth - cogsMonth;

  // Trend
  const profitDiff = profitToday - profitYest;
  const isProfitUp = profitDiff >= 0;

  // Debt
  const totalUncollectedDebt = (customersRaw ?? []).reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const topDebtors = (customersRaw ?? [])
    .filter((c) => (c.total_debt || 0) > 0)
    .sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0))
    .slice(0, 5);

  // Products
  const activeProducts = productsRaw ?? [];
  const soldProductIds = new Set(saleItems.map((i) => i.product_id));

  const deadStock = activeProducts
    .filter((p) => p.stock_quantity > 0 && !soldProductIds.has(p.id))
    .slice(0, 5);

  const productStats = activeProducts
    .map((p) => {
      const its = saleItems.filter((item) => item.product_id === p.id);
      const qty = its.reduce((s, i) => s + i.quantity, 0);
      const revenue = its.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const cost = its.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
      return { name: p.name, qty, revenue, profit: revenue - cost };
    })
    .filter((s) => s.qty > 0);

  const topSelling = [...productStats].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const mostProfitable = [...productStats].sort((a, b) => b.profit - a.profit).slice(0, 5);

  // Bank breakdown
  const transferSales = salesM.filter((s) => s.payment_method === "transfer" && s.bank_name);
  const bankBreakdown: Record<string, number> = {};
  for (const s of transferSales) {
    bankBreakdown[s.bank_name] = (bankBreakdown[s.bank_name] || 0) + s.total_amount;
  }
  const bankEntries = Object.entries(bankBreakdown).sort((a, b) => b[1] - a[1]);
  const totalTransfers = transferSales.reduce((sum, s) => sum + s.total_amount, 0);

  const monthLabel = getMonthLabel(selectedYM);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Page Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-2xl border flex items-center justify-center transition-colors bg-white hover:bg-stone-50"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Business Performance
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Track your true profit and cash flow health
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <MonthSelectorClient currentMonth={selectedYM} />
      </div>

      {/* ── Today vs Yesterday ── (always live, not month-filtered) */}
      <div className="grid grid-cols-2 gap-3">
        {/* TODAY */}
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{
            background: profitToday >= 0 ? "var(--success-surface)" : "var(--danger-surface)",
            borderColor: profitToday >= 0 ? "var(--success-border)" : "var(--danger-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: profitToday >= 0 ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.1)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)" }}>
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)" }}>
              Today
            </p>
          </div>

          <div>
            <p className="text-2xl font-black leading-tight" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatNaira(profitToday)}
            </p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)", opacity: 0.7 }}>
              Gross Profit
            </p>
          </div>

          {profitYest !== 0 && (
            <div
              className="flex items-center gap-1 text-[10px] font-bold"
              style={{ color: isProfitUp ? "var(--success)" : "var(--danger)" }}
            >
              {isProfitUp ? <IconTrendUp /> : <IconTrendDown />}
              <span>
                {isProfitUp ? "+" : ""}{formatNaira(profitDiff)} vs yesterday
              </span>
            </div>
          )}

          <div className="pt-2 border-t space-y-1" style={{ borderColor: profitToday >= 0 ? "var(--success-border)" : "var(--danger-border)" }}>
            <div className="flex justify-between text-[10px]" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)", opacity: 0.8 }}>
              <span>Revenue</span>
              <span className="font-bold">{formatNaira(revenueToday)}</span>
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: profitToday >= 0 ? "var(--success)" : "var(--danger)", opacity: 0.7 }}>
              <span>COGS</span>
              <span>-{formatNaira(cogsToday)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>Expenses</span>
              <span>{formatNaira(expToday)}</span>
            </div>
          </div>
        </div>

        {/* YESTERDAY */}
        <div
          className="rounded-2xl border p-4 bg-white space-y-3"
          style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-stone-100">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-stone-500">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
              Yesterday
            </p>
          </div>

          <div>
            <p className="text-2xl font-black leading-tight" style={{ color: "var(--text-primary)" }}>
              {formatNaira(profitYest)}
            </p>
            <p className="text-[10px] font-medium mt-0.5 text-stone-400">
              Gross Profit
            </p>
          </div>

          <div className="pt-2 border-t space-y-1" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>Revenue</span>
              <span className="font-bold text-stone-800">{formatNaira(revenueYest)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>COGS</span>
              <span>-{formatNaira(cogsYest)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>Expenses</span>
              <span>{formatNaira(expYest)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Summary ── */}
      <div
        className="rounded-2xl border bg-white p-5 space-y-4"
        style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {monthLabel} Summary
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Revenue, cost, and gross profit for the selected month
          </p>
        </div>

        <div className="space-y-3">
          {/* Revenue */}
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                  <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Total Revenue</span>
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{formatNaira(revenueMonth)}</span>
          </div>

          {/* COGS */}
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Cost of Goods Sold</span>
            </div>
            <span className="font-bold text-sm text-red-600">-{formatNaira(cogsMonth)}</span>
          </div>

          {/* Expenses */}
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-stone-500">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM9 8.25a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 14.25H15a.75.75 0 000-1.5h-4.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 8.25H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Total Expenses</span>
                <span className="text-[10px] ml-1.5 text-stone-400">(not deducted)</span>
              </div>
            </div>
            <span className="font-bold text-sm text-stone-500">{formatNaira(expMonth)}</span>
          </div>

          {/* Gross Profit */}
          <div
            className="flex items-center justify-between py-3 px-4 rounded-2xl"
            style={{
              background: profitMonth >= 0 ? "var(--success-surface)" : "var(--danger-surface)",
              border: "1px solid",
              borderColor: profitMonth >= 0 ? "var(--success-border)" : "var(--danger-border)",
            }}
          >
            <span className="text-sm font-bold" style={{ color: profitMonth >= 0 ? "var(--success)" : "var(--danger)" }}>
              Gross Monthly Profit
            </span>
            <span className="text-xl font-black" style={{ color: profitMonth >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatNaira(profitMonth)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Product Performance Insights ── */}
      <div
        className="rounded-2xl border bg-white p-5 space-y-5"
        style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {monthLabel} Product Insights
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Best performing and stagnant stock for the selected month
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Top Selling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
                  <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.&quot;52 5.99l.299 1.043H5.25a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75H18.75a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75h-2.88l.3-1.042a6.752 6.752 0 006.52-5.99.75.75 0 00-.585-.86 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Top Selling</p>
            </div>
            {topSelling.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No sales this month.</p>
            ) : (
              <ul className="space-y-2">
                {topSelling.map((p, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs">
                    <span className="truncate max-w-[100px] font-medium text-stone-700">{p.name}</span>
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                      {p.qty} sold
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Most Profitable */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600">
                  <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 00-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Most Profitable</p>
            </div>
            {mostProfitable.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No sales this month.</p>
            ) : (
              <ul className="space-y-2">
                {mostProfitable.map((p, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs">
                    <span className="truncate max-w-[100px] font-medium text-stone-700">{p.name}</span>
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                      {formatNaira(p.profit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dead Stock */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-red-500">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-500">Dead Stock</p>
            </div>
            {deadStock.length === 0 ? (
              <p className="text-xs text-stone-400 italic">All items sold this month.</p>
            ) : (
              <ul className="space-y-2">
                {deadStock.map((p, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs">
                    <span className="truncate max-w-[100px] font-medium text-stone-700">{p.name}</span>
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px]">
                      {p.stock_quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Cash Flow & Uncollected Debt ── */}
      <div
        className="rounded-2xl border bg-white p-5 space-y-4"
        style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Cash Flow Health
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Total money owed to you by customers across all time
          </p>
        </div>

        {/* Uncollected Debt Metric */}
        <Link href="/customers">
          <div
            className="flex items-center justify-between p-4 rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "var(--accent)" }}>
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>Uncollected Debt</p>
                <p className="text-[10px]" style={{ color: "var(--accent)", opacity: 0.7 }}>Tap to view all customers →</p>
              </div>
            </div>
            <p className="text-xl font-black" style={{ color: "var(--accent)" }}>
              {formatNaira(totalUncollectedDebt)}
            </p>
          </div>
        </Link>

        {/* Top Debtors */}
        {topDebtors.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Top Outstanding Debtors
            </p>
            <div className="space-y-2">
              {topDebtors.map((debtor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 border-b last:border-0"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {debtor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate" style={{ color: "var(--text-primary)" }}>
                        {debtor.name}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {debtor.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>
                      {formatNaira(debtor.total_debt)}
                    </span>
                    {debtor.phone && (
                      <a
                        href={`https://wa.me/${debtor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${debtor.name}, a friendly reminder from ${shopId ? "your shop" : "us"} regarding your outstanding balance of ${formatNaira(debtor.total_debt)}. Please let us know when you will be settling this. Thank you!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
                        style={{ background: "#25D366" }}
                        title="Send WhatsApp Reminder"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bank Transfer Breakdown ── */}
      <div
        className="rounded-2xl border bg-white p-5 space-y-4"
        style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {monthLabel} Bank Transfers
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Revenue received per bank account via transfer
          </p>
        </div>

        {bankEntries.length === 0 ? (
          <div className="py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-stone-400">
                <path d="M11.584 2.376a.75.75 0 01.832 0l9 6a.75.75 0 11-.832 1.248L12 3.901 3.416 9.624a.75.75 0 01-.832-1.248l9-6z" />
                <path fillRule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 010 1.5H3a.75.75 0 010-1.5h.75v-9.918a.75.75 0 01.634-.74A49.109 49.109 0 0112 9c2.59 0 5.134.202 7.616.592a.75.75 0 01.634.74z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs text-stone-400">No bank transfers recorded for {monthLabel}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bankEntries.map(([bank, amount]) => {
              const pct = totalTransfers > 0 ? Math.round((amount / totalTransfers) * 100) : 0;
              const initial = bank.charAt(0).toUpperCase();
              return (
                <div key={bank} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                        style={{ background: "var(--accent)" }}
                      >
                        {initial}
                      </div>
                      <span className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{bank}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>{formatNaira(amount)}</span>
                      <span className="text-[10px] text-stone-400 ml-1.5">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              );
            })}

            <div
              className="flex justify-between items-center pt-3 border-t text-xs font-bold"
              style={{ borderColor: "var(--border-color)" }}
            >
              <span style={{ color: "var(--text-primary)" }}>Total Transfers — {monthLabel}</span>
              <span style={{ color: "var(--accent)" }}>{formatNaira(totalTransfers)}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
