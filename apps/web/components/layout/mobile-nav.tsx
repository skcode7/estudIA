import { navItems, type NavItemId } from "../../lib/navigation";

export function MobileNav({
  activeView,
  onNavigate,
  openMaterialDialog
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
  openMaterialDialog: () => void;
}) {
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-20 flex h-20 items-center justify-around border-t border-slate-100 bg-white px-2 lg:hidden"
    >
      {navItems.slice(0, 4).map(([id, icon, label]) => (
        <button
          className={`grid min-h-12 min-w-12 place-items-center gap-0.5 rounded-xl px-2 text-xs ${
            activeView === id ? "font-bold text-[#6d4aff]" : "text-slate-500"
          }`}
          key={id}
          onClick={() => onNavigate(id)}
          type="button"
        >
          <span className="text-lg">{icon}</span>
          {label}
        </button>
      ))}
      <button
        aria-label="Agregar material"
        className="-mt-9 grid size-14 place-items-center rounded-full bg-[#6d4aff] text-2xl text-white shadow-lg shadow-violet-300"
        onClick={openMaterialDialog}
        type="button"
      >
        🤖
      </button>
    </nav>
  );
}