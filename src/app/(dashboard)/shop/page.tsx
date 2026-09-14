import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { ShopClientPage } from "./ShopClientPage";

async function getShopDetails(shopId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data } = await supabase
      .from("shops")
      .select("id, name, plan, address, phone, whatsapp_number, bank_accounts, created_at")
      .eq("id", shopId)
      .single();
    return data;
  } catch {
    return null;
  }
}

async function getOwnerEmail(shopId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data } = await supabase
      .from("users")
      .select("email")
      .eq("shop_id", shopId)
      .eq("role", "owner")
      .maybeSingle();
    return data?.email;
  } catch {
    return null;
  }
}

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shop = await getShopDetails(session.user.shopId);
  const ownerEmail = await getOwnerEmail(session.user.shopId);

  if (!shop) {
    return (
      <div className="py-10 text-center space-y-2">
        <p className="text-sm text-stone-500">Shop not found.</p>
        <Link href="/dashboard" className="text-xs font-semibold text-brand underline">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors bg-white hover:bg-gray-50"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Shop Profile
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your shop details and settings
          </p>
        </div>
      </div>

      <ShopClientPage shop={shop} ownerEmail={ownerEmail ?? session.user.email ?? ""} />
    </div>
  );
}
