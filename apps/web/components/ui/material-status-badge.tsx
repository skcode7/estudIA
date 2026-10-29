import { type MaterialProcessingStatus } from "../../lib/api";
import { Icon, type IconName } from "./icon";

const STATUS_STYLES: Record<MaterialProcessingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-slate-100 text-slate-600" },
  PROCESSING: { label: "Procesando…", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "Error", className: "bg-rose-100 text-rose-700" }
};

const STATUS_ICONS: Partial<Record<MaterialProcessingStatus, IconName>> = {
  PROCESSING: "pending",
  FAILED: "warning",
  COMPLETED: "check"
};

export function MaterialStatusBadge({ status }: { status: MaterialProcessingStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
    >
      {STATUS_ICONS[status] && <Icon name={STATUS_ICONS[status]!} />}
      {style.label}
    </span>
  );
}

const IMAGE_BADGE_CLASSNAME = "bg-sky-100 text-sky-700";

export function MaterialImageBadge({ count }: { count: number }) {
  const label = `${count} ${count === 1 ? "imagen" : "imágenes"}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${IMAGE_BADGE_CLASSNAME}`}
      aria-label={label}
      title={label}
    >
      <Icon name="image" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
}
