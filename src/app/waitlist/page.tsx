import Image from "next/image";
import { WaitlistForm } from "./WaitlistForm";
import { CyclingText } from "../CyclingText";

const FACEBOOK_URL = "#"; // TODO: Replace with your Facebook page URL
const INSTAGRAM_URL = "#"; // TODO: Replace with your Instagram page URL

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col font-sans select-none" style={{ background: "#FAFAF9", color: "#1C1917" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FAFAF9]/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="SalesOS Logo" width={32} height={32} className="rounded-xl shadow-sm" />
            <span className="font-extrabold text-xl tracking-tight text-stone-900">SalesOS</span>
          </div>
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border uppercase tracking-wide"
            style={{ background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.25)", color: "#EA580C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Early Access
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <main className="flex-grow">
        <section className="relative overflow-hidden">

          {/* Radial glow background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249,115,22,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-16 text-center space-y-8">

            {/* Top pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-dim text-[var(--icon-accent-text)] border border-[var(--accent-border)]/80">
              🇳🇬 Built for Nigerian Small Business Owners
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
              The smarter way to{" "}
              <span className="relative inline-block">
                <span className="relative z-10">
                  <CyclingText />
                </span>
                <span
                  className="absolute bottom-1 left-0 right-0 h-3 rounded-lg -z-0"
                  style={{ background: "rgba(249,115,22,0.15)" }}
                />
              </span>
              <br />
              your business
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-stone-500 max-w-lg mx-auto leading-relaxed">
              Record sales without internet, track your stock, manage customer credit, and see your daily profit, all from your phone. No notebook, no stress. Run your business smarter.
            </p>

          </div>
        </section>

        {/* Waitlist Form Section */}
        <section className="max-w-lg mx-auto px-6 pb-24">

          {/* ── URGENCY / SCARCITY MESSAGE ───────────────────────── */}
          <div className="mb-5 text-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-dim text-[var(--icon-accent-text)] border border-[var(--accent-border)]">
              ⚡ Limited Slots Available for Free Beta
            </span>
          </div>

          <div
            className="rounded-3xl border p-8 shadow-xl"
            style={{
              background: "#fff",
              borderColor: "#E7E5E4",
              boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Form header */}
            <div className="text-center mb-8 space-y-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}
              >
                <Image src="/logo.png" alt="SalesOS" width={32} height={32} className="rounded-lg" />
              </div>
              <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Join the Waitlist</h2>
              <p className="text-sm text-stone-500 max-w-xs mx-auto">
                Be first in line. Early members get <span className="font-semibold text-brand">exclusive premium perks</span> when we launch.
              </p>
            </div>

            <WaitlistForm />
          </div>
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-stone-200/60 bg-stone-900 text-stone-400 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-xs">

          {/* Branding */}
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="SalesOS" width={20} height={20} className="rounded-lg opacity-70" />
            <span className="font-bold text-white">SalesOS</span>
            <span className="text-stone-600">© 2026. All rights reserved.</span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SalesOS on Facebook"
              className="flex items-center gap-1.5 text-stone-400 hover:text-white transition-colors"
            >
              {/* Facebook icon */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
              <span className="text-[11px] font-medium">Facebook</span>
            </a>
            <span className="w-px h-4 bg-stone-700" />
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SalesOS on Instagram"
              className="flex items-center gap-1.5 text-stone-400 hover:text-white transition-colors"
            >
              {/* Instagram icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <span className="text-[11px] font-medium">Instagram</span>
            </a>
          </div>

          <span className="text-stone-500">Built with ❤️ for Nigerian business owners</span>
        </div>
      </footer>

    </div>
  );
}
