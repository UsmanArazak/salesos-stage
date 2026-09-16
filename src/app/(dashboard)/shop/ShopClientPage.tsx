"use client";

import { useState } from "react";
import { updateShopProfile } from "@/app/actions/shop";

type Shop = {
  id: string;
  name: string;
  plan: string;
  address?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  bank_accounts?: string[] | null;
  created_at: string;
};

export function ShopClientPage({ shop, ownerEmail }: { shop: Shop; ownerEmail: string }) {
  const isPro = shop.plan === "pro";

  // Editable states
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [bankAccounts, setBankAccounts] = useState<string[]>(shop.bank_accounts ?? []);

  // Bank Account Input
  const [newBankName, setNewBankName] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const memberSince = new Date(shop.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" });

  function handleAddBank() {
    const trimmed = newBankName.trim();
    if (!trimmed) return;
    if (bankAccounts.includes(trimmed)) {
      setSaveMsg({ type: "error", text: "That bank account is already added." });
      return;
    }
    setBankAccounts([...bankAccounts, trimmed]);
    setNewBankName("");
    setSaveMsg(null);
  }

  function handleRemoveBank(bankToRemove: string) {
    setBankAccounts(bankAccounts.filter((b) => b !== bankToRemove));
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      setSaveMsg({ type: "error", text: "Shop name is required." });
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    const currentBanks = [...bankAccounts];
    const pendingBank = newBankName.trim();
    if (pendingBank && !currentBanks.includes(pendingBank)) {
      currentBanks.push(pendingBank);
      setBankAccounts(currentBanks);
      setNewBankName("");
    }

    const result = await updateShopProfile(shop.id, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      bankAccounts: currentBanks,
    });

    setSaving(false);
    if ("error" in result) {
      setSaveMsg({ type: "error", text: result.error });
    } else {
      setSaveMsg({ type: "success", text: "Shop profile saved successfully!" });
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  const borderFor = (field: string) => (focused === field ? "var(--accent)" : "var(--border-color)");

  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none transition-colors";
  const inputStyle = (field: string) => ({
    background: "var(--bg-card)",
    borderColor: borderFor(field),
    color: "var(--text-primary)",
  });

  return (
    <div className="space-y-4">

      {/* ── Shop Identity Hero ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--bg-base) 0%, var(--accent-dim) 100%)",
          border: "1px solid var(--accent-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl" style={{ background: "var(--accent)" }} />
        <div className="relative z-10 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-black text-white shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            {(name || shop.name).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black truncate" style={{ color: "var(--text-primary)" }}>{name || shop.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--icon-accent-text)" }}>Member since {memberSince}</p>
            <span
              className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: isPro ? "var(--accent)" : "var(--icon-neutral-bg)", color: isPro ? "#ffffff" : "var(--text-muted)" }}
            >
              {isPro && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.5.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              )}
              {isPro ? "Pro Plan" : "Free Plan"}
            </span>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMsg && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-2.5"
          style={{
            background: saveMsg.type === "success" ? "var(--success-dim)" : "var(--icon-danger-bg)",
            border: `1px solid ${saveMsg.type === "success" ? "var(--success-border)" : "var(--danger-border)"}`,
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: saveMsg.type === "success" ? "var(--success)" : "var(--danger)", color: "#fff" }}
          >
            {saveMsg.type === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </span>
          <p className="text-sm font-semibold" style={{ color: saveMsg.type === "success" ? "var(--icon-success-text)" : "var(--icon-danger-text)" }}>
            {saveMsg.text}
          </p>
        </div>
      )}

      {/* ── Business Information ── */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Business Information</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Shop Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              className={inputClass}
              style={inputStyle("name")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. 08012345678"
              className={inputClass}
              style={inputStyle("phone")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Shop Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => setFocused("address")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. Suite 4, Plaza Complex, Abuja"
              className={inputClass}
              style={inputStyle("address")}
            />
          </div>
        </div>
      </div>

      {/* ── Account ── */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Account</p>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--icon-neutral-bg)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0" style={{ color: "var(--icon-neutral-text)" }}>
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Owner Email</p>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{ownerEmail}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>Locked</span>
        </div>
      </div>

      {/* ── Bank Accounts ── */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Bank Accounts</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            Add the banks you receive customer transfers into (e.g. &quot;GTBank&quot;, &quot;Access Bank&quot;).
          </p>
        </div>

        <div className="space-y-2">
          {bankAccounts.length === 0 ? (
            <p className="text-xs italic py-1" style={{ color: "var(--text-muted)" }}>No bank accounts registered yet. Add one below.</p>
          ) : (
            bankAccounts.map((bank, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl"
                style={{ background: "var(--icon-neutral-bg)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {bank.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{bank}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Receives customer transfers</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBank(bank)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: "var(--icon-neutral-text)" }}
                  title="Remove"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
          <input
            type="text"
            value={newBankName}
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="e.g. GTBank"
            className={inputClass + " flex-1"}
            style={inputStyle("newBank")}
            onFocus={() => setFocused("newBank")}
            onBlur={() => setFocused(null)}
          />
          <button
            type="button"
            onClick={handleAddBank}
            className="px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex-shrink-0"
            style={{ background: "var(--icon-neutral-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
        style={{ background: "var(--accent)" }}
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Saving...
          </>
        ) : (
          "Save Shop Profile"
        )}
      </button>

      {/* ── Support ── */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Support</p>
        <a
          href="https://wa.me/2348085764331"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-[0.98]"
          style={{ background: "var(--success-dim)", border: "1px solid var(--success-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#25D366" }}>
              <svg viewBox="0 0 24 24" fill="#ffffff" className="w-4 h-4">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--icon-success-text)" }}>Chat with SalesOS Support</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: "var(--icon-success-text)" }}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </a>
      </div>

    </div>
  );
}
