import { Icon } from "../ui/icon";

export function PlaceholderView({ title }: { title: string }) {
  return (
    <section className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div>
        <Icon className="text-4xl text-[#6d4aff]" name="sparkle" />
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Esta sección estará disponible próximamente.
        </p>
      </div>
    </section>
  );
}
