"use client";

import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { MonthSelectorClient } from "./MonthSelectorClient";

function formatNaira(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("en-US").format(abs);
  return (amount < 0 ? "-₦" : "₦") + formatted;
}
function formatNairaShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n < 0 ? "-" : "") + "₦" + (abs / 1_000_000).toFixed(1) + "m";
  if (abs >= 1_000) return (n < 0 ? "-" : "") + "₦" + (abs / 1_000).toFixed(0) + "k";
  return formatNaira(n);
}

type DailyTrendPoint = { day: number; revenue: number; profit: number };
type BreakdownSlice = { name: string; value: number; color?: string };
type ProductStat = { name: string; qty: number; revenue: number; profit: number };
type Debtor = { name: string; total_debt: number; phone: string | null };

export function PerformanceDashboard(props: {
  monthLabel: string;
  profitToday: number; revenueToday: number; cogsToday: number; expToday: number;
  profitYest: number; revenueYest: number; cogsYest: number; expYest: number;
  profitDiff: number; isProfitUp: boolean;
  revenueMonth: number; cogsMonth: number; expMonth: number; profitMonth: number;
  dailyTrend: DailyTrendPoint[];
  paymentBreakdown: BreakdownSlice[];
  expenseBreakdown: BreakdownSlice[];
  topSelling: ProductStat[];
  mostProfitable: ProductStat[];
  deadStock: { name: string; stock_quantity: number }[];
  totalUncollectedDebt: number;
  topDebtors: Debtor[];
  bankEntries: [string, number][];
  totalTransfers: number;
  healthScore: number;
  healthBand: string;
  healthColor: string;
  selectedYM: string;
}) {
  const {
    monthLabel, revenueMonth, cogsMonth, expMonth, profitMonth,
    dailyTrend, paymentBreakdown, expenseBreakdown,
    topSelling, mostProfitable, deadStock,
    totalUncollectedDebt, topDebtors, bankEntries, totalTransfers,
    healthScore, healthBand, healthColor, selectedYM,
  } = props;

  const profitMargin = revenueMonth > 0 ? Math.round((profitMonth / revenueMonth) * 100) : 0;
  const EXPENSE_COLORS = ["var(--accent)", "var(--info)", "var(--warning)", "var(--success)", "var(--danger)", "#a78bfa"];

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Page Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-2xl border flex items-center justify-center transition-colors"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)", background: "var(--bg-card)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Business Performance</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Track your true profit and cash flow health</p>
          </div>
        </div>
        <MonthSelectorClient currentMonth={selectedYM} />
      </div>

      {/* ── Hero: Net Profit + Health Score ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--bg-base) 0%, var(--accent-dim) 100%)",
          border: "1px solid var(--accent-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl" style={{ background: "var(--accent)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: "var(--icon-accent-text)" }}>
                <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: "var(--accent)" }} />
                {monthLabel} Net Profit
              </span>
              <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{formatNaira(profitMonth)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--icon-accent-text)" }}>{profitMargin}% profit margin on {formatNaira(revenueMonth)} revenue</p>
            </div>

            {/* Shop Health Score */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-14 h-14 rounded-full flex items-center justify-center border-4" style={{ borderColor: healthColor, background: "var(--bg-card)" }}>
                <span className="text-base font-black" style={{ color: "var(--text-primary)" }}>{healthScore}</span>
              </div>
              <span className="text-[10px] font-bold mt-1" style={{ color: healthColor }}>{healthBand}</span>
            </div>
          </div>

          <div className="h-px my-3.5" style={{ background: "var(--accent-border)" }} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Cost of Goods</p>
              <p className="text-sm font-bold" style={{ color: "var(--icon-danger-text)" }}>-{formatNaira(cogsMonth)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Expenses</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatNaira(expMonth)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Trend Chart ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{monthLabel} Daily Trend</p>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>Revenue vs. profit, day by day</p>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNairaShort(v)} width={44} />
              <Tooltip
                formatter={(value, name) => [formatNaira(Number(value) || 0), name === "revenue" ? "Revenue" : "Profit"]}
                labelFormatter={(d) => `${monthLabel.split(" ")[0]} ${d}`}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border-color)", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="profit" stroke="var(--success)" strokeWidth={2} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} /> Profit
          </span>
        </div>
      </div>

      {/* ── Payment Method + Expense Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Payment Method Donut */}
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Revenue by Payment</p>
          {paymentBreakdown.length === 0 ? (
            <p className="text-xs italic py-8 text-center" style={{ color: "var(--text-muted)" }}>No sales this month.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {paymentBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNaira(Number(v) || 0)} contentStyle={{ borderRadius: 12, border: "1px solid var(--border-color)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {paymentBreakdown.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}
                    </span>
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatNaira(p.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Expense Category Breakdown */}
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Expenses by Category</p>
          {expenseBreakdown.length === 0 ? (
            <p className="text-xs italic py-8 text-center" style={{ color: "var(--text-muted)" }}>No expenses this month.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNaira(Number(v) || 0)} contentStyle={{ borderRadius: 12, border: "1px solid var(--border-color)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                {expenseBreakdown.map((e, i) => (
                  <div key={e.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 truncate" style={{ color: "var(--text-muted)" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                      <span className="truncate">{e.name}</span>
                    </span>
                    <span className="font-bold flex-shrink-0 ml-2" style={{ color: "var(--text-primary)" }}>{formatNaira(e.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Product Performance ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{monthLabel} Product Insights</p>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>Best performing and stagnant stock</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Top Selling */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--icon-warning-text)" }}>Top Selling</p>
            {topSelling.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No sales this month.</p>
            ) : (
              <div className="space-y-2">
                {topSelling.map((p, idx) => {
                  const maxQty = topSelling[0].qty || 1;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                        <span className="font-bold flex-shrink-0 ml-1" style={{ color: "var(--icon-warning-text)" }}>{p.qty}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "var(--icon-neutral-bg)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%`, background: "var(--warning)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most Profitable */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--icon-success-text)" }}>Most Profitable</p>
            {mostProfitable.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No sales this month.</p>
            ) : (
              <div className="space-y-2">
                {mostProfitable.map((p, idx) => {
                  const maxProfit = mostProfitable[0].profit || 1;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                        <span className="font-bold flex-shrink-0 ml-1" style={{ color: "var(--icon-success-text)" }}>{formatNairaShort(p.profit)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "var(--icon-neutral-bg)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(p.profit / maxProfit) * 100}%`, background: "var(--success)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dead Stock */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--icon-danger-text)" }}>Dead Stock</p>
            {deadStock.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>All items sold this month.</p>
            ) : (
              <ul className="space-y-2">
                {deadStock.map((p, idx) => (
                  <li key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 rounded-full font-bold text-[10px]" style={{ background: "var(--icon-danger-bg)", color: "var(--icon-danger-text)" }}>
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
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cash Flow Health</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Total money owed to you by customers, all time</p>
        </div>

        <Link href="/customers">
          <div className="flex items-center justify-between p-4 rounded-2xl transition-opacity hover:opacity-90" style={{ background: "var(--icon-accent-bg)", border: "1px solid var(--accent-border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: "var(--icon-accent-text)" }}>
                  <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--icon-accent-text)" }}>Uncollected Debt</p>
                <p className="text-[10px]" style={{ color: "var(--icon-accent-text)", opacity: 0.7 }}>Tap to view all customers →</p>
              </div>
            </div>
            <p className="text-xl font-black" style={{ color: "var(--icon-accent-text)" }}>{formatNaira(totalUncollectedDebt)}</p>
          </div>
        </Link>

        {topDebtors.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Top Outstanding Debtors</p>
            <div className="space-y-2">
              {topDebtors.map((debtor, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs text-white" style={{ background: "var(--accent)" }}>
                      {debtor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate" style={{ color: "var(--text-primary)" }}>{debtor.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{debtor.phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="font-bold text-xs" style={{ color: "var(--icon-accent-text)" }}>{formatNaira(debtor.total_debt)}</span>
                    {debtor.phone && (
                      <a
                        href={`https://wa.me/${debtor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${debtor.name}, a friendly reminder regarding your outstanding balance of ${formatNaira(debtor.total_debt)}. Please let us know when you will be settling this. Thank you!`)}`}
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
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{monthLabel} Bank Transfers</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Revenue received per bank account via transfer</p>
        </div>

        {bankEntries.length === 0 ? (
          <div className="py-4 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: "var(--icon-neutral-bg)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: "var(--icon-neutral-text)" }}>
                <path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No bank transfers recorded for {monthLabel}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bankEntries.map(([bank, amount]) => {
              const pct = totalTransfers > 0 ? Math.round((amount / totalTransfers) * 100) : 0;
              return (
                <div key={bank} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ background: "var(--accent)" }}>
                        {bank.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{bank}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs" style={{ color: "var(--icon-accent-text)" }}>{formatNaira(amount)}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--icon-neutral-bg)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between items-center pt-3 border-t text-xs font-bold" style={{ borderColor: "var(--border-color)" }}>
              <span style={{ color: "var(--text-primary)" }}>Total Transfers — {monthLabel}</span>
              <span style={{ color: "var(--icon-accent-text)" }}>{formatNaira(totalTransfers)}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
