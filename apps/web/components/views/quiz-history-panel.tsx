import { useRef, useState } from "react";

import { type ApiQuizSummary } from "../../lib/api";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function QuizHistoryPanel({
  quizzes,
  isLoading,
  error,
  subjectName,
  onGenerate,
  onSelect,
  onContinue
}: {
  quizzes: ApiQuizSummary[];
  isLoading: boolean;
  error: string;
  subjectName?: string;
  onGenerate?: () => void;
  onSelect: (quiz: ApiQuizSummary) => void;
  onContinue?: (quiz: ApiQuizSummary) => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(quizzes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const rangeStart = currentPage * PAGE_SIZE;
  const rangeEnd = Math.min(quizzes.length, rangeStart + PAGE_SIZE);
  const visibleQuizzes = quizzes.slice(rangeStart, rangeEnd);

  function goToPage(nextPage: number): void {
    setPage(nextPage);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="mt-8 scroll-mt-6" ref={sectionRef}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Quizzes anteriores</h2>
          <p className="mt-1 text-sm text-slate-500">
            Revisa el resultado de los quizzes respondidos o continúa los que dejaste a medias.
          </p>
        </div>
        {!isLoading && !error && quizzes.length > 0 && (
          <span className="text-xs font-medium tabular-nums text-slate-400">
            {totalPages > 1
              ? `Mostrando ${rangeStart + 1}–${rangeEnd} de ${quizzes.length}`
              : `${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"}`}
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingPanel label="Cargando tus quizzes…" />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : quizzes.length === 0 ? (
        <EmptyPanel
          ctaLabel={onGenerate ? "Generar quiz" : undefined}
          icon="quiz"
          message={`Crea un quiz de ${subjectName || "la materia seleccionada"} con tus preguntas. Cuando lo respondas aparecerá aquí con su resultado.`}
          onCta={onGenerate}
          title="Todavía no hay quizzes"
        />
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {visibleQuizzes.map((quiz) => {
              const hasAttempt = quiz.attemptId !== null;
              return (
                <li key={quiz.id}>
                  <button
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition ${
                      hasAttempt
                        ? "hover:border-[#6d4aff] hover:bg-[#f1eeff]"
                        : "hover:border-[#6d4aff] hover:bg-[#f1eeff]"
                    }`}
                    onClick={() => (hasAttempt ? onSelect(quiz) : onContinue?.(quiz))}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold">{quiz.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {quiz.topicName ?? "Toda la materia"} · {quiz.questionCount}{" "}
                        {quiz.questionCount === 1 ? "pregunta" : "preguntas"} ·{" "}
                        {formatDate(quiz.createdAt)}
                      </span>
                    </span>
                    {hasAttempt ? (
                      <span className="shrink-0 rounded-full bg-[#f1eeff] px-3 py-1 text-xs font-bold tabular-nums text-[#6d4aff]">
                        {quiz.score}%
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#6d4aff] px-3 py-1 text-xs font-bold text-white">
                        Continuar
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav
              aria-label="Paginación de quizzes anteriores"
              className="mt-4 flex items-center justify-between gap-3"
            >
              <button
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === 0}
                onClick={() => goToPage(Math.max(0, currentPage - 1))}
                type="button"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold tabular-nums text-slate-500">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage >= totalPages - 1}
                onClick={() => goToPage(Math.min(totalPages - 1, currentPage + 1))}
                type="button"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
