"use client";

import { useEffect, useId } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  itemName: string;
  description: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  open,
  title,
  itemName,
  description,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-[#172238] p-6 shadow-2xl shadow-black/50 sm:p-7"
      >
        <button
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-700/60 hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:opacity-50"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-300">
          <AlertTriangle size={23} aria-hidden="true" />
        </div>
        <h2 id={titleId} className="text-xl font-bold text-slate-50">{title}</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-400">
          Are you sure you want to delete <strong className="break-all text-slate-100">{itemName}</strong>? {description}
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            {busy ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
