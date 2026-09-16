import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import { PerformanceDashboard } from "./PerformanceDashboard";

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
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
      .select("amount, date, category")
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

  // -- Daily trend (revenue & profit per day, for the chart) --
  const cogsBySale: Record<string, number> = {};
  for (const item of saleItems) {
    cogsBySale[item.sale_id] = (cogsBySale[item.sale_id] || 0) + item.unit_cost * item.quantity;
  }
  const dailyMap: Record<string, { revenue: number; profit: number }> = {};
  for (const s of salesM) {
    const day = s.created_at.split("T")[0];
    const cogs = cogsBySale[s.id] || 0;
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, profit: 0 };
    dailyMap[day].revenue += s.total_amount;
    dailyMap[day].profit += s.total_amount - cogs;
  }
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const dailyTrend = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = `${selYear}-${String(selMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const d = dailyMap[dayStr] || { revenue: 0, profit: 0 };
    return { day: dayNum, revenue: Math.round(d.revenue), profit: Math.round(d.profit) };
  });

  // -- Revenue by payment method --
  const paymentTotals: Record<string, number> = { cash: 0, transfer: 0, credit: 0 };
  for (const s of salesM) {
    const method = s.payment_method === "credit" || s.payment_method === "transfer" ? s.payment_method : "cash";
    paymentTotals[method] += s.total_amount;
  }
  const paymentBreakdown = [
    { name: "Cash", value: paymentTotals.cash, color: "var(--success)" },
    { name: "Transfer", value: paymentTotals.transfer, color: "var(--info)" },
    { name: "Credit", value: paymentTotals.credit, color: "var(--accent)" },
  ].filter((p) => p.value > 0);

  // -- Expenses by category --
  const expenseCategoryTotals: Record<string, number> = {};
  for (const e of expensesM as Array<{ amount: number; date: string; category?: string }>) {
    const cat = e.category || "Other";
    expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + e.amount;
  }
  const expenseBreakdown = Object.entries(expenseCategoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // -- Shop Health Score (0-100): profit margin + debt ratio + stock turnover --
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const profitMargin = revenueMonth > 0 ? profitMonth / revenueMonth : 0;
  const marginScore = clamp(Math.round(((profitMargin + 0.1) / 0.5) * 40), 0, 40);

  const debtRatio = revenueMonth > 0 ? totalUncollectedDebt / revenueMonth : totalUncollectedDebt > 0 ? 1 : 0;
  const debtScore = clamp(Math.round(30 - debtRatio * 30), 0, 30);

  const totalStockQty = activeProducts.reduce((s, p) => s + (p.stock_quantity || 0), 0);
  const unitsSoldMonth = saleItems.reduce((s, i) => s + i.quantity, 0);
  const turnoverRatio = totalStockQty > 0 ? unitsSoldMonth / totalStockQty : unitsSoldMonth > 0 ? 1 : 0;
  const turnoverScore = clamp(Math.round(turnoverRatio * 30), 0, 30);

  const healthScore = marginScore + debtScore + turnoverScore;
  const healthBand = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Needs Attention";
  const healthColor = healthScore >= 70 ? "var(--success)" : healthScore >= 40 ? "var(--warning)" : "var(--danger)";

  return (
    <PerformanceDashboard
      monthLabel={monthLabel}
      profitToday={profitToday} revenueToday={revenueToday} cogsToday={cogsToday} expToday={expToday}
      profitYest={profitYest} revenueYest={revenueYest} cogsYest={cogsYest} expYest={expYest}
      profitDiff={profitDiff} isProfitUp={isProfitUp}
      revenueMonth={revenueMonth} cogsMonth={cogsMonth} expMonth={expMonth} profitMonth={profitMonth}
      dailyTrend={dailyTrend}
      paymentBreakdown={paymentBreakdown}
      expenseBreakdown={expenseBreakdown}
      topSelling={topSelling}
      mostProfitable={mostProfitable}
      deadStock={deadStock}
      totalUncollectedDebt={totalUncollectedDebt}
      topDebtors={topDebtors}
      bankEntries={bankEntries}
      totalTransfers={totalTransfers}
      healthScore={healthScore}
      healthBand={healthBand}
      healthColor={healthColor}
      selectedYM={selectedYM}
    />
  );
}
