import Image from "next/image";

import { type Subject } from "../../lib/subjects";
import { Notice } from "../ui/feedback";
import { Icon } from "../ui/icon";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
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
      <header>
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">
          ¡Hola, {userName}!
        </p>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Listo para aprender con tus propios materiales.
        </p>
      </header>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6bff] to-[#5b3fe0] p-6 text-white shadow-sm sm:p-8 xl:col-start-1 xl:row-start-1">
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              <Icon name="goal" />
              Reto de hoy
            </span>
            <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Aprende a tu ritmo</h1>
            <p className="mt-2 text-white/85">
              Selecciona una materia y agrega el material que quieres estudiar.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
              <span>Materiales propios</span>
              <span className="before:mr-3 before:text-white/70 before:content-['·']">
                Preguntas personalizadas
              </span>
            </div>
          </div>
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 h-auto w-28 select-none opacity-20 sm:bottom-5 sm:right-5 sm:w-44"
            height={526}
            sizes="(min-width: 640px) 176px, 128px"
            src="/brand/estudia-logo.webp"
            width={512}
          />
          <Icon className="absolute right-8 top-7 text-3xl text-amber-300" name="sparkle" />
        </section>

        <section
          aria-labelledby="home-subjects-heading"
          className="xl:col-start-1 xl:row-start-2"
        >
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
              <Icon className="mr-1" name="add" />
              Nueva materia
            </button>
          </div>

          {notice && <Notice>{notice}</Notice>}

          {isLoading ? (
            <LoadingPanel label="Cargando tus materias…" />
          ) : loadError ? (
            <ErrorPanel message={loadError} />
          ) : subjects.length === 0 ? (
            <EmptyPanel
              ctaLabel="Nueva materia"
              icon="subjects"
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

        <aside className="flex flex-col rounded-2xl border border-slate-100 bg-[#fef3e2] p-6 shadow-sm xl:col-start-2 xl:row-start-1">
          <h2 className="text-lg font-bold">¡No olvides!</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Agrega el material que te mandan en la escuela para generar quizzes personalizados.
          </p>
          <div className="mt-auto pt-5">
            <button
              className="min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
              onClick={openMaterialDialog}
              type="button"
            >
              Agregar material <Icon className="ml-1" name="add" />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
