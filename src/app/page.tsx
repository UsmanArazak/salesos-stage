import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CyclingText } from "./CyclingText";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-dvh flex flex-col font-sans select-none" style={{ background: "#FAFAF9", color: "#1C1917" }}>
      
      {/* ── HEADER/NAV ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FAFAF9]/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="SalesOS Logo"
              width={34}
              height={34}
              className="rounded-lg shadow-sm"
            />
            <span className="font-bold text-xl tracking-tight text-stone-900">
              SalesOS
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#features" className="hover:text-stone-900 transition-colors">Features</a>
            <a href="#integrations" className="hover:text-stone-900 transition-colors">Integrations</a>
            <a href="#pricing" className="hover:text-stone-900 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <Link
                href={session.user.role === "superadmin" ? "/superadmin" : "/dashboard"}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm bg-stone-900"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-block px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-stone-700 transition-all hover:bg-stone-100"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm bg-stone-900"
                >
                  Register <span className="hidden sm:inline">your shop</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <main className="flex-grow">
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center relative">


          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.1] max-w-4xl mx-auto text-balance">
            SalesOS helps <span className="underline decoration-brand decoration-wavy decoration-2 inline-block"><CyclingText /></span> <br className="hidden sm:inline" />
            your business
          </h1>

          {/* Description */}
          <p className="text-base sm:text-xl text-stone-600 font-medium max-w-2xl mx-auto mt-6 leading-relaxed text-balance">
            Track Every Sale. See Every Naira. Run a Better Business.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            {session ? (
              <Link
                href={session.user.role === "superadmin" ? "/superadmin" : "/dashboard"}
                className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white shadow-md bg-stone-900 transition-all hover:opacity-90 active:scale-[0.97]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white shadow-md bg-stone-900 transition-all hover:opacity-90 active:scale-[0.97]"
                >
                  Register your shop
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold bg-white border border-stone-200 text-stone-800 transition-all hover:bg-stone-50 active:scale-[0.97]"
                >
                  Sign in to your shop
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── FEATURES SECTION ────────────────────────────────────────── */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-16 border-t border-stone-200/60">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-dim text-brand border border-[var(--accent-border)]">
              FEATURES
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 text-balance">
              Everything you need to run your shop
            </h2>
            <p className="text-sm text-stone-500 max-w-md mx-auto text-balance">
              Stop guessing your profits and losing money to untracked debt. SalesOS gives you full control.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="space-y-6">
            
            {/* Row 1: Large dashboard card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-100/80 border border-stone-200/60 rounded-3xl p-8 items-center">
              <div className="md:col-span-5 space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-stone-900 text-balance">
                  Real-time Profit Analytics
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed text-balance">
                  Easily track your daily, weekly, and monthly profits. SalesOS automatically calculates your true profit after removing the cost of goods, so you always know how your business is doing.
                </p>
                <Link
                  href="/register"
                  className="inline-block px-5 py-2.5 rounded-full text-xs font-bold text-white bg-stone-900 transition-all hover:opacity-90"
                >
                  Create a Free Account
                </Link>
              </div>

              {/* Chart Mockup Graphic */}
              <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-4 mt-6 md:mt-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-700">Global Tech Gadgets</span>
                  <span className="text-stone-400">Weekly net profit</span>
                </div>
                <div className="h-40 flex items-end gap-2 sm:gap-3 pt-6 border-b border-stone-100 pb-2">
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "45%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦12k</span>
                  </div>
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "30%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦8.5k</span>
                  </div>
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "70%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦18k</span>
                  </div>
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "50%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦14k</span>
                  </div>
                  <div className="bg-brand w-full rounded-t-md shadow-sm relative group" style={{ height: "90%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-brand">₦24k</span>
                  </div>
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "40%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦11k</span>
                  </div>
                  <div className="bg-stone-200 w-full rounded-t-md transition-all hover:bg-brand relative group" style={{ height: "60%" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-500 group-hover:text-brand">₦16k</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            {/* Row 2: Three columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card Left: Offline POS */}
              <div className="bg-stone-100/80 border border-stone-200/60 rounded-3xl p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900">
                    Offline POS & Sales
                  </h3>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                    Record sales even without an internet connection. SalesOS seamlessly syncs your data in the background once you&apos;re back online.
                  </p>
                </div>
                
                {/* Mock UI controls */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-3">
                  {[
                    { label: "Works without Data", active: true },
                    { label: "Fast barcode scanning", active: true },
                    { label: "Auto-sync to cloud", active: true },
                  ].map((ctrl, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-stone-700 font-medium">{ctrl.label}</span>
                      <div
                        className="w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer"
                        style={{ background: ctrl.active ? "#F97316" : "#E7E5E4" }}
                      >
                        <div
                          className="w-3 h-3 bg-white rounded-full shadow-sm transition-transform"
                          style={{ transform: ctrl.active ? "translateX(16px)" : "translateX(0)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Right: Debtor list */}
              <div className="bg-stone-100/80 border border-stone-200/60 rounded-3xl p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900">
                    Debt & Customer Management
                  </h3>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                    Keep track of customers who owe you money. Log partial payments and see outstanding balances instantly.
                  </p>
                </div>

                {/* Mock list */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3">
                  {[
                    { name: "Alhaji Ibrahim", amount: "₦25,000", status: "Overdue (23 days ago)" },
                    { name: "Chioma Obi", amount: "₦8,500", status: "Part payment logged" },
                  ].map((debtor, i) => (
                    <div key={i} className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-semibold text-stone-850">{debtor.name}</p>
                        <span className="text-[10px] text-stone-400">{debtor.status}</span>
                      </div>
                      <span className="font-bold text-brand">{debtor.amount}</span>
                    </div>
                  ))}
                </div>
              </div>


              <div className="bg-stone-100/80 border border-stone-200/60 rounded-3xl p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900">
                    Smart Inventory
                  </h3>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                    Get alerted before you run out of stock. Track variations, cost prices, and expected profits.
                  </p>
                </div>

                {/* Mock list */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3">
                  {[
                    { name: "Peak Milk (Tin)", qty: "4 left", status: "Low Stock", statusColor: "text-red-500" },
                    { name: "Milo Refill", qty: "32 left", status: "In Stock", statusColor: "text-green-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-semibold text-stone-850">{item.name}</p>
                        <span className={`text-[10px] ${item.statusColor}`}>{item.status}</span>
                      </div>
                      <span className="font-bold text-stone-600">{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex justify-center mt-12">
              <Link
                href="/register"
                className="px-8 py-3 rounded-full text-sm font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors shadow-sm"
              >
                Explore more features &rarr;
              </Link>
            </div>
          </div>
        </section>


        {/* ── PRE-FOOTER CTA ──────────────────────────────────────────── */}
        <section id="pricing" className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 text-balance">
            Take control of your shop today
          </h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto text-balance">
            Get started for free today. Stop losing money to untracked stock and unpaid debt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-white bg-stone-900 transition-all hover:opacity-90 text-center"
            >
              Create a Free Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-semibold bg-white border border-stone-200 text-stone-850 hover:bg-stone-50 transition-all text-center"
            >
              Sign in to your shop
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-10">
            <a href="https://wa.me/2348085764331" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-700 flex items-center gap-2 transition-colors text-sm font-medium">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              WhatsApp
            </a>
            <a href="https://web.facebook.com/profile.php?id=61591237097787" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-700 flex items-center gap-2 transition-colors text-sm font-medium">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-700 flex items-center gap-2 transition-colors text-sm font-medium">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
          </div>
        </section>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200/80 bg-stone-900 text-stone-300">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="SalesOS Logo"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="font-bold text-white">SalesOS</span>
            </div>
            <p className="text-xs text-stone-400">
              Smart operations client built to optimize sales, stock, and credit accounting for retail shops.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><Link href="/waitlist" className="hover:text-white transition-colors">Waitlist</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Inquiries</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>info@salesos.com</li>
              <li>+234 808 576 4331</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-stone-850 py-6 max-w-6xl mx-auto px-6 flex items-center justify-center text-xs text-stone-500" style={{ borderColor: "#2E2A27" }}>
          <span>&copy; 2026 SalesOS App. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
