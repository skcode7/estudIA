import { type ApiQuizSummary } from "../../lib/api";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function QuizHistoryPanel({
  quizzes,
  isLoading,
  error,
  onSelect
}: {
  quizzes: ApiQuizSummary[];
  isLoading: boolean;
  error: string;
  onSelect: (quiz: ApiQuizSummary) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Quizzes anteriores</h2>
      <p className="mt-1 text-sm text-slate-500">
        Revisa el resultado de los quizzes que ya respondiste.
      </p>

      {isLoading ? (
        <LoadingPanel label="Cargando tus quizzes…" />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : quizzes.length === 0 ? (
        <EmptyPanel
          icon="?"
          message="Cuando respondas un quiz aparecerá aquí con su resultado."
          title="Todavía no hay quizzes"
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {quizzes.map((quiz) => {
            const hasAttempt = quiz.attemptId !== null;
            return (
              <li key={quiz.id}>
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition ${
                    hasAttempt ? "hover:border-[#6d4aff] hover:bg-[#f1eeff]" : "cursor-default"
                  }`}
                  disabled={!hasAttempt}
                  onClick={() => onSelect(quiz)}
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
                    <span className="shrink-0 rounded-full bg-[#f1eeff] px-3 py-1 text-xs font-bold text-[#6d4aff]">
                      {quiz.score}%
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Sin responder
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
