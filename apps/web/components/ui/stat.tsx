import { Icon, type IconName } from "./icon";

export function Stat({
  icon,
  label,
  value
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-[82px] items-center gap-2 px-3 sm:min-w-[102px]">
      <Icon className="text-xl text-[#6d4aff]" name={icon} />
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
