"use client";

import { type ApiQuizAttemptDetail } from "../../lib/api";
import { Dialog } from "./dialog";
import { FieldError } from "../ui/feedback";
import { QuizQuestionReview } from "../views/quiz-question-review";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function QuizAttemptDetailDialog({
  detail,
  error,
  isLoading,
  onClose
}: {
  detail: ApiQuizAttemptDetail | null;
  error: string;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} title={detail ? `Detalle de ${detail.quizTitle}` : "Detalle del quiz"} wide>
      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : error ? (
        <FieldError>{error}</FieldError>
      ) : detail ? (
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">Resultado del intento</p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#6d4aff]">
              {detail.score}%
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {detail.answers.filter((answer) => answer.isCorrect).length} de{" "}
              {detail.answers.length} aciertos · {formatDate(detail.completedAt)}
            </p>
          </article>

          {detail.answers.map((answer, index) => (
            <QuizQuestionReview
              correctOptionId={answer.options.find((option) => option.isCorrect)?.id ?? null}
              explanation={answer.explanation}
              imageUrl={answer.imageUrl}
              index={index + 1}
              isCorrect={answer.isCorrect}
              key={answer.questionId}
              options={answer.options}
              selectedOptionId={answer.selectedOptionId}
              statement={answer.statement}
            />
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}
