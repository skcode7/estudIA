export function Stat({
  emoji,
  label,
  value
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-[82px] items-center gap-2 px-3 sm:min-w-[102px]">
      <span aria-hidden="true" className="text-xl">
        {emoji}
      </span>
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}