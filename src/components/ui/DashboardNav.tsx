"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.25 3v10.5a.75.75 0 00.75.75h10.5a.75.75 0 01.75.75 9 9 0 11-12.75-12.75.75.75 0 01.75.75z" />
        <path d="M13.5 3v9.75a.75.75 0 00.75.75h9.75a9 9 0 00-10.5-10.5z" />
      </svg>
    ),
  },
  {
    href: "/sales",
    label: "Sales",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" />
      </svg>
    ),
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
        <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/customers",
    label: "Debt",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 00-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Performance",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18 4h-2v16h2V4zM12 9h-2v11h2V9zM6 14H4v6h2v-6z" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "Shop Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.25l-9 7.5v12h6v-7.5h6v7.5h6v-12l-9-7.5z" />
      </svg>
    ),
  },
];

// Mobile nav bar shows first 5 items: Dashboard, Sales, Inventory, Debt, Expenses
// Performance is relocated to the Mobile Menu (/menu)
const mobileNavItems = navItems.slice(0, 5);

export function DashboardNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col z-30"
        style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-color)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <Image src="/logo.png" alt="SalesOS Logo" width={32} height={32} className="rounded-xl flex-shrink-0" />
          <p className="font-bold text-sm leading-tight truncate" style={{ color: "var(--text-primary)" }}>
            SalesOS
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all"
                style={{
                  color: active ? "#ffffff" : "var(--text-muted)",
                  background: active ? "var(--accent)" : "transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {/* Icon circle */}
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: active ? "rgba(255,255,255,0.2)" : "transparent",
                    color: active ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button
            id="signout-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all hover:bg-stone-50"
            style={{ color: "var(--text-muted)" }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP HEADER ──────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="SalesOS Logo" width={28} height={28} className="rounded-xl" />
          <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>SalesOS</span>
        </div>
        <Link
          href="/menu"
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors bg-white hover:bg-gray-50 shrink-0"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </Link>
      </header>

      {/* ── MOBILE BOTTOM NAV — floating pill bar ──────── */}
      <nav
        className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-stretch rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors relative"
              style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
            >
              {/* Active pill bg */}
              {active && (
                <span
                  className="absolute inset-x-1.5 inset-y-1 rounded-xl"
                  style={{ background: "var(--accent-dim)" }}
                />
              )}
              <span className="relative z-10">
                {item.icon}
              </span>
              <span className="relative z-10 text-[9px] font-semibold tracking-tight leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
