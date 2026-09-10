import { navItems, type NavItemId } from "../../lib/navigation";

export function Sidebar({
  activeView,
  onNavigate,
  openMaterialDialog,
  userName
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
  openMaterialDialog: () => void;
  userName: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-7 lg:flex">
      <button
        className="flex items-center gap-2 px-3 text-left"
        onClick={() => onNavigate("home")}
        type="button"
      >
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-xl bg-[#6d4aff] text-xl text-white"
        >
          🤖
        </span>
        <span className="text-2xl font-bold tracking-tight">
          estud<span className="text-[#6d4aff]">IA</span>
        </span>
      </button>
      <nav aria-label="Navegación principal" className="mt-10 space-y-2">
        {navItems.map(([id, icon, label]) => (
          <button
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
              activeView === id
                ? "bg-[#f1eeff] font-semibold text-[#6d4aff]"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            key={id}
            onClick={() => onNavigate(id)}
            type="button"
          >
            <span aria-hidden="true" className="grid size-5 place-items-center text-lg">
              {icon}
            </span>
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-7 border-t border-slate-100 pt-5">
        <button
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-[#f1eeff] hover:text-[#6d4aff]"
          onClick={openMaterialDialog}
          type="button"
        >
          <span aria-hidden="true" className="text-xl">
            ⊕
          </span>
          Agregar material
        </button>
      </div>
      <div className="mt-auto rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-violet-100 text-xl"
          >
            🧑‍🎓
          </span>
          <div>
            <p className="text-sm font-bold">{userName}</p>
            <p className="text-xs text-[#6d4aff]">Nivel 8</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-[77%] rounded-full bg-[#6d4aff]" />
        </div>
        <p className="mt-2 text-xs text-slate-500">1,240 / 1,600 XP</p>
      </div>
    </aside>
  );
}