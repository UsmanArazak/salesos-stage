import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import { SalesList } from "./SalesList";

export default async function SalesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceRoleSupabaseClient();
  const { data: sales } = await supabase
    .from("sales")
    .select(`
      id,
      total_amount,
      payment_method,
      created_at,
      notes,
      bank_name,
      sale_items (
        quantity,
        unit_price,
        products ( name )
      ),
      credit_sales (
        customers ( name )
      )
    `)
    .eq("shop_id", session.user.shopId)
    .order("created_at", { ascending: false });

  // Add type assertion since Supabase returns nested joins weirdly.
  // The client component already defines the proper type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SalesList sales={(sales as any) ?? []} />;
}
