"use client";

import { useEffect } from "react";

/** Minimal centered modal primitive: overlay + Esc + scroll lock. */
export function Modal({
  onClose,
  labelledBy,
  children,
  maxWidth = 880,
}: {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-md"
      />
      <div
        style={{ width: `min(${maxWidth}px, 100%)` }}
        className="relative flex max-h-[92dvh] animate-modal-in flex-col overflow-hidden overscroll-contain rounded-t-2xl border border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-black/5 sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:pb-0"
      >
        {children}
      </div>
    </div>
  );
}
