"use client";

import Image from "next/image";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptData = {
  shopName?: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  saleId?: string;
  date: string;
  paymentMethod: string;
  bankName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  totalAmount: number;
  notes?: string | null;
};

function formatNaira(n: number) {
  return "₦" + new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  const shopName = receipt.shopName || "Our Shop";
  const dateStr = new Date(receipt.date).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Construct WhatsApp formatted message text
  const itemLines = receipt.items
    .map((item) => `• ${item.quantity}x ${item.name} @ ${formatNaira(item.unitPrice)} = ${formatNaira(item.total)}`)
    .join("\n");

  const methodLabel =
    receipt.paymentMethod === "transfer" && receipt.bankName
      ? `TRANSFER (${receipt.bankName})`
      : receipt.paymentMethod.toUpperCase();

  const whatsappMessage = `🧾 *SALES RECEIPT — ${shopName.toUpperCase()}*
📅 Date: ${dateStr}
💳 Payment: ${methodLabel}${receipt.customerName ? `\n👤 Customer: ${receipt.customerName}` : ""}

*PURCHASED ITEMS:*
${itemLines}

*TOTAL: ${formatNaira(receipt.totalAmount)}*
${receipt.notes ? `\nNote: ${receipt.notes}` : ""}

Thank you for your patronage!
_Powered by SalesOS · https://salesos.ng_`;

  const targetPhone = receipt.customerPhone ? receipt.customerPhone.replace(/\D/g, "") : "";
  const whatsappUrl = targetPhone
    ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--border-color)" }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="SalesOS Logo" width={24} height={24} className="rounded-lg" />
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Digital Sales Receipt
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Printable Receipt Container */}
        <div id="printable-receipt" className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-stone-800 space-y-4 text-xs font-mono">
          {/* Shop Branding */}
          <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Image src="/logo.png" alt="Shop Logo" width={22} height={22} className="rounded-lg" />
              <span className="font-sans font-black text-base text-stone-900 leading-tight">{shopName}</span>
            </div>
            {receipt.shopPhone && <p className="text-stone-500 font-sans text-[11px]">Phone: {receipt.shopPhone}</p>}
            {receipt.shopAddress && <p className="text-stone-500 font-sans text-[11px]">{receipt.shopAddress}</p>}
            <p className="text-[10px] text-stone-400 font-sans pt-1">Date: {dateStr}</p>
          </div>

          {/* Meta Information */}
          <div className="space-y-1 font-sans text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Payment Method:</span>
              <span className="font-bold text-stone-900 uppercase">{methodLabel}</span>
            </div>
            {receipt.customerName && (
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span className="font-bold text-stone-900">{receipt.customerName}</span>
              </div>
            )}
            {receipt.saleId && (
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>Receipt Ref:</span>
                <span className="font-mono">{receipt.saleId.slice(0, 8)}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="border-t border-dashed border-stone-300 pt-3 space-y-2">
            <div className="flex justify-between text-[10px] font-sans font-bold uppercase text-stone-500 border-b pb-1">
              <span>Item & Qty</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1.5">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="truncate pr-2 font-sans font-medium text-stone-900">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-sans font-bold flex-shrink-0 text-stone-900">
                    {formatNaira(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t border-dashed border-stone-300 pt-3 space-y-1 font-sans">
            <div className="flex justify-between text-sm font-black text-stone-900">
              <span>TOTAL PAID</span>
              <span className="text-emerald-700">{formatNaira(receipt.totalAmount)}</span>
            </div>
            {receipt.notes && (
              <p className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200 mt-2">
                Note: {receipt.notes}
              </p>
            )}
          </div>

          {/* Footer Branding */}
          <div className="text-center pt-3 border-t border-dashed border-stone-300 space-y-1 font-sans text-[10px] text-stone-400">
            <p>Thank you for your patronage!</p>
            <div className="flex items-center justify-center gap-1 font-semibold text-stone-500">
              <Image src="/logo.png" alt="SalesOS" width={14} height={14} className="rounded-xs" />
              <span>Powered by SalesOS · salesos.ng</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="space-y-2 pt-1">
          {/* WhatsApp Share Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.105 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Share Receipt via WhatsApp</span>
          </a>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-xs font-semibold border bg-stone-50 hover:bg-stone-100 transition-colors"
              style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
              style={{ background: "var(--accent)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.25H3.375C2.339 5.625 1.5 6.465 1.5 7.5v6.75c0 1.035.84 1.875 1.875 1.875H6v2.25c0 1.036.84 1.875 1.875 1.875h8.25c1.035 0 1.875-.84 1.875-1.875v-2.25h2.625c1.035 0 1.875-.84 1.875-1.875V7.5c0-1.035-.84-1.875-1.875-1.875H18v-2.25C18 2.34 17.16 1.5 16.125 1.5h-8.25zM16.5 7.5V3.375a.375.375 0 00-.375-.375h-8.25a.375.375 0 00-.375.375V7.5h9z" clipRule="evenodd" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
