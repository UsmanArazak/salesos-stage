"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RepaymentModal } from "./RepaymentModal";
import { deleteCustomer, updateCustomer } from "@/app/actions/customers";

type Customer = {
  id: string;
  name: string;
  phone: string;
  total_debt: number;
};

type ShopProfile = {
  name: string;
  phone?: string | null;
  address?: string | null;
  bankAccounts?: string[];
};

type PurchasedItem = {
  quantity: number;
  unit_price: number;
  products?: { name: string } | null;
};

type CreditRecord = {
  id: string;
  amount: number;
  amount_paid: number;
  status: string;
  created_at: string;
  sales?: {
    notes?: string | null;
    sale_items?: PurchasedItem[];
  } | {
    notes?: string | null;
    sale_items?: PurchasedItem[];
  }[] | null;
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        PAID
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
        PARTIAL
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ color: "var(--warning)", background: "var(--warning-dim)" }}>
      UNPAID
    </span>
  );
}

export function CustomerProfileClient({
  customer: initialCustomer,
  shop,
  creditHistory,
}: {
  customer: Customer;
  shop?: ShopProfile;
  creditHistory: CreditRecord[];
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [modalOpen, setModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [pdfGenerating, setPdfGenerating] = useState(false);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // PDF Bank Payment Details (Phase 2 — no reminder text, only bank fields)
  const shopName = shop?.name || "Our Shop";
  const bankList = shop?.bankAccounts || [];
  const defaultBank = bankList.length > 0 ? bankList[0] : "";

  // Parse bank name and account number from stored string if available
  // Format typically: "GTBank - 0123456789 (Account Name)" or plain text
  const [pdfBankName, setPdfBankName] = useState("");
  const [pdfAccountNumber, setPdfAccountNumber] = useState("");
  const [pdfAccountName, setPdfAccountName] = useState(defaultBank);

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;

    setEditLoading(true);
    setEditError("");

    try {
      const res = await updateCustomer(customer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditLoading(false);

      if ("error" in res) {
        setEditError(res.error);
        return;
      }

      setCustomer((prev) => ({
        ...prev,
        name: editName.trim(),
        phone: editPhone.trim(),
      }));
      setEditModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setEditLoading(false);
      setEditError(err instanceof Error ? err.message : "Failed to update customer.");
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError("");
    const res = await deleteCustomer(customer.id);
    setDeleting(false);

    if ("error" in res) {
      setDeleteError(res.error);
    } else {
      router.push("/customers");
      router.refresh();
    }
  }

  // Generate Real Downloadable PDF file
  async function handleDownloadPDF() {
    const element = document.getElementById("pdf-invoice-document");
    if (!element) return;

    setPdfGenerating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF generator library."));
          document.body.appendChild(script);
        });
      }

      const cleanFileName = `${customer.name.replace(/[^a-zA-Z0-9]/g, "_")}_Debt_Invoice.pdf`;
      const opt = {
        margin: [12, 12, 12, 12],
        filename: cleanFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).html2pdf().set(opt).from(element).save();
      setPdfGenerating(false);
    } catch (err) {
      console.error("PDF generation failed, falling back to window.print():", err);
      setPdfGenerating(false);
      window.print();
    }
  }

  // Aggregate all items purchased across credit history
  const allCreditItems: { name: string; qty: number; unitPrice: number; total: number; date: string }[] = [];
  for (const record of creditHistory) {
    const saleObj = (Array.isArray(record.sales) ? record.sales[0] : record.sales) as {
      sale_items?: PurchasedItem[];
    } | undefined | null;
    const items = saleObj?.sale_items ?? [];
    for (const item of items) {
      allCreditItems.push({
        name: item.products?.name || "Product Item",
        qty: item.quantity,
        unitPrice: item.unit_price,
        total: item.unit_price * item.quantity,
        date: formatDate(record.created_at),
      });
    }
  }

  const totalCreditAmount = creditHistory.reduce((sum, r) => sum + r.amount, 0);
  const totalRepaidAmount = creditHistory.reduce((sum, r) => sum + r.amount_paid, 0);

  // WhatsApp message — sent separately, not included in PDF
  const whatsappMessage = `Hello ${customer.name}, this is a friendly debt payment reminder from *${shopName}* regarding your outstanding balance of *${formatNaira(customer.total_debt)}*. Please make payment to settle your account. Thank you!`;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {modalOpen && (
        <RepaymentModal
          customerId={customer.id}
          totalDebt={customer.total_debt}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* ── Edit Customer Modal ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Edit Customer Details
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="08012345678"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>

              {editError && (
                <div className="text-xs font-semibold p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ background: "var(--accent)" }}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4" style={{ borderColor: "var(--border-color)" }}>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.272 0c.967.031 1.71.84 1.71 1.838v.203H8.854v-.203c0-.998.743-1.807 1.71-1.838zM10.5 11.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm3 0a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Delete {customer.name}?
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                This will permanently delete this customer record and their debt history. This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="text-xs font-semibold p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Invoice Generator Modal ── */}
      {statementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" style={{ borderColor: "var(--border-color)" }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                  Generate Debt Invoice PDF
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Enter payment details to include in the invoice
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatementModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* ── Payment Details Fields (no reminder text) ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Repayment Bank Details
              </p>

              {/* Quick-select from saved bank accounts */}
              {bankList.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Quick-fill from saved accounts
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) setPdfAccountName(val);
                    }}
                    className="w-full rounded-xl border px-3 py-2.5 text-xs focus:outline-none"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    defaultValue=""
                  >
                    <option value="">Select a saved bank account...</option>
                    {bankList.map((b, i) => (
                      <option key={i} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={pdfBankName}
                    onChange={(e) => setPdfBankName(e.target.value)}
                    placeholder="e.g. GTBank, First Bank"
                    className="w-full rounded-xl border px-3 py-2.5 text-xs focus:outline-none"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={pdfAccountNumber}
                    onChange={(e) => setPdfAccountNumber(e.target.value)}
                    placeholder="e.g. 0123456789"
                    className="w-full rounded-xl border px-3 py-2.5 text-xs focus:outline-none"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={pdfAccountName}
                  onChange={(e) => setPdfAccountName(e.target.value)}
                  placeholder="e.g. Aliyu Enterprises"
                  className="w-full rounded-xl border px-3 py-2.5 text-xs focus:outline-none"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* ── Clean PDF Invoice Preview (Printable / Downloadable) ── */}
            <div
              id="pdf-invoice-document"
              className="bg-white pt-6 pb-2 px-4 text-stone-800"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {/* Header: Shop Info only, no logo */}
              <div className="flex justify-between items-start pb-4" style={{ borderBottom: "1px solid #e7e5e4" }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1c1917", margin: 0, lineHeight: 1.2 }}>
                    {shopName}
                  </h2>
                  {shop?.phone && (
                    <p style={{ fontSize: 11, color: "#78716c", marginTop: 3 }}>
                      Tel: {shop.phone}
                    </p>
                  )}
                  {shop?.address && (
                    <p style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                      {shop.address}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    DEBT INVOICE
                  </p>
                  <p style={{ fontSize: 10, color: "#a8a29e", marginTop: 3 }}>
                    {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Billed To */}
              <div style={{ marginTop: 18, marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: "#a8a29e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  BILLED TO
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", margin: "4px 0 2px" }}>
                  {customer.name}
                </p>
                {customer.phone && (
                  <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>
                    {customer.phone}
                  </p>
                )}
              </div>

              {/* Bank Repayment Details */}
              {(pdfBankName || pdfAccountNumber || pdfAccountName) && (
                <div style={{ marginBottom: 20, backgroundColor: "#fafafa", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: "#a8a29e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                    PAYMENT ACCOUNT
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {pdfBankName && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#78716c" }}>Bank</span>
                        <span style={{ fontWeight: 700, color: "#1c1917" }}>{pdfBankName}</span>
                      </div>
                    )}
                    {pdfAccountNumber && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#78716c" }}>Account Number</span>
                        <span style={{ fontWeight: 700, color: "#1c1917", letterSpacing: "0.05em" }}>{pdfAccountNumber}</span>
                      </div>
                    )}
                    {pdfAccountName && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#78716c" }}>Account Name</span>
                        <span style={{ fontWeight: 700, color: "#1c1917" }}>{pdfAccountName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Itemized Purchase Statement */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: "#a8a29e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                  ITEMIZED PURCHASE STATEMENT
                </p>

                {/* Table Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 0.5fr 1fr 1fr", gap: 4, paddingBottom: 6, borderBottom: "1px solid #e7e5e4" }}>
                  {["Date", "Item", "Qty", "Unit Price", "Total"].map((h) => (
                    <p key={h} style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>
                      {h}
                    </p>
                  ))}
                </div>

                {allCreditItems.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#a8a29e", fontStyle: "italic", padding: "12px 0" }}>
                    No itemized credit purchases found.
                  </p>
                ) : (
                  allCreditItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 2fr 0.5fr 1fr 1fr",
                        gap: 4,
                        padding: "8px 0",
                        borderBottom: "1px solid #f5f5f4",
                      }}
                    >
                      <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>{item.date}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#1c1917", margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#44403c", margin: 0 }}>{item.qty}</p>
                      <p style={{ fontSize: 11, color: "#57534e", margin: 0 }}>{formatNaira(item.unitPrice)}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1c1917", margin: 0 }}>{formatNaira(item.total)}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Financial Totals */}
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #e7e5e4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>Total Credit Purchases</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#44403c", margin: 0 }}>{formatNaira(totalCreditAmount)}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>Total Payments Received</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", margin: 0 }}>−{formatNaira(totalRepaidAmount)}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "2px solid #e7e5e4" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", margin: 0 }}>Outstanding Balance Due</p>
                  <p style={{ fontSize: 14, fontWeight: 900, color: "#f97316", margin: 0 }}>{formatNaira(customer.total_debt)}</p>
                </div>
              </div>

              {/* SalesOS Footer — anchored at bottom of PDF */}
              <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #f5f5f4", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Image src="/logo.png" alt="SalesOS" width={18} height={18} style={{ borderRadius: 4 }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#57534e", margin: 0 }}>SalesOS</p>
                </div>
                <p style={{ fontSize: 10, color: "#a8a29e", margin: 0 }}>
                  Smart Business Management Tool
                </p>
                <p style={{ fontSize: 10, color: "#f97316", fontWeight: 600, margin: "2px 0 0" }}>
                  salesos.ng
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setStatementModalOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Close
              </button>

              <button
                type="button"
                disabled={pdfGenerating}
                onClick={handleDownloadPDF}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                style={{ background: "var(--accent)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
                {pdfGenerating ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="w-9 h-9 rounded-2xl border flex items-center justify-center transition-colors bg-white hover:bg-stone-50"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
              {customer.name}
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {customer.phone || "No phone linked"}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Debt PDF Invoice Button */}
          <button
            type="button"
            onClick={() => setStatementModalOpen(true)}
            className="p-2.5 rounded-2xl border bg-white hover:bg-stone-50 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-bold"
            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            title="Generate Debt Invoice PDF"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-600">
              <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a.375.375 0 01-.375-.375V6.75A3.75 3.75 0 0010.5 3H5.625z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline text-stone-700">PDF Invoice</span>
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => {
              setEditName(customer.name);
              setEditPhone(customer.phone || "");
              setEditError("");
              setEditModalOpen(true);
            }}
            className="p-2.5 rounded-2xl border bg-white hover:bg-stone-50 transition-colors text-stone-700 shadow-2xs"
            style={{ borderColor: "var(--border-color)" }}
            title="Edit Customer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              setDeleteError("");
              setDeleteConfirmOpen(true);
            }}
            className="p-2.5 rounded-2xl border text-red-600 hover:bg-red-50 border-red-200 transition-colors"
            title="Delete Customer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.272 0c.967.031 1.71.84 1.71 1.838v.203H8.854v-.203c0-.998.743-1.807 1.71-1.838zM10.5 11.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm3 0a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Premium Total Debt Card ── */}
      <div
        className="p-5 sm:p-6 rounded-2xl border bg-white space-y-4 transition-all"
        style={{
          borderColor: customer.total_debt > 0 ? "var(--warning-border)" : "var(--border-color)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Card Header: Badge + WhatsApp quick reminder top right */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full inline-block"
            style={{
              background: customer.total_debt > 0 ? "var(--warning-dim)" : "rgba(22,163,74,0.1)",
              color: customer.total_debt > 0 ? "var(--warning)" : "var(--success)",
            }}
          >
            Total Outstanding Debt
          </span>

          {customer.phone && customer.total_debt > 0 && (
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.97]"
              title="Send WhatsApp Reminder"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp</span>
            </a>
          )}
        </div>

        {/* Debt Amount */}
        <div>
          <p
            className="text-4xl font-black tracking-tight"
            style={{ color: customer.total_debt > 0 ? "var(--accent)" : "var(--success)" }}
          >
            {formatNaira(customer.total_debt)}
          </p>
          <p className="text-xs mt-1 font-medium text-stone-500">
            {customer.total_debt > 0
              ? "Outstanding balance pending settlement"
              : "No pending balance — account is clear"}
          </p>
        </div>

        {/* Action Buttons: Record Repayment + WhatsApp Reminder (replaces second PDF button) */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={() => setModalOpen(true)}
            disabled={customer.total_debt <= 0}
            className="flex-1 py-3 rounded-2xl font-bold text-xs text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            style={{ background: "var(--accent)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
            </svg>
            Record Repayment
          </button>

          {customer.phone && customer.total_debt > 0 ? (
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-2xl font-bold text-xs text-white transition-all active:scale-[0.97] shadow-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp Reminder</span>
            </a>
          ) : (
            <button
              disabled
              className="px-4 py-3 rounded-2xl font-bold text-xs border bg-stone-50 text-stone-400 cursor-not-allowed flex items-center justify-center gap-2"
              style={{ borderColor: "var(--border-color)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp Reminder</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Credit History Log ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Credit Purchase History
          </h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Tap to view items
          </p>
        </div>

        {creditHistory.length === 0 ? (
          <div
            className="text-xs text-center py-10 rounded-2xl border bg-white"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            No credit history found for this customer.
          </div>
        ) : (
          <div className="space-y-2.5">
            {creditHistory.map((record) => {
              const isExpanded = Boolean(expandedIds[record.id]);
              const saleObj = (Array.isArray(record.sales) ? record.sales[0] : record.sales) as {
                notes?: string | null;
                sale_items?: PurchasedItem[];
              } | undefined | null;
              const items: PurchasedItem[] = saleObj?.sale_items ?? [];
              const remainingDebt = Math.max(0, record.amount - record.amount_paid);

              return (
                <div
                  key={record.id}
                  onClick={() => toggleExpand(record.id)}
                  className="p-3.5 rounded-2xl border bg-white cursor-pointer hover:border-orange-300 transition-all select-none"
                  style={{ borderColor: "var(--border-color)", boxShadow: "var(--card-shadow)" }}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                          {formatNaira(record.amount)}
                        </p>
                        <span className="text-[10px] text-stone-400">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {formatDate(record.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-1">
                      <StatusBadge status={record.status} />
                      <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        Paid: {formatNaira(record.amount_paid)}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2.5" style={{ borderColor: "var(--border-color)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Items Purchased:
                      </p>
                      {items.length === 0 ? (
                        <p className="text-xs italic text-stone-400">No item details recorded.</p>
                      ) : (
                        <ul className="space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                          {items.map((item, idx) => (
                            <li key={idx} className="text-xs flex justify-between items-center text-stone-700">
                              <span className="truncate pr-2 font-medium">
                                {item.quantity}x {item.products?.name || "Product Item"}
                              </span>
                              <span className="font-bold text-stone-900 flex-shrink-0">
                                {formatNaira(item.unit_price * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div
                        className="flex justify-between items-center text-xs pt-2 border-t border-dashed"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <span className="text-stone-500 font-medium">Remaining on this Bill:</span>
                        <span
                          className="font-bold"
                          style={{ color: remainingDebt > 0 ? "var(--warning)" : "var(--success)" }}
                        >
                          {formatNaira(remainingDebt)}
                        </span>
                      </div>

                      {saleObj?.notes && (
                        <p className="text-xs italic text-stone-500">Note: {saleObj.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
