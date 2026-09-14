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
  const [saveMsg, setSaveMsg] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  // Add bank account to local state list
  function handleAddBank() {
    const trimmed = newBankName.trim();
    if (!trimmed) return;
    if (bankAccounts.includes(trimmed)) {
      setSaveMsg("❌ That bank account is already added.");
      return;
    }
    setBankAccounts([...bankAccounts, trimmed]);
    setNewBankName("");
    setSaveMsg("");
  }

  // Remove bank account from local state list
  function handleRemoveBank(bankToRemove: string) {
    setBankAccounts(bankAccounts.filter((b) => b !== bankToRemove));
  }

  // Unified save action
  async function handleSaveProfile() {
    if (!name.trim()) {
      setSaveMsg("❌ Shop name is required.");
      return;
    }
    
    setSaving(true);
    setSaveMsg("");
    
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
      setSaveMsg("❌ " + result.error);
    } else {
      setSaveMsg("✅ Shop profile saved successfully!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  const borderFor = (field: string) =>
    focused === field ? "var(--accent)" : "var(--border-color)";

  return (
    <div className="space-y-6">
      
      {/* Save Message (Fixed Banner if active) */}
      {saveMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm border font-semibold text-center"
          style={{
            background: saveMsg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "var(--danger-dim)",
            borderColor: saveMsg.startsWith("✅") ? "rgba(34,197,94,0.25)" : "var(--danger)",
            color: saveMsg.startsWith("✅") ? "#16a34a" : "#dc2626",
          }}
        >
          {saveMsg}
        </div>
      )}

      {/* Shop Information Form */}
      <div
        className="rounded-2xl border p-5 bg-white space-y-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h2 className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--text-dim)" }}>
          Edit Shop Information
        </h2>
        
        <div className="space-y-4">
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Shop Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-elevated)",
                borderColor: borderFor("name"),
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Owner Email (Read only) */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Owner Email (Cannot be changed)
            </label>
            <input
              type="email"
              value={ownerEmail}
              disabled
              className="w-full rounded-xl border px-3 py-2 text-sm opacity-60 cursor-not-allowed"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-color)",
                color: "var(--text-muted)",
              }}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. 08012345678"
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-elevated)",
                borderColor: borderFor("phone"),
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Shop Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => setFocused("address")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. Suite 4, Plaza Complex, Abuja"
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-elevated)",
                borderColor: borderFor("address"),
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Current Plan status (Read only) */}
          <div className="flex justify-between items-center py-2 border-t text-sm" style={{ borderColor: "var(--border-color)" }}>
            <span style={{ color: "var(--text-muted)" }}>Current Subscription Plan</span>
            <span
              className="inline-block text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-lg"
              style={{
                background: isPro ? "var(--accent-dim)" : "var(--bg-elevated)",
                color: isPro ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {isPro ? "Pro Plan" : "Free Plan"}
            </span>
          </div>

        </div>
      </div>

      {/* Bank Accounts Manager Card */}
      <div
        className="rounded-2xl border p-5 bg-white space-y-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div>
          <h2 className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: "var(--text-dim)" }}>
            Bank Accounts
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Add the names of bank accounts you receive customer transfers into (e.g. &quot;GTBank&quot;, &quot;Access Bank&quot;).
          </p>
        </div>

        {/* Existing Banks List */}
        <div className="space-y-2">
          {bankAccounts.length === 0 ? (
            <p className="text-xs italic py-1" style={{ color: "var(--text-muted)" }}>
              No bank accounts registered yet. Add one below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bankAccounts.map((bank, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-stone-50 text-stone-800"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  🏦 {bank}
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(bank)}
                    className="text-stone-400 hover:text-red-600 transition-colors text-sm leading-none ml-0.5"
                    title="Remove"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Bank Field */}
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
          <input
            type="text"
            value={newBankName}
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="e.g. GTBank"
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={handleAddBank}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          >
            + Add Bank
          </button>
        </div>
      </div>

      {/* Save Button (Unified) */}
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
        style={{ background: "var(--accent)" }}
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Saving Profile Changes...
          </>
        ) : (
          "Save Shop Profile"
        )}
      </button>

      {/* Support & Actions Card */}
      <div
        className="rounded-2xl border p-5 bg-white space-y-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h2 className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: "var(--text-dim)" }}>
          Contact & Actions
        </h2>

        {/* WhatsApp Support Link (Relocated from landing page) */}
        <a
          href="https://wa.me/2348085764331"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] bg-green-50 hover:bg-green-100 text-sm font-semibold border-green-200 text-green-700"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">💬</span>
            <span>Chat with SalesOS Support</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-green-500">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>

    </div>
  );
}
