import { type Subject } from "../../lib/subjects";
import { Notice } from "../ui/feedback";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
import { Stat } from "../ui/stat";
import { SubjectCard } from "../ui/subject-card";

export function HomeView({
  notice,
  subjects,
  isLoading,
  loadError,
  userName,
  openSubjectDialog,
  openMaterialDialog
}: {
  notice: string;
  subjects: Subject[];
  isLoading: boolean;
  loadError: string;
  userName: string;
  openSubjectDialog: () => void;
  openMaterialDialog: () => void;
}) {
  return (
    <>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">
            ¡Hola, {userName}! <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Listo para aprender con tus propios materiales.
          </p>
        </div>
        <div className="flex w-full divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white px-2 py-2 shadow-sm sm:w-auto">
          <Stat emoji="🔥" label="Racha" value="5 días" />
          <Stat emoji="⭐" label="XP" value="1,240" />
          <Stat emoji="💎" label="Diamantes" value="230" />
          <button
            aria-label="Notificaciones"
            className="grid size-12 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-50"
            type="button"
          >
            ♧
          </button>
        </div>
      </header>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6bff] to-[#5b3fe0] p-6 text-white shadow-sm sm:p-8">
            <div className="relative z-10 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                ◎ Reto de hoy
              </span>
              <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Aprende a tu ritmo</h1>
              <p className="mt-2 text-white/85">
                Selecciona una materia y agrega el material que quieres estudiar.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
                <span>Materiales propios</span>
                <span>•</span>
                <span>Preguntas personalizadas</span>
                <span>•</span>
                <span>Progreso real</span>
              </div>

            </div>
            <span
              aria-hidden="true"
              className="absolute bottom-[-28px] right-5 text-[150px] opacity-20 sm:text-[180px]"
            >
              🤖
            </span>
            <span
              aria-hidden="true"
              className="absolute right-8 top-7 text-3xl text-amber-300"
            >
              ✦
            </span>
          </section>

          <section aria-labelledby="home-subjects-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" id="home-subjects-heading">
                  Mis materias
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Organiza el contenido que estudias.
                </p>
              </div>
              <button
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#6d4aff] hover:bg-[#f1eeff]"
                onClick={openSubjectDialog}
                type="button"
              >
                + Nueva materia
              </button>
            </div>

            {notice && <Notice>{notice}</Notice>}

            {isLoading ? (
              <LoadingPanel label="Cargando tus materias…" />
            ) : loadError ? (
              <ErrorPanel message={loadError} />
            ) : subjects.length === 0 ? (
              <EmptyPanel
                ctaLabel="+ Nueva materia"
                icon="▤"
                message="Crea tu primera materia para empezar a estudiar."
                onCta={openSubjectDialog}
                title="Sin materias"
              />
            ) : (
              <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subjects.map((subject) => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-[#fef3e2] p-6 shadow-sm xl:self-start">
          <span aria-hidden="true" className="text-4xl">🎒</span>
          <h2 className="mt-5 text-lg font-bold">¡No olvides!</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Agrega el material que te mandan en la escuela para generar quizzes personalizados.
          </p>
          <button
            className="mt-5 min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
            onClick={openMaterialDialog}
            type="button"
          >
            Agregar material ⊕
          </button>
        </aside>
      </div>
    </>
  );
}