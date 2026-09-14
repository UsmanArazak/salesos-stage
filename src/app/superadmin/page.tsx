import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("en-US").format(abs);
  return (amount < 0 ? "-₦" : "₦") + formatted;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Stat Card — matches dashboard/page.tsx StatCard exactly ─────────────────

function StatCard({
  label,
  value,
  description,
  icon,
  warning = false,
}: {
  label: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4 h-full bg-white transition-all"
      style={{ borderColor: warning ? "var(--warning-border)" : "var(--border-color)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{
          background: warning ? "var(--warning-dim)" : "var(--bg-elevated)",
          color: warning ? "var(--warning)" : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-lg font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {description && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const isPro = plan === "pro";
  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg"
      style={{
        background: isPro ? "var(--accent-dim)" : "var(--bg-elevated)",
        color: isPro ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {isPro ? "Pro" : "Free"}
    </span>
  );
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getPlatformStats() {
  const supabase = createServiceRoleSupabaseClient();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;

  const [
    { count: totalShops },
    { count: totalUsers },
    { count: freeShops },
    { count: proShops },
    { count: newShopsMonth },
    { count: totalSalesCount },
    { data: allSalesRevenue },
    { data: shopsRaw },
    { data: usersRaw },
  ] = await Promise.all([
    supabase.from("shops").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("shops").select("*", { count: "exact", head: true }).eq("plan", "free"),
    supabase.from("shops").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    supabase.from("shops").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("sales").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("total_amount"),
    supabase.from("shops").select("id, name, plan, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("users").select("id, shop_id, email").eq("role", "owner"),
  ]);

  const totalRevenue = (allSalesRevenue ?? []).reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

  const recentShops = (shopsRaw ?? []).map((shop) => ({
    ...shop,
    ownerEmail: (usersRaw ?? []).find((u) => u.shop_id === shop.id)?.email ?? "—",
  }));

  return {
    totalShops: totalShops ?? 0,
    totalUsers: totalUsers ?? 0,
    freeShops: freeShops ?? 0,
    proShops: proShops ?? 0,
    newShopsMonth: newShopsMonth ?? 0,
    totalSalesCount: totalSalesCount ?? 0,
    totalRevenue,
    recentShops,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") redirect("/login");

  const stats = await getPlatformStats();

  return (
    <div>
      {/* Header — mirrors dashboard/page.tsx header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Platform Overview
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {todayLabel()}
        </p>
      </div>

      {/* ── Featured Hero Card — Total Revenue ─── */}
      <div
        className="rounded-2xl border p-5 mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(255,83,71,0.07) 0%, rgba(255,83,71,0.02) 100%)",
          borderColor: "var(--accent-border)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent)" }}
            >
              Total Revenue Processed
            </p>
            <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
              {formatNaira(stats.totalRevenue)}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Cumulative sum of all sales across all shops
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,83,71,0.1)", color: "var(--accent)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
        </div>

        <div
          className="flex gap-4 mt-4 pt-4 border-t text-xs"
          style={{ borderColor: "rgba(255,83,71,0.15)" }}
        >
          <div>
            <span style={{ color: "var(--text-muted)" }}>Total Sales</span>
            <span className="ml-1.5 font-semibold" style={{ color: "var(--text-primary)" }}>
              {stats.totalSalesCount.toLocaleString()} transactions
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>New This Month</span>
            <span className="ml-1.5 font-semibold" style={{ color: "var(--text-primary)" }}>
              {stats.newShopsMonth} shop{stats.newShopsMonth !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── 5 Stat Cards — matches dashboard grid ─── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard
          label="Total Shops"
          value={stats.totalShops.toLocaleString()}
          description="All registered shops"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />

        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          description="All owner accounts"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />

        <StatCard
          label="Free Plan Shops"
          value={stats.freeShops.toLocaleString()}
          description="On the free tier"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />

        <StatCard
          label="Pro Plan Shops"
          value={stats.proShops.toLocaleString()}
          description="Paying customers"
          warning={stats.proShops === 0}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
      </div>

      {/* ── Recent Shops Table ─── */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Recently Registered Shops
        </p>

        <div
          className="rounded-2xl border overflow-hidden bg-white"
          style={{ borderColor: "var(--border-color)" }}
        >
          {stats.recentShops.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No shops registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-xs font-semibold uppercase tracking-wider"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th className="text-left px-5 py-3">Shop Name</th>
                    <th className="text-left px-5 py-3">Owner Email</th>
                    <th className="text-left px-5 py-3">Plan</th>
                    <th className="text-left px-5 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentShops.map((shop, i) => (
                    <tr
                      key={shop.id}
                      className="border-b last:border-0"
                      style={{
                        borderColor: "var(--border-color)",
                        background: i % 2 === 1 ? "var(--bg-elevated)" : "transparent",
                      }}
                    >
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                        {shop.name}
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                        {shop.ownerEmail}
                      </td>
                      <td className="px-5 py-3.5">
                        <PlanBadge plan={shop.plan} />
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>
                        {formatDate(shop.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
