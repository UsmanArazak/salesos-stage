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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--icon-danger-text)" }}>
                {stats.lowStockCount} product{stats.lowStockCount !== 1 ? "s" : ""} running low
              </p>
              <p className="text-xs" style={{ color: "var(--icon-danger-text)", opacity: 0.75 }}>Tap to restock now</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0" style={{ color: "var(--icon-danger-text)", opacity: 0.5 }}>
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      )}

      {/* ── Hero: Today at a Glance ── */}
      <div
        className="rounded-2xl p-5 md:p-6 relative overflow-hidden transition-all"
        style={{
          background: "linear-gradient(135deg, var(--bg-base) 0%, var(--accent-dim) 100%)",
          border: "1px solid var(--accent-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Subtle decorative background shimmer */}
        <div
          className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
          style={{ background: "var(--accent)" }}
        />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--icon-accent-text)" }}>
            <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: "var(--accent)" }} />
            Today at a Glance
          </span>

          {/* vs yesterday badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: vsPositive ? "var(--success-dim)" : "var(--danger-dim)",
              color: vsPositive ? "var(--icon-success-text)" : "var(--icon-danger-text)",
              border: vsPositive ? "1px solid var(--success-border)" : "1px solid var(--danger-border)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
              {vsPositive ? (
                <path d="M8.25 6.75 12 3m0 0 3.75 3.75M12 3v18" />
              ) : (
                <path d="M15.75 17.25 12 21m0 0-3.75-3.75M12 21V3" />
              )}
            </svg>
            <span>{vsPositive ? "+" : "-"}{formatNaira(Math.abs(stats.vsYesterday))} vs yday</span>
          </div>
        </div>

        {/* Revenue Main Figure */}
        <div className="mb-4 relative z-10">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--icon-accent-text)" }}>Total Revenue</p>
          <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            {formatNaira(stats.salesToday)}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px my-3 relative z-10" style={{ background: "var(--accent-border)" }} />

        {/* Bottom stats: Expenses & Net Profit */}
        <div className="grid grid-cols-2 gap-4 pt-1 relative z-10">
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--icon-accent-text)" }}>Expenses</p>
            <p className="text-lg sm:text-xl font-bold" style={{ color: "var(--icon-danger-text)" }}>
              {formatNaira(stats.expensesToday)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--icon-accent-text)" }}>Net Profit</p>
            <p className="text-lg sm:text-xl font-bold flex items-center gap-1.5" style={{ color: "var(--icon-success-text)" }}>
              <span>{formatNaira(stats.netProfitToday)}</span>
              {isProfit && (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Profitable" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Overview Panel (Customer Debt, Low Stock, Month Performance — one panel) ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Overview</span>
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

        {/* Row 1: Customer Debt + Low Stock (actionable) */}
        <div className="grid grid-cols-2 divide-x divide-[var(--border-color)]">
          <Link href="/customers" className="flex items-center gap-2.5 px-4 sm:px-5 py-3 active:opacity-70 transition-opacity min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: stats.outstandingCredit > 0 ? "var(--icon-accent-bg)" : "var(--icon-neutral-bg)", color: stats.outstandingCredit > 0 ? "var(--icon-accent-text)" : "var(--icon-neutral-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Customer Debt</p>
              <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{formatNaira(stats.outstandingCredit)}</p>
            </div>
          </Link>

          <Link href="/inventory/alerts" className="flex items-center gap-2.5 px-4 sm:px-5 py-3 active:opacity-70 transition-opacity min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: stats.lowStockCount > 0 ? "var(--icon-danger-bg)" : "var(--icon-success-bg)", color: stats.lowStockCount > 0 ? "var(--icon-danger-text)" : "var(--icon-success-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Low Stock</p>
              <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {stats.lowStockCount} item{stats.lowStockCount !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: "var(--border-color)" }} />

        {/* Row 2: This month's Sales / Expenses / Profit */}
        <Link href="/reports" className="grid grid-cols-3 divide-x divide-[var(--border-color)] active:opacity-80 transition-opacity">
          <div className="px-3 sm:px-4 py-3.5 text-center min-w-0">
            <p className="text-[11px] mb-1 truncate" style={{ color: "var(--text-muted)" }}>{getMonthName()} Sales</p>
            <p className="text-xs sm:text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{formatNaira(stats.monthRevenue)}</p>
          </div>
          <div className="px-3 sm:px-4 py-3.5 text-center min-w-0">
            <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Expenses</p>
            <p className="text-xs sm:text-sm font-bold truncate" style={{ color: "var(--icon-danger-text)" }}>{formatNaira(stats.monthExpenses)}</p>
          </div>
          <div className="px-3 sm:px-4 py-3.5 text-center min-w-0">
            <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Profit</p>
            <p className="text-xs sm:text-sm font-bold truncate" style={{ color: stats.monthProfit >= 0 ? "var(--icon-success-text)" : "var(--icon-danger-text)" }}>
              {formatNaira(stats.monthProfit)}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Recent Sales ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recent Sales</p>
          <Link href="/sales" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>View all →</Link>
        </div>

        {stats.recentSales.length === 0 ? (
          <div className="py-10 text-center rounded-2xl flex flex-col items-center gap-3" style={{ background: "var(--bg-card)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
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
          <div
            className="rounded-2xl overflow-hidden divide-y divide-[var(--border-color)]"
            style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}
          >
            {stats.recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center gap-3 p-4"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: sale.paymentMethod === "credit" ? "var(--icon-accent-bg)" : sale.paymentMethod === "transfer" ? "rgba(59,130,246,0.12)" : "var(--icon-success-bg)",
                    color: sale.paymentMethod === "credit" ? "var(--icon-accent-text)" : sale.paymentMethod === "transfer" ? "#2563eb" : "var(--icon-success-text)",
                  }}
                >
                  {sale.customerName ? sale.customerName.charAt(0).toUpperCase() : sale.paymentMethod === "transfer" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>
                  ) : sale.paymentMethod === "credit" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" /></svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{sale.primaryTitle}</p>
                  <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <span>{sale.time}</span>
                    <span>•</span>
                    <span
                      className="px-1.5 py-0.5 rounded-lg text-xs font-medium capitalize"
                      style={{
                        background: sale.paymentMethod === "credit" ? "var(--icon-accent-bg)" : sale.paymentMethod === "transfer" ? "rgba(59,130,246,0.1)" : "var(--icon-success-bg)",
                        color: sale.paymentMethod === "credit" ? "var(--icon-accent-text)" : sale.paymentMethod === "transfer" ? "#2563eb" : "var(--icon-success-text)",
                      }}
                    >
                      {sale.paymentMethod}
                    </span>
                    {sale.secondaryInfo && <><span>•</span><span className="truncate">{sale.secondaryInfo}</span></>}
                  </p>
                </div>

                <p className="text-sm font-bold flex-shrink-0" style={{ color: sale.paymentMethod === "credit" ? "var(--icon-accent-text)" : "var(--icon-success-text)" }}>
                  +{formatNaira(sale.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Product", href: "/inventory/new", iconBg: "var(--icon-neutral-bg)", iconColor: "var(--icon-neutral-text)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg> },
            { label: "Add Debtor", href: "/customers/new", iconBg: "var(--icon-neutral-bg)", iconColor: "var(--icon-neutral-text)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg> },
            { label: "View Reports", href: "/reports", iconBg: "var(--icon-accent-bg)", iconColor: "var(--icon-accent-text)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
            { label: "Expenses", href: "/expenses", iconBg: "var(--icon-danger-bg)", iconColor: "var(--icon-danger-text)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg> },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold transition-all active:scale-[0.97] text-center hover:bg-[var(--icon-neutral-bg)]" style={{ color: "var(--text-primary)" }}>
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

