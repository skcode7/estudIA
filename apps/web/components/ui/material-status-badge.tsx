import { type MaterialProcessingStatus } from "../../lib/api";

const STATUS_STYLES: Record<MaterialProcessingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-slate-100 text-slate-600" },
  PROCESSING: { label: "Procesando…", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "Error", className: "bg-rose-100 text-rose-700" }
};

export function MaterialStatusBadge({ status }: { status: MaterialProcessingStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
    >
      {status === "PROCESSING" && <span aria-hidden="true">⏳</span>}
      {status === "FAILED" && <span aria-hidden="true">⚠</span>}
      {status === "COMPLETED" && <span aria-hidden="true">✓</span>}
      {style.label}
    </span>
  );
}