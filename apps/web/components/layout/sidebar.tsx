import { type NavItemId } from "../../lib/navigation";
import { AddMaterialButton, BrandLockup, NavLinks, UserCard } from "./nav-shared";

export function Sidebar({
  activeView,
  onNavigate,
  openMaterialDialog,
  userName,
  onLogout
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
  openMaterialDialog: () => void;
  userName: string;
  onLogout?: () => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-7 lg:flex">
      <BrandLockup className="px-3" onNavigate={onNavigate} />
      <nav aria-label="Navegación principal" className="mt-10 space-y-2">
        <NavLinks activeView={activeView} onNavigate={onNavigate} />
      </nav>
      <div className="mt-7 border-t border-slate-100 pt-5">
        <AddMaterialButton onClick={openMaterialDialog} />
      </div>
      <UserCard className="mt-auto" userName={userName} />
      {onLogout && userName && (
        <button
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onLogout}
          type="button"
        >
          Salir
        </button>
      )}
    </aside>
  );
}
