import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { OnboardingChecklist } from "@/components/ui/OnboardingChecklist";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("en-US").format(abs);
  return (amount < 0 ? "-₦" : "₦") + formatted;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getMonthName(): string {
  return new Date().toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    month: "long",
    year: "numeric",
  });
}

function getLagosDates() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayISO = formatter.format(new Date());
  const [year, month] = todayISO.split("-");
  const monthStart = `${year}-${month}-01`;
  const todayStart = `${todayISO}T00:00:00+01:00`;

  // Yesterday
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterdayISO = formatter.format(yd);
  const yesterdayStart = `${yesterdayISO}T00:00:00+01:00`;

  return { todayISO, monthStart, todayStart, yesterdayISO, yesterdayStart };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getDashboardStats(shopId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { todayISO, monthStart, todayStart, yesterdayStart } = getLagosDates();

  const [
    { data: todaySalesRaw },
    { data: yesterdaySalesRaw },
    { data: monthSalesRaw },
    { data: products },
    { data: openCredit },
    { data: monthExpensesRaw },
    { data: todayExpensesRaw },
    { count: allSalesCount },
    { count: customerCount },
    { data: recentSalesRaw },
  ] = await Promise.all([
    supabase.from("sales").select("id, total_amount, notes").eq("shop_id", shopId).gte("created_at", todayStart),
    supabase.from("sales").select("id, total_amount, notes").eq("shop_id", shopId).gte("created_at", yesterdayStart).lt("created_at", todayStart),
    supabase.from("sales").select("id, total_amount, notes").eq("shop_id", shopId).gte("created_at", `${monthStart}T00:00:00+01:00`),
    supabase.from("products").select("buying_price, stock_quantity, low_stock_threshold").eq("shop_id", shopId).eq("archived", false),
    supabase.from("credit_sales").select("amount, amount_paid").eq("shop_id", shopId).neq("status", "paid"),
    supabase.from("expenses").select("amount").eq("shop_id", shopId).gte("date", monthStart),
    supabase.from("expenses").select("amount").eq("shop_id", shopId).eq("date", todayISO),
    supabase.from("sales").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase
      .from("sales")
      .select("id, total_amount, payment_method, notes, created_at, credit_sales(customer_id, customers(name)), sale_items(quantity, products(name))")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Today COGS
  const activeTodaySales = (todaySalesRaw ?? []).filter((s) => !s.notes?.startsWith("[VOIDED]"));
  const saleIds = activeTodaySales.map((s) => s.id);
  const { data: todaySaleItems } =
    saleIds.length > 0
      ? await supabase.from("sale_items").select("unit_cost, quantity").in("sale_id", saleIds)
      : { data: [] as { unit_cost: number; quantity: number }[] };

  const salesToday = activeTodaySales.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const cogsSold = (todaySaleItems ?? []).reduce((s, i) => s + i.unit_cost * i.quantity, 0);
  const expensesToday = (todayExpensesRaw ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const grossProfit = salesToday - cogsSold;
  const netProfitToday = grossProfit - expensesToday;

  const salesYesterday = (yesterdaySalesRaw ?? [])
    .filter((s) => !s.notes?.startsWith("[VOIDED]"))
    .reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const vsYesterday = salesToday - salesYesterday;

  const monthRevenue = (monthSalesRaw ?? [])
    .filter((s) => !s.notes?.startsWith("[VOIDED]"))
    .reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const monthExpenses = (monthExpensesRaw ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const monthProfit = monthRevenue - monthExpenses;

  const outstandingCredit = (openCredit ?? []).reduce((s, c) => s + ((c.amount ?? 0) - (c.amount_paid ?? 0)), 0);
  const lowStockCount = (products ?? []).filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

  const hasProducts = (products?.length ?? 0) > 0;
  const hasSales = (allSalesCount ?? 0) > 0;
  const hasCustomers = (customerCount ?? 0) > 0;

  const recentSales = (recentSalesRaw ?? [])
    .filter((s) => !s.notes?.startsWith("[VOIDED]"))
    .slice(0, 5)
    .map((s) => {
      const creditArr = Array.isArray(s.credit_sales) ? s.credit_sales : s.credit_sales ? [s.credit_sales] : [];
      const firstCredit = creditArr[0] as { customer_id?: string; customers?: { name: string } | { name: string }[] | null } | undefined;
      const customersVal = firstCredit?.customers;
      const customerName = customersVal
        ? Array.isArray(customersVal)
          ? (customersVal[0] as { name: string })?.name
          : (customersVal as { name: string }).name
        : null;

      const itemsArr = Array.isArray(s.sale_items) ? s.sale_items : [];
      const itemSummaries = itemsArr
        .map((item: { quantity: number; products?: { name: string } | { name: string }[] | null }) => {
          const prodName = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name;
          return prodName ? `${item.quantity}x ${prodName}` : null;
        })
        .filter(Boolean) as string[];

      let itemsText = "";
      if (itemSummaries.length === 1) itemsText = itemSummaries[0];
      else if (itemSummaries.length === 2) itemsText = itemSummaries.join(", ");
      else if (itemSummaries.length > 2) itemsText = `${itemSummaries.slice(0, 2).join(", ")} +${itemSummaries.length - 2} more`;

      const primaryTitle = customerName || itemsText || "Direct Sale";
      const secondaryInfo = customerName && itemsText ? itemsText : null;
      const paymentMethod = s.payment_method ?? "cash";

      return { id: s.id, amount: s.total_amount ?? 0, time: formatTime(s.created_at), paymentMethod, primaryTitle, secondaryInfo, customerName };
    });

  return {
    salesToday, cogsSold, expensesToday, grossProfit, netProfitToday,
    salesYesterday, vsYesterday,
    monthRevenue, monthExpenses, monthProfit,
    outstandingCredit, lowStockCount,
    hasProducts, hasSales, hasCustomers,
    recentSales,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const stats = await getDashboardStats(session.user.shopId);
  const isProfit = stats.netProfitToday >= 0;
  const vsPositive = stats.vsYesterday >= 0;

  const onboardingSteps = [
    {
      key: "product",
      emoji: "📦",
      title: "Add your first product",
      description: "Add the products you sell: their name, how much you buy them, how much you sell them, and how many you have.",
      href: "/inventory/new",
      cta: "Add Product",
      done: stats.hasProducts,
    },
    {
      key: "sale",
      emoji: "💰",
      title: "Record your first sale",
      description: "Every time you sell something, record the sale to calculate your profit.",
      href: "/sales/new",
      cta: "Record Sale",
      done: stats.hasSales,
    },
    {
      key: "customer",
      emoji: "👤",
      title: "Add a customer on debt",
      description: "Add customers who owe you money or buy on credit, so you can easily track their debts.",
      href: "/customers/new",
      cta: "Add Customer",
      done: stats.hasCustomers,
    },
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{todayLabel()}</p>
        </div>
        <Link
          href="/sales/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Record Sale
        </Link>
      </div>

      {/* ── Onboarding ── */}
      <OnboardingChecklist steps={onboardingSteps} />

      {/* ── Smart Alert Bar — Low Stock ── */}
      {stats.lowStockCount > 0 && (
        <Link href="/inventory/alerts">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all active:scale-[0.99]"
            style={{ background: "var(--icon-danger-bg)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", color: "var(--icon-danger-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--icon-danger-text)" }}>
                {stats.lowStockCount} product{stats.lowStockCount !== 1 ? "s" : ""} running low
              </p>
              <p className="text-xs" style={{ color: "var(--icon-danger-text)", opacity: 0.75 }}>Tap to restock now</p>
            </div>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" style={{ color: "var(--icon-danger-text)", opacity: 0.5 }}>
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>
      )}

      {/* ── Hero: Today at a Glance (Aesthetic Soft Light-Orange Gradient) ── */}
      <div
        className="rounded-[24px] p-5 md:p-6 relative overflow-hidden transition-all"
        style={{
          background: "linear-gradient(135deg, #fffbf7 0%, #ffede0 50%, #fedac2 100%)",
          border: "1px solid rgba(253, 103, 1, 0.22)",
          boxShadow: "0 8px 24px -4px rgba(253, 103, 1, 0.10), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
        }}
      >
        {/* Subtle decorative background shimmer */}
        <div
          className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
          style={{ background: "#fdba74" }}
        />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#c2410c] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ea580c] inline-block animate-pulse" />
            Today at a Glance
          </span>

          {/* vs yesterday badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: vsPositive ? "rgba(22, 163, 74, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: vsPositive ? "#15803d" : "#b91c1c",
              border: vsPositive ? "1px solid rgba(22, 163, 74, 0.20)" : "1px solid rgba(239, 68, 68, 0.20)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
              {vsPositive ? (
                <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M12.53 21.53a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V7.5a.75.75 0 011.5 0v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5z" clipRule="evenodd" />
              )}
            </svg>
            <span>{vsPositive ? "+" : "-"}{formatNaira(Math.abs(stats.vsYesterday))} vs yday</span>
          </div>
        </div>

        {/* Revenue Main Figure */}
        <div className="mb-4 relative z-10">
          <p className="text-xs text-[#9a3412] font-semibold mb-1">Total Revenue</p>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#373435]">
            {formatNaira(stats.salesToday)}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#fdba74]/35 my-3 relative z-10" />

        {/* Bottom stats: Expenses & Net Profit */}
        <div className="grid grid-cols-2 gap-4 pt-1 relative z-10">
          <div>
            <p className="text-xs text-[#9a3412] font-semibold mb-0.5">Expenses</p>
            <p className="text-lg sm:text-xl font-bold text-[#b91c1c]">
              {formatNaira(stats.expensesToday)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9a3412] font-semibold mb-0.5">Net Profit</p>
            <p className="text-lg sm:text-xl font-bold text-[#15803d] flex items-center gap-1.5">
              <span>{formatNaira(stats.netProfitToday)}</span>
              {isProfit && (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Profitable" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Stat Cards (Between Today & Month) ── */}
      <div className="grid grid-cols-2 gap-3.5">
        <Link href="/customers" className="block active:scale-[0.98] transition-transform">
          <div className="rounded-[20px] p-4 flex flex-col gap-2 h-full bg-white" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: stats.outstandingCredit > 0 ? "var(--icon-warning-bg)" : "var(--icon-neutral-bg)", color: stats.outstandingCredit > 0 ? "var(--icon-warning-text)" : "var(--icon-neutral-text)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Customer Debt</p>
            <p className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{formatNaira(stats.outstandingCredit)}</p>
          </div>
        </Link>

        <Link href="/inventory/alerts" className="block active:scale-[0.98] transition-transform">
          <div className="rounded-[20px] p-4 flex flex-col gap-2 h-full bg-white" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: stats.lowStockCount > 0 ? "var(--icon-danger-bg)" : "var(--icon-success-bg)", color: stats.lowStockCount > 0 ? "var(--icon-danger-text)" : "var(--icon-success-text)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Low Stock</p>
            <p className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              {stats.lowStockCount} item{stats.lowStockCount !== 1 ? "s" : ""}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Separated Section: Monthly Breakdown ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Monthly Overview
          </p>
          <Link
            href="/reports"
            className="text-xs font-semibold flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            <span>Full Report</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        <Link href="/reports" className="block active:scale-[0.99] transition-transform">
          <div
            className="rounded-[22px] p-4 sm:p-5 transition-all"
            style={{
              background: "var(--bg-card)",
              boxShadow: "var(--card-shadow)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Header row with Month title + Running Totals Pill */}
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#fd6701]" />
                <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {getMonthName()} Performance
                </span>
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "var(--icon-neutral-bg)", color: "var(--text-muted)" }}
              >
                Running Totals
              </span>
            </div>

            {/* 3 Metric Cells - Mobile-First Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Month Revenue */}
              <div className="rounded-xl p-2.5 sm:p-3 bg-white flex flex-col justify-center text-center shadow-xs border border-stone-200/60">
                <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Sales</p>
                <p className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
                  {formatNaira(stats.monthRevenue)}
                </p>
              </div>

              {/* Month Expenses */}
              <div className="rounded-xl p-2.5 sm:p-3 bg-white flex flex-col justify-center text-center shadow-xs border border-stone-200/60">
                <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Expenses</p>
                <p className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight truncate text-rose-600">
                  {formatNaira(stats.monthExpenses)}
                </p>
              </div>

              {/* Month Profit */}
              <div className="rounded-xl p-2.5 sm:p-3 bg-white flex flex-col justify-center text-center shadow-xs border border-stone-200/60">
                <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Net Profit</p>
                <p
                  className={`text-xs sm:text-sm md:text-base font-extrabold tracking-tight truncate ${
                    stats.monthProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatNaira(stats.monthProfit)}
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Recent Sales ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Recent Sales</p>
          <Link href="/sales" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>View all →</Link>
        </div>

        {stats.recentSales.length === 0 ? (
          <div className="py-10 text-center rounded-[20px] flex flex-col items-center gap-3" style={{ background: "var(--bg-card)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No sales recorded yet today</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tap below to record your first sale</p>
            </div>
            <Link href="/sales/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
              + Record Sale
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center gap-3 rounded-[24px] p-4"
                style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: sale.paymentMethod === "credit" ? "var(--icon-warning-bg)" : sale.paymentMethod === "transfer" ? "rgba(59,130,246,0.12)" : "var(--icon-success-bg)",
                    color: sale.paymentMethod === "credit" ? "var(--icon-warning-text)" : sale.paymentMethod === "transfer" ? "#2563eb" : "var(--icon-success-text)",
                  }}
                >
                  {sale.customerName ? sale.customerName.charAt(0).toUpperCase() : sale.paymentMethod === "transfer" ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.584 2.257a.75.75 0 01.832 0l9 6A.75.75 0 0121 9.5v.75H3V9.5a.75.75 0 01.584-.743l9-6zM3.75 11.75h16.5V18H3.75v-6.25zM2 19.5a.75.75 0 01.75-.75h18.5a.75.75 0 010 1.5H2.75A.75.75 0 012 19.5z" /></svg>
                  ) : sale.paymentMethod === "credit" ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" /></svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{sale.primaryTitle}</p>
                  <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <span>{sale.time}</span>
                    <span>•</span>
                    <span
                      className="px-1.5 py-0.5 rounded-md text-xs font-medium capitalize"
                      style={{
                        background: sale.paymentMethod === "credit" ? "var(--icon-warning-bg)" : sale.paymentMethod === "transfer" ? "rgba(59,130,246,0.1)" : "var(--icon-success-bg)",
                        color: sale.paymentMethod === "credit" ? "var(--icon-warning-text)" : sale.paymentMethod === "transfer" ? "#2563eb" : "var(--icon-success-text)",
                      }}
                    >
                      {sale.paymentMethod}
                    </span>
                    {sale.secondaryInfo && <><span>•</span><span className="truncate">{sale.secondaryInfo}</span></>}
                  </p>
                </div>

                <p className="text-sm font-bold flex-shrink-0" style={{ color: sale.paymentMethod === "credit" ? "var(--icon-warning-text)" : "var(--icon-success-text)" }}>
                  +{formatNaira(sale.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Product", href: "/inventory/new", iconBg: "var(--icon-neutral-bg)", iconColor: "var(--icon-neutral-text)", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg> },
            { label: "Add Debtor", href: "/customers/new", iconBg: "var(--icon-neutral-bg)", iconColor: "var(--icon-neutral-text)", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg> },
            { label: "View Reports", href: "/reports", iconBg: "var(--icon-accent-bg)", iconColor: "var(--icon-accent-text)", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18 4h-2v16h2V4zM12 9h-2v11h2V9zM6 14H4v6h2v-6z" /></svg> },
            { label: "Expenses", href: "/expenses", iconBg: "var(--icon-danger-bg)", iconColor: "var(--icon-danger-text)", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4l-4 4h3v7h2V8h3l-4-4zm0 16l4-4h-3v-7h-2v7H8l4 4z" /></svg> },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-sm font-semibold transition-all active:scale-[0.97] bg-white text-center" style={{ boxShadow: "var(--card-shadow)", color: "var(--text-primary)" }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: action.iconBg, color: action.iconColor }}>
                {action.icon}
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

