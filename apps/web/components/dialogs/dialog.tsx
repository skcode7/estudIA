import { type ReactNode } from "react";

export function Dialog({
  children,
  onClose,
  title,
  wide = false
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <div
        className={`w-full rounded-3xl bg-white p-6 shadow-xl ${
          wide ? "max-h-[90vh] max-w-2xl overflow-y-auto" : "max-w-lg"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            aria-label="Cerrar"
            className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogActions({
  disabled = false,
  onCancel,
  submitLabel
}: {
  disabled?: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>
      <button
        className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {submitLabel}
      </button>
    </div>
  );
}