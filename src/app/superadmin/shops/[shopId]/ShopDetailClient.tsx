"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeShopPlan, deleteShop } from "@/app/actions/admin";

type Shop = {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  address?: string | null;
  phone?: string | null;
};

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

export function ShopDetailClient({
  shop,
  ownerEmail,
}: {
  shop: Shop;
  ownerEmail: string;
}) {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState(shop.plan);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handlePlanChange(newPlan: "free" | "pro") {
    if (newPlan === currentPlan) return;
    setLoading(true);
    setFeedback("");
    const result = await changeShopPlan(shop.id, newPlan);
    setLoading(false);
    if ("error" in result) {
      setFeedback(result.error);
    } else {
      setCurrentPlan(newPlan);
      setFeedback(`Plan changed to ${newPlan} successfully.`);
    }
  }

  async function handleDeleteShop() {
    const confirmation1 = confirm(`WARNING: Are you sure you want to delete "${shop.name}"?\n\nThis will permanently delete the shop, its owner account, all products, all recorded sales, expenses, and customer credit data. THIS CANNOT BE UNDONE.`);
    if (!confirmation1) return;

    const confirmation2 = confirm(`FINAL WARNING: Please confirm once more that you want to delete "${shop.name}" and completely clear all of its database records.`);
    if (!confirmation2) return;

    setDeleting(true);
    setFeedback("");
    const result = await deleteShop(shop.id);
    setDeleting(false);

    if ("error" in result) {
      setFeedback(result.error);
    } else {
      router.push("/superadmin/shops");
      router.refresh();
    }
  }

  return (
    <div
      className="rounded-2xl border p-5 bg-white space-y-5"
      style={{ borderColor: "var(--border-color)" }}
    >
      {/* Shop Info */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Shop Information
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span style={{ color: "var(--text-muted)" }}>Shop Name</span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {shop.name}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: "var(--text-muted)" }}>Owner Email</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {ownerEmail}
            </span>
          </div>
          {shop.address && (
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-muted)" }}>Address</span>
              <span style={{ color: "var(--text-primary)" }}>{shop.address}</span>
            </div>
          )}
          {shop.phone && (
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text-muted)" }}>Phone</span>
              <span style={{ color: "var(--text-primary)" }}>{shop.phone}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span style={{ color: "var(--text-muted)" }}>Current Plan</span>
            <PlanBadge plan={currentPlan} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border-color)" }} />

      {/* Plan Change */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Change Plan
        </p>
        <div className="flex gap-3">
          {(["free", "pro"] as const).map((plan) => (
            <button
              key={plan}
              onClick={() => handlePlanChange(plan)}
              disabled={loading || deleting || currentPlan === plan}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.97] disabled:opacity-50 capitalize"
              style={{
                background: currentPlan === plan ? "var(--accent-dim)" : "var(--bg-elevated)",
                borderColor: currentPlan === plan ? "var(--accent-border)" : "var(--border-color)",
                color: currentPlan === plan ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              {loading && currentPlan !== plan ? "Saving..." : plan}
              {currentPlan === plan && " ✓"}
            </button>
          ))}
        </div>

        {feedback && (
          <p
            className="text-xs mt-2 font-medium"
            style={{
              color: feedback.includes("success") ? "var(--success)" : "var(--danger)",
            }}
          >
            {feedback}
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div style={{ borderTop: "1px solid var(--border-color)" }} />
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 text-red-600"
        >
          Danger Zone
        </p>
        <button
          onClick={handleDeleteShop}
          disabled={loading || deleting}
          className="w-full py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {deleting ? "Deleting Shop & Data..." : "Delete Shop & All Data"}
        </button>
      </div>
    </div>
  );
}
