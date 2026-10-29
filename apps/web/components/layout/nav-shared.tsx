import Image from "next/image";

import { navItems, type NavItemId } from "../../lib/navigation";
import { Icon } from "../ui/icon";

const navItemBase =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition";

export function BrandLockup({
  className = "",
  onNavigate,
  textClassName = "text-2xl"
}: {
  className?: string;
  onNavigate: (view: NavItemId) => void;
  textClassName?: string;
}) {
  return (
    <button
      className={`flex items-center gap-2 text-left ${className}`}
      onClick={() => onNavigate("home")}
      type="button"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1eeff] p-1"
      >
        <Image
          alt=""
          className="size-full object-contain"
          height={522}
          sizes="40px"
          src="/brand/estudia-mark.webp"
          width={512}
        />
      </span>
      <span className={`${textClassName} font-bold tracking-tight`}>
        estud<span className="text-[#6d4aff]">IA</span>
      </span>
    </button>
  );
}

export function NavLinks({
  activeView,
  onNavigate
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
}) {
  return (
    <>
      {navItems.map(([id, icon, label]) => (
        <button
          className={`${navItemBase} ${
            activeView === id
              ? "bg-[#f1eeff] font-semibold text-[#6d4aff]"
              : "text-slate-500 hover:bg-slate-50"
          }`}
          key={id}
          onClick={() => onNavigate(id)}
          type="button"
        >
          <Icon className="size-5 text-xl" name={icon} />
          {label}
        </button>
      ))}
    </>
  );
}

export function AddMaterialButton({
  className = "",
  onClick
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`${navItemBase} font-semibold text-slate-600 hover:bg-[#f1eeff] hover:text-[#6d4aff] ${className}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="text-xl" name="add" />
      Agregar material
    </button>
  );
}

export function UserCard({ className = "", userName }: { className?: string; userName: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full bg-violet-100 text-xl"
        >
          <Icon className="text-xl text-violet-700" name="graduate" />
        </span>
        <div>
          <p className="text-sm font-bold">{userName}</p>
          <p className="text-xs text-slate-500">Estudiante</p>
        </div>
      </div>
    </div>
  );
}
