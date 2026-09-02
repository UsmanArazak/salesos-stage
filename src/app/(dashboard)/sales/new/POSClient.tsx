"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordSale } from "@/app/actions/sales";
import { db } from "@/lib/offline-db";
import { useLiveQuery } from "dexie-react-hooks";
import { DismissableHelpBanner } from "@/components/ui/DismissableHelpBanner";

export type ProductMini = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

export type CustomerMini = {
  id: string;
  name: string;
};

type Props = {
  products: ProductMini[];
  customers: CustomerMini[];
  bankAccounts: string[];
  hasSales?: boolean;
};

type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function POSClient({ products, customers, bankAccounts, hasSales = false }: Props) {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "credit">("cash");
  const [selectedBank, setSelectedBank] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Credit customer state
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // Offline support state
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const queuedSalesCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;

  // Cache data locally on load
  useEffect(() => {
    if (products.length > 0) db.products.bulkPut(products);
    if (customers.length > 0) db.customers.bulkPut(customers);
  }, [products, customers]);

  const cachedProducts = useLiveQuery(() => db.products.toArray(), []) || products;
  const cachedCustomers = useLiveQuery(() => db.customers.toArray(), []) || customers;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncOfflineSales() {
    if (syncing) return;
    setSyncing(true);
    try {
      const offlineSales = await db.syncQueue.toArray();
      if (offlineSales.length === 0) return;

      for (const sale of offlineSales) {
        const result = await recordSale({
          items: sale.cart.map((c: CartItem) => ({
            productId: c.productId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
          })),
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
          amountPaid: sale.amountPaid,
          bankName: sale.bankName,
          customerId: sale.customerData.id,
          newCustomerName: sale.customerData.name,
          newCustomerPhone: sale.customerData.phone,
        });

        if (!("error" in result)) {
          await db.syncQueue.delete(sale.id!);
        } else {
          console.error("Failed to sync offline sale:", result.error);
        }
      }
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  // Filtered dropdown suggestions
  const filteredProducts = cachedProducts.filter(
    (p) =>
      p.stock_quantity > 0 &&
      p.name.toLowerCase().includes(productQuery.toLowerCase()) &&
      !cart.some((c) => c.productId === p.id)
  ).slice(0, 6);

  // Quick horizontal scroll list (all available in-stock items matching query)
  const quickSelectProducts = cachedProducts.filter(
    (p) =>
      p.stock_quantity > 0 &&
      (!productQuery || p.name.toLowerCase().includes(productQuery.toLowerCase()))
  );

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function getCartItemQuantity(productId: string) {
    return cart.find((c) => c.productId === productId)?.quantity ?? 0;
  }

  function addToCart(p: ProductMini) {
    setCart((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        unitPrice: p.selling_price,
        quantity: 1,
        maxStock: p.stock_quantity,
      },
    ]);
    setProductQuery("");
  }

  function handleChipTap(p: ProductMini) {
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      if (existing.quantity < p.stock_quantity) {
        updateQuantity(p.id, 1);
      }
    } else {
      addToCart(p);
    }
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId === id) {
          const newQ = c.quantity + delta;
          if (newQ > 0 && newQ <= c.maxStock) {
            return { ...c, quantity: newQ };
          }
        }
        return c;
      })
    );
  }

  function updatePrice(id: string, newPrice: string) {
    const val = parseFloat(newPrice);
    if (isNaN(val) || val < 0) return;
    setCart((prev) =>
      prev.map((c) => (c.productId === id ? { ...c, unitPrice: val } : c))
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.productId !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (cart.length === 0) return setError("Please add at least one product to the cart.");
    if (paymentMethod === "transfer" && bankAccounts.length > 0 && !selectedBank) {
      return setError("Please select which bank account received this transfer.");
    }
    if (paymentMethod === "credit") {
      if (customerMode === "existing" && !selectedCustomerId) {
        return setError("Please select a customer for this credit sale.");
      }
      if (customerMode === "new" && !newCustomerName.trim()) {
        return setError("Please enter a new customer name.");
      }
    }

    setLoading(true);

    if (!isOnline) {
      await db.syncQueue.add({
        cart,
        paymentMethod,
        notes,
        amountPaid: parseFloat(amountPaid) || undefined,
        bankName: paymentMethod === "transfer" ? selectedBank : undefined,
        customerData: {
          mode: customerMode,
          id: customerMode === "existing" ? selectedCustomerId : undefined,
          name: customerMode === "new" ? newCustomerName : undefined,
          phone: customerMode === "new" ? newCustomerPhone : undefined,
        },
        timestamp: Date.now(),
      });
      setLoading(false);
      setCart([]);
      setProductQuery("");
      setNotes("");
      setError("Success: Saved offline. Will sync automatically when internet is restored.");
      return;
    }

    const payload = {
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      paymentMethod,
      notes,
      amountPaid: parseFloat(amountPaid) || undefined,
      bankName: paymentMethod === "transfer" ? selectedBank : undefined,
      customerId: customerMode === "existing" ? selectedCustomerId : undefined,
      newCustomerName: customerMode === "new" ? newCustomerName : undefined,
      newCustomerPhone: customerMode === "new" ? newCustomerPhone : undefined,
    };

    try {
      const result = await recordSale(payload);
      setLoading(false);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setCart([]);
      setNotes("");
      setAmountPaid("");
      setSelectedBank("");
      router.refresh();
      router.push("/sales");
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to record sale. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {!hasSales && (
        <DismissableHelpBanner
          storageKey="new-sale"
          message="Record a sale: pick products, choose how they paid (cash, transfer, or credit), and track your profit instantly."
        />
      )}

      {/* Offline Status Bar */}
      {(!isOnline || queuedSalesCount > 0) && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-sm ${
            !isOnline ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-blue-50 border-blue-200 text-blue-900"
          } border shadow-xs`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse bg-amber-500"></span>
            <span className="font-semibold text-xs">
              {!isOnline ? "Offline Mode." : "Back Online."}{" "}
              {queuedSalesCount > 0 && `${queuedSalesCount} sale(s) pending sync.`}
            </span>
          </div>
          {isOnline && queuedSalesCount > 0 && (
            <button
              onClick={syncOfflineSales}
              disabled={syncing}
              className="px-3 py-1 bg-white rounded-xl shadow-xs text-xs font-bold transition-all disabled:opacity-50"
              style={{ color: "var(--accent)" }}
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </div>
      )}

      {/* ── 1. Search & Quick Product Selector ── */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search product to add..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="w-full rounded-2xl pl-10 pr-9 py-3 text-xs font-medium transition-all focus:outline-none"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
          {productQuery && (
            <button
              type="button"
              onClick={() => setProductQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 text-sm"
            >
              &times;
            </button>
          )}

          {/* Search Dropdown overlay */}
          {productQuery && filteredProducts.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl shadow-xl z-20 overflow-hidden border"
              style={{ background: "#ffffff", borderColor: "var(--border-color)" }}
            >
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-3.5 py-3 text-xs flex justify-between items-center hover:bg-stone-50 border-b last:border-0 transition-colors"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      In stock: <strong className="text-stone-700">{p.stock_quantity}</strong>
                    </p>
                  </div>
                  <span
                    className="font-bold text-[11px] px-2.5 py-1 rounded-xl transition-all"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    + Add ({formatNaira(p.selling_price)})
                  </span>
                </button>
              ))}
            </div>
          )}

          {productQuery && filteredProducts.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl shadow-lg z-20 p-3 text-center text-xs font-medium border"
              style={{ background: "#ffffff", borderColor: "var(--border-color)", color: "var(--text-muted)" }}
            >
              No in-stock products matching &quot;{productQuery}&quot;
            </div>
          )}
        </div>

        {/* Horizontal Quick-Select Product Chips */}
        {quickSelectProducts.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
              Quick Add Items:
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
              {quickSelectProducts.map((p) => {
                const inCartQty = getCartItemQuantity(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChipTap(p)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.96] max-w-[160px] ${
                      inCartQty > 0
                        ? "text-white shadow-xs"
                        : "bg-[var(--bg-card)] hover:bg-stone-200"
                    }`}
                    style={{
                      background: inCartQty > 0 ? "var(--accent)" : "var(--bg-card)",
                      color: inCartQty > 0 ? "#ffffff" : "var(--text-primary)",
                      boxShadow: "var(--card-shadow)",
                    }}
                  >
                    <span className="truncate flex-1 text-left">{p.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md flex-shrink-0 font-bold ${
                        inCartQty > 0 ? "bg-white/25 text-white" : "bg-white text-stone-600"
                      }`}
                    >
                      {inCartQty > 0 ? `${inCartQty} in cart` : formatNaira(p.selling_price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Cart Items ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Items in Cart
            </h2>
            {cart.length > 0 && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                {totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div
              className="py-8 text-center rounded-[20px] border border-dashed flex flex-col items-center justify-center p-5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M2.25 4.5c0-.83.67-1.5 1.5-1.5h16.5c.83 0 1.5.67 1.5 1.5v15c0 .83-.67 1.5-1.5 1.5H3.75c-.83 0-1.5-.67-1.5-1.5v-15zM3.75 6v3h16.5V6H3.75zm16.5 6H3.75v7.5h16.5V12z" />
                </svg>
              </div>
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Cart is empty
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Search or tap products above to add them
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-[20px] p-3.5 space-y-2 transition-all"
                  style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)" }}
                >
                  {/* Top Row: Item Name & Line Subtotal */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-xs truncate" style={{ color: "var(--text-primary)" }}>
                      {item.name}
                    </p>
                    <p className="text-xs font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                      {formatNaira(item.quantity * item.unitPrice)}
                    </p>
                  </div>

                  {/* Bottom Row: Price Editor (Left) & Quantity Controls + Delete (Right) */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Price: ₦
                      </span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updatePrice(item.productId, e.target.value)}
                        className="w-16 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border focus:outline-none"
                        style={{
                          background: "#ffffff",
                          borderColor: "var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center rounded-xl p-0.5 bg-white border" style={{ borderColor: "var(--border-color)" }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all hover:bg-stone-100 active:scale-95"
                          style={{ color: "var(--text-primary)" }}
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-xs" style={{ color: "var(--text-primary)" }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all hover:bg-stone-100 active:scale-95"
                          style={{ color: "var(--text-primary)" }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 transition-colors"
                        title="Remove item"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Payment Method & Options ── */}
        <div
          className="rounded-[20px] p-4 space-y-3.5"
          style={{ background: "var(--bg-card)", boxShadow: "var(--card-shadow)" }}
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { method: "cash", label: "Cash", icon: "💵", activeBg: "var(--icon-success-bg)", activeText: "var(--icon-success-text)" },
                { method: "transfer", label: "Transfer", icon: "🏦", activeBg: "rgba(59, 130, 246, 0.12)", activeText: "#2563eb" },
                { method: "credit", label: "Credit", icon: "💳", activeBg: "var(--icon-warning-bg)", activeText: "var(--icon-warning-text)" },
              ].map(({ method, label, icon, activeBg, activeText }) => {
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method as "cash" | "transfer" | "credit")}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-[0.97] border ${
                      active ? "shadow-xs" : "border-stone-200 bg-white"
                    }`}
                    style={{
                      background: active ? activeBg : "#ffffff",
                      color: active ? activeText : "var(--text-muted)",
                      borderColor: active ? activeText : "var(--border-color)",
                    }}
                  >
                    <span className="text-base">{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Cards for Bank Selection (Transfer) */}
          {paymentMethod === "transfer" && (
            <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border-color)" }}>
              <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "#2563eb" }}>
                Select Bank Received
              </label>
              {bankAccounts && bankAccounts.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                  {bankAccounts.map((bank) => {
                    const isSelected = selectedBank === bank;
                    return (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-blue-50 text-[#2563eb] border-[#2563eb] shadow-xs"
                            : "bg-white text-[var(--text-muted)] border-[var(--border-color)] hover:border-blue-300"
                        }`}
                      >
                        <span>🏦</span>
                        <span>{bank}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="p-3 rounded-xl text-xs bg-white border"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                >
                  No bank accounts added yet.{" "}
                  <Link href="/shop" className="font-bold underline" style={{ color: "var(--accent)" }}>
                    Add in Shop Profile
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Customer Selection for Credit */}
          {paymentMethod === "credit" && (
            <div
              className="pt-2 border-t space-y-2.5"
              style={{ borderColor: "var(--icon-warning-bg)" }}
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--icon-warning-text)" }}>
                  Debtor Customer Info
                </label>
                {cachedCustomers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomerMode((m) => (m === "existing" ? "new" : "existing"))}
                    className="text-xs font-bold underline"
                    style={{ color: "var(--icon-warning-text)" }}
                  >
                    {customerMode === "existing" ? "+ New Customer" : "Select Existing"}
                  </button>
                )}
              </div>

              {customerMode === "existing" && cachedCustomers.length > 0 ? (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium focus:outline-none bg-white"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                >
                  <option value="">-- Select Customer Owed --</option>
                  {cachedCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none bg-white"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number (Optional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none bg-white"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              )}

              <div className="pt-1">
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Upfront Deposit Paid Now (₦)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none bg-white"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Sale Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Discount given, Paid in full"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none bg-white"
              style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Error / Success Notice */}
        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-xs font-bold border"
            style={{
              background: error.startsWith("Success") ? "var(--icon-success-bg)" : "var(--icon-danger-bg)",
              borderColor: error.startsWith("Success") ? "var(--icon-success-text)" : "var(--icon-danger-text)",
              color: error.startsWith("Success") ? "var(--icon-success-text)" : "var(--icon-danger-text)",
            }}
          >
            {error}
          </div>
        )}

        {/* ── 4. Form End Checkout Summary & Actions (Not Sticky) ── */}
        <div className="pt-2 space-y-3">
          <div
            className="rounded-[20px] p-4 flex items-center justify-between border bg-white"
            style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Total Sale Summary
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""} selected
              </p>
            </div>
            <p className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {formatNaira(totalAmount)}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/sales"
              className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-center border bg-white text-stone-600 transition-colors hover:bg-stone-50"
              style={{ borderColor: "var(--border-color)" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || cart.length === 0}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              style={{ background: "var(--accent)" }}
            >
              <span>{loading ? "Processing..." : "Checkout"}</span>
              {!loading && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
