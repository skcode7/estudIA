import { Icon, type IconName } from "./icon";

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center">
      <div>
        <Icon className="text-3xl text-rose-600" name="warning" />
        <h3 className="mt-3 font-bold text-rose-700">No se pudieron cargar tus materias</h3>
        <p className="mt-1 text-sm text-rose-600">{message}</p>
      </div>
    </div>
  );
}

export function EmptyPanel({
  icon,
  title,
  message,
  ctaLabel,
  onCta
}: {
  icon: IconName;
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div>
        <Icon className="text-3xl text-[#6d4aff]" name={icon} />
        <h3 className="mt-3 font-bold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {ctaLabel && onCta && (
          <button
            className="mt-5 min-h-11 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
            onClick={onCta}
            type="button"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
