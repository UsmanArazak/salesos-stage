"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { archiveProduct, restoreProduct } from "@/app/actions/products";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  archived?: boolean;
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function InventoryList({
  products,
  archivedProducts = [],
}: {
  products: ProductRow[];
  archivedProducts?: ProductRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [query, setQuery] = useState("");
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentList = activeTab === "active" ? products : archivedProducts;

  const filtered = currentList.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
  );

  function triggerToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleArchiveConfirm(id: string, name: string) {
    setConfirmArchiveId(null);
    setActionId(id);
    const result = await archiveProduct(id);
    setActionId(null);
    if ("error" in result) {
      triggerToast("Failed to archive: " + result.error, "error");
      return;
    }
    triggerToast(`Archived "${name}". Moved to Archived tab.`, "success");
    startTransition(() => router.refresh());
  }

  async function handleRestore(id: string, name: string) {
    setActionId(id);
    const result = await restoreProduct(id);
    setActionId(null);
    if ("error" in result) {
      triggerToast("Failed to restore: " + result.error, "error");
      return;
    }
    triggerToast(`Restored "${name}" to active inventory.`, "success");
    startTransition(() => router.refresh());
  }

  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
  ).length;

  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div className="space-y-5">
      {/* ── In-App Notification Toast Banner ── */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm transition-all animate-fadeIn ${
            toastMessage.type === "success"
              ? "bg-[var(--success-dim)] border-[var(--success-border)] text-[var(--icon-success-text)]"
              : "bg-[var(--icon-danger-bg)] border-[var(--danger-border)] text-[var(--icon-danger-text)]"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[var(--icon-neutral-text)] hover:opacity-70 font-bold ml-3"
          >
            &times;
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Inventory
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Manage stock, buying costs, and selling prices
          </p>
        </div>
        <Link
          href="/inventory/new"
          id="add-product-btn"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.97] shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* ── Inventory Summary: Hero ── */}
      {products.length > 0 && (() => {
        const stockValue = products.reduce((s, p) => s + p.selling_price * p.stock_quantity, 0);
        const costValue = products.reduce((s, p) => s + p.buying_price * p.stock_quantity, 0);
        const potentialProfit = stockValue - costValue;

        return (
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--bg-base) 0%, var(--accent-dim) 100%)",
              border: "1px solid var(--accent-border)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div
              className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
              style={{ background: "var(--accent)" }}
            />

            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: "var(--icon-accent-text)" }}>
                <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: "var(--accent)" }} />
                Total Stock Value
              </span>
              <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {formatNaira(stockValue)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--icon-accent-text)" }}>
                {products.length} product{products.length !== 1 ? "s" : ""} in stock
              </p>

              <div className="h-px my-3.5" style={{ background: "var(--accent-border)" }} />

              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--icon-success-bg)", color: "var(--icon-success-text)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Potential Profit</p>
                  <p className="text-sm font-bold" style={{ color: potentialProfit >= 0 ? "var(--icon-success-text)" : "var(--icon-danger-text)" }}>
                    {formatNaira(potentialProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Segmented Tab Switcher (Active vs Archived) ── */}
      <div
        className="p-1 rounded-2xl flex items-center gap-1 border bg-white"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("active");
            setConfirmArchiveId(null);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "active" ? "shadow-sm" : ""
          }`}
          style={{
            background: activeTab === "active" ? "var(--accent-dim)" : "transparent",
            color: activeTab === "active" ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <span>Active Inventory</span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded-lg font-bold"
            style={{
              background: activeTab === "active" ? "var(--accent)" : "var(--bg-card)",
              color: activeTab === "active" ? "#ffffff" : "var(--text-muted)",
            }}
          >
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("archived");
            setConfirmArchiveId(null);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "archived" ? "shadow-sm" : ""
          }`}
          style={{
            background: activeTab === "archived" ? "var(--icon-neutral-bg)" : "transparent",
            color: activeTab === "archived" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <span>Archived</span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded-lg font-bold"
            style={{
              background: activeTab === "archived" ? "var(--text-primary)" : "var(--bg-card)",
              color: activeTab === "archived" ? "#ffffff" : "var(--text-muted)",
            }}
          >
            {archivedProducts.length}
          </span>
        </button>
      </div>

      {/* ── Stock Alert Banner Notice (Active Tab only) ── */}
      {activeTab === "active" && (lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex gap-2">
          {outOfStockCount > 0 && (
            <Link
              href="/inventory/alerts"
              className="flex-1 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all"
              style={{
                background: "var(--icon-danger-bg)",
                borderColor: "var(--icon-danger-text)",
                color: "var(--icon-danger-text)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--icon-danger-text)" }}></span>
                <span>{outOfStockCount} Out of Stock</span>
              </div>
              <span>Restock →</span>
            </Link>
          )}
          {lowStockCount > 0 && (
            <Link
              href="/inventory/alerts"
              className="flex-1 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all"
              style={{
                background: "var(--icon-warning-bg)",
                borderColor: "var(--icon-warning-text)",
                color: "var(--icon-warning-text)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--icon-warning-text)" }}></span>
                <span>{lowStockCount} Low Stock</span>
              </div>
              <span>View →</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Search Input ── */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--icon-neutral-text)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={activeTab === "active" ? "Search product in stock..." : "Search archived products..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl pl-10 pr-9 py-3 text-xs font-medium transition-all focus:outline-none bg-white border"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--icon-neutral-text)] hover:opacity-70 text-sm"
          >
            &times;
          </button>
        )}
      </div>

      {/* ── Product List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center bg-white"
          style={{ borderColor: "var(--border-color)" }}
        >
          {currentList.length === 0 ? (
            <>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl shadow-sm"
                style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <p className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                {activeTab === "active" ? "No products in stock yet" : "No archived products"}
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                {activeTab === "active"
                  ? "Add products to start recording sales and tracking your profit automatically."
                  : "Products you archive will be stored here with 1-click restore capability."}
              </p>
              {activeTab === "active" && (
                <Link
                  href="/inventory/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-sm"
                  style={{ background: "var(--accent)" }}
                >
                  + Add Your First Product
                </Link>
              )}
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"
                style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <p className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Try searching with a different product name
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((product) => {
            const isOutOfStock = product.stock_quantity === 0;
            const isLow = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
            const isWorking = actionId === product.id;
            const isConfirmingArchive = confirmArchiveId === product.id;

            return (
              <div
                key={product.id}
                className="rounded-2xl p-4 transition-all border bg-white"
                style={{
                  borderColor: isOutOfStock
                    ? "var(--icon-danger-bg)"
                    : isLow
                    ? "var(--icon-warning-bg)"
                    : "var(--border-color)",
                  boxShadow: "var(--card-shadow)",
                  opacity: isWorking || isPending ? 0.6 : 1,
                }}
              >
                {/* Inline Confirmation Bar for Archiving (NO native browser alert/confirm popup!) */}
                {isConfirmingArchive ? (
                  <div className="flex items-center justify-between gap-3 p-1">
                    <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      Archive &quot;{product.name}&quot;?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmArchiveId(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-[var(--icon-neutral-bg)] text-[var(--text-muted)] hover:opacity-80"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveConfirm(product.id, product.name)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
                        style={{ background: "var(--accent)" }}
                      >
                        Confirm Archive
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Left Avatar Icon & Product Name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isOutOfStock
                              ? "var(--icon-danger-bg)"
                              : isLow
                              ? "var(--icon-warning-bg)"
                              : "var(--icon-neutral-bg)",
                            color: isOutOfStock
                              ? "var(--icon-danger-text)"
                              : isLow
                              ? "var(--icon-warning-text)"
                              : "var(--icon-neutral-text)",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                              {product.name}
                            </p>

                            {/* Status Badges: Subtle and Quiet (No heavy green box flooding!) */}
                            {activeTab === "active" && (
                              <>
                                {isOutOfStock ? (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase"
                                    style={{ background: "var(--icon-danger-bg)", color: "var(--icon-danger-text)" }}
                                  >
                                    OUT OF STOCK
                                  </span>
                                ) : isLow ? (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase"
                                    style={{ background: "var(--icon-warning-bg)", color: "var(--icon-warning-text)" }}
                                  >
                                    LOW STOCK ({product.stock_quantity} left)
                                  </span>
                                ) : (
                                  /* Subtle Dot Badge for In Stock (Quiet, non-distracting) */
                                  <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }}></span>
                                    <span>{product.stock_quantity} in stock</span>
                                  </span>
                                )}
                              </>
                            )}

                            {activeTab === "archived" && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase"
                                style={{ background: "var(--icon-neutral-bg)", color: "var(--icon-neutral-text)" }}
                              >
                                ARCHIVED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {activeTab === "active" ? (
                          <>
                            <Link
                              href={`/inventory/${product.id}/edit`}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all border bg-[var(--icon-neutral-bg)]"
                              style={{ borderColor: "var(--border-color)", color: "var(--accent)" }}
                              title="Edit product"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setConfirmArchiveId(product.id)}
                              disabled={isWorking}
                              className="p-1.5 rounded-xl text-[var(--icon-neutral-text)] hover:text-[var(--icon-danger-text)] transition-colors"
                              title="Archive product"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                <polyline points="21 8 21 21 3 21 3 8" />
                                <rect x="1" y="3" width="22" height="5" />
                                <line x1="10" y1="12" x2="14" y2="12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(product.id, product.name)}
                            disabled={isWorking}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                            style={{ background: "var(--accent)" }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <span>{isWorking ? "Restoring..." : "Restore"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Selling & Cost Price Details */}
                    <div
                      className="pt-2.5 border-t flex items-center justify-between text-xs font-medium"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Selling Price: </span>
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                          {formatNaira(product.selling_price)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Buying Cost: </span>
                        <span className="font-semibold" style={{ color: "var(--text-muted)" }}>
                          {formatNaira(product.buying_price)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Margin: </span>
                        <span className="font-bold" style={{ color: "var(--success)" }}>
                          +{formatNaira(product.selling_price - product.buying_price)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
