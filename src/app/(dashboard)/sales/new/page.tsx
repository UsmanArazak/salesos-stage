import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import { POSClient } from "./POSClient";
import Link from "next/link";

export default async function NewSalePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceRoleSupabaseClient();

  // Fetch products, customers, shop bank accounts, and sales count in parallel
  const [
    { data: products },
    { data: customers },
    { data: shop },
    { count: salesCount }
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, selling_price, stock_quantity")
      .eq("shop_id", session.user.shopId)
      .eq("archived", false)
      .gt("stock_quantity", 0) // Only sellable items
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("shop_id", session.user.shopId)
      .order("name"),
    supabase
      .from("shops")
      .select("bank_accounts")
      .eq("id", session.user.shopId)
      .single(),
    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", session.user.shopId)
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/sales"
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors bg-white"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Record Sale
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Add items to cart and checkout
          </p>
        </div>
      </div>

      <POSClient 
        products={products ?? []} 
        customers={customers ?? []} 
        bankAccounts={shop?.bank_accounts ?? []}
        hasSales={(salesCount ?? 0) > 0}
      />
    </div>
  );
}
