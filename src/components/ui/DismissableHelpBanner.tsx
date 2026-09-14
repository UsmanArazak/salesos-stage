"use client";

import { useState, useEffect } from "react";

type Props = {
  storageKey: string;
  message: string;
};

export function DismissableHelpBanner({ storageKey, message }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`help-banner-${storageKey}`);
    if (!isDismissed) {
      setVisible(true);
    }
  }, [storageKey]);

  function handleDismiss() {
    localStorage.setItem(`help-banner-${storageKey}`, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="mb-5 p-3.5 rounded-[20px] flex items-center gap-3 relative transition-all"
      style={{
        background: "var(--icon-info-bg)",
        border: "1px solid var(--icon-info-bg)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}
    >
      {/* Lightbulb Solid SVG Circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs bg-white"
        style={{ color: "var(--icon-info-text)" }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21a1 1 0 001 1h4a1 1 0 001-1v-1H9v1z" />
        </svg>
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold leading-relaxed" style={{ color: "var(--icon-info-text)" }}>
          {message}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
        style={{ color: "var(--icon-info-text)" }}
        aria-label="Dismiss tip"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
