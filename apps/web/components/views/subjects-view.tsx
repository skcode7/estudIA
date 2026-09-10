import { type Subject } from "../../lib/subjects";
import { Notice } from "../ui/feedback";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
import { SubjectCard } from "../ui/subject-card";

export function SubjectsView({
  notice,
  subjects,
  isLoading,
  loadError,
  filter,
  onFilterChange,
  openSubjectDialog,
  openEditDialog,
  openDeleteDialog
}: {
  notice: string;
  subjects: Subject[];
  isLoading: boolean;
  loadError: string;
  filter: string;
  onFilterChange: (value: string) => void;
  openSubjectDialog: () => void;
  openEditDialog: (subject: Subject) => void;
  openDeleteDialog: (subject: Subject) => void;
}) {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis materias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra el contenido que estudias.
          </p>
        </div>
        <button
          className="min-h-12 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#5b3fe0]"
          onClick={openSubjectDialog}
          type="button"
        >
          + Nueva materia
        </button>
      </header>

      <div className="mt-6">
        <input
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none placeholder:text-slate-400 focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Buscar por nombre o descripción…"
          type="text"
          value={filter}
        />
      </div>

      {notice && <Notice>{notice}</Notice>}

      {isLoading ? (
        <LoadingPanel label="Cargando tus materias…" />
      ) : loadError ? (
        <ErrorPanel message={loadError} />
      ) : subjects.length === 0 ? (
        <EmptyPanel
          ctaLabel={filter ? undefined : "+ Nueva materia"}
          icon={filter ? "🔍" : "▤"}
          message={
            filter
              ? `No se encontraron materias para "${filter}".`
              : "Crea tu primera materia para empezar a estudiar."
          }
          onCta={filter ? undefined : openSubjectDialog}
          title={filter ? "Sin resultados" : "Sin materias"}
        />
      ) : (
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onDelete={openDeleteDialog}
              onEdit={openEditDialog}
            />
          ))}
        </div>
      )}
    </>
  );
}