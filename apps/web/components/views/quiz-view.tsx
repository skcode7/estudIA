"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  assetUrl,
  generateQuiz,
  getQuizAttempt,
  listQuizzes,
  listTopics,
  submitQuizAnswers,
  type ApiQuiz,
  type ApiQuizAttemptDetail,
  type ApiQuizAttemptResult,
  type ApiQuizSummary,
  type ApiTopic,
  type QuizSize
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { QuizAttemptDetailDialog } from "../dialogs/quiz-attempt-detail-dialog";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
import { QuizHistoryPanel } from "./quiz-history-panel";
import { QuizQuestionReview } from "./quiz-question-review";

export function QuizView({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [areTopicsLoading, setAreTopicsLoading] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [quiz, setQuiz] = useState<ApiQuiz | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ApiQuizAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [size, setSize] = useState<QuizSize>("MEDIUM");
  const [quizzes, setQuizzes] = useState<ApiQuizSummary[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ApiQuizAttemptDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const activeSubjectId = subjectId || subjects[0]?.id || "";

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    listTopics(activeSubjectId)
      .then((fetched) => {
        if (cancelled) return;
        setTopics(fetched);
        setTopicId((current) =>
          current && fetched.some((topic) => topic.id === current) ? current : ""
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los temas.");
        }
      })
      .finally(() => {
        if (!cancelled) setAreTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  // `historyVersion` no se lee dentro del efecto: es la señal para recargar el
  // historial tras enviar un intento sin duplicar aquí la lógica de carga. El
  // estado de "cargando" se levanta en los manejadores, no dentro del efecto.
  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    listQuizzes(activeSubjectId)
      .then((fetched) => {
        if (!cancelled) setQuizzes(fetched);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error ? error.message : "No se pudieron cargar tus quizzes."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId, historyVersion]);

  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId)?.name ?? "",
    [subjects, activeSubjectId]
  );

  const handleSubjectChange = useCallback((value: string) => {
    setSubjectId(value);
    setTopicId("");
    setTopics([]);
    setAreTopicsLoading(true);
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setLoadError("");
    setQuizzes([]);
    setIsHistoryLoading(true);
    setHistoryError("");
    setIsDetailOpen(false);
    setDetail(null);
    setDetailError("");
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoadError("");
    setIsGenerating(true);
    try {
      const created = await generateQuiz({
        subjectId: activeSubjectId,
        size,
        ...(topicId ? { topicId } : {})
      });
      setQuiz(created);
      setStartedAt(new Date().toISOString());
      setAnswers({});
      setResult(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo generar el quiz.");
    } finally {
      setIsGenerating(false);
    }
  }, [activeSubjectId, topicId, size]);

  const allAnswered = quiz
    ? quiz.questions.every((question) => Boolean(answers[question.id]))
    : false;

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    if (!allAnswered) {
      setLoadError("Responde todas las preguntas antes de enviar el quiz.");
      return;
    }
    setLoadError("");
    setIsSubmitting(true);
    try {
      const attempt = await submitQuizAnswers(
        quiz.id,
        startedAt,
        quiz.questions.map((question) => ({
          questionId: question.id,
          selectedOptionId: answers[question.id]!
        }))
      );
      setResult(attempt);
      setHistoryVersion((current) => current + 1);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo registrar el intento.");
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, startedAt, answers, allAnswered]);

  const handleNewQuiz = useCallback(() => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setLoadError("");
  }, []);

  const handleOpenDetail = useCallback(async (summary: ApiQuizSummary) => {
    if (!summary.attemptId) return;
    setIsDetailOpen(true);
    setDetail(null);
    setDetailError("");
    setIsDetailLoading(true);
    try {
      setDetail(await getQuizAttempt(summary.id, summary.attemptId));
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "No se pudo cargar el detalle del quiz."
      );
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setDetail(null);
    setDetailError("");
  }, []);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quiz</h1>
          <p className="mt-1 text-sm text-slate-500">
            Elige una materia y genera un quiz con las preguntas de tus apuntes.
          </p>
        </div>
      </header>

      {!quiz && !result && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Materia
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                onChange={(event) => handleSubjectChange(event.target.value)}
                value={activeSubjectId}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Tema <span className="font-normal text-slate-400">(opcional)</span>
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                disabled={!activeSubjectId || areTopicsLoading}
                onChange={(event) => setTopicId(event.target.value)}
                value={topicId}
              >
                {areTopicsLoading ? (
                  <option value="">Cargando temas…</option>
                ) : topics.length === 0 ? (
                  <option value="">Toda la materia</option>
                ) : (
                  <>
                    <option value="">Toda la materia</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Duración
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                onChange={(event) => setSize(event.target.value as QuizSize)}
                value={size}
              >
                <option value="SHORT">Corta</option>
                <option value="MEDIUM">Media</option>
                <option value="LONG">Larga</option>
              </select>
            </label>
          </div>

          {loadError && <ErrorPanel message={loadError} />}
        </>
      )}

      {!activeSubjectId ? (
        <EmptyPanel icon="?" message="Crea una materia para empezar." title="Sin materias" />
      ) : isGenerating ? (
        <LoadingPanel label="Generando quiz…" />
      ) : !quiz && !result ? (
        <EmptyPanel
          icon="?"
          ctaLabel="Generar quiz"
          message={`Crea un quiz de ${selectedSubjectName || "la materia seleccionada"} con tus preguntas.`}
          onCta={() => void handleGenerate()}
          title="Listo para estudiar"
        />
      ) : null}

      {!quiz && !result && activeSubjectId && (
        <QuizHistoryPanel
          error={historyError}
          isLoading={isHistoryLoading}
          onSelect={(summary) => void handleOpenDetail(summary)}
          quizzes={quizzes}
        />
      )}

      {quiz && !result && (
        <section className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{quiz.title}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {quiz.questions.length}{" "}
                {quiz.questions.length === 1 ? "pregunta" : "preguntas"} · responde todas para ver tu
                resultado
              </p>
            </div>
            <button
              className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              onClick={handleNewQuiz}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {loadError && <ErrorPanel message={loadError} />}

          {quiz.questions.map((question, questionIndex) => (
            <article
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              key={question.id}
            >
              <h3 className="text-sm font-bold">
                {questionIndex + 1}. {question.statement}
              </h3>
              {question.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Imagen servida por la API propia (MinIO/S3), sin optimizador
                <img
                  alt="Imagen de los apuntes usada en la pregunta"
                  className="mt-3 max-h-72 w-full rounded-xl border border-slate-100 bg-white object-contain"
                  src={assetUrl(question.imageUrl)}
                />
              )}
              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  return (
                    <label
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? "border-[#6d4aff] bg-[#f1eeff] font-semibold text-[#6d4aff]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                      key={option.id}
                    >
                      <input
                        checked={selected}
                        className="size-4 accent-[#6d4aff]"
                        name={`question-${question.id}`}
                        onChange={() =>
                          setAnswers((current) => ({ ...current, [question.id]: option.id }))
                        }
                        type="radio"
                      />
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}

          <button
            className="min-h-12 w-full rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !allAnswered}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? "Enviando…" : "Enviar respuestas"}
          </button>
          {!allAnswered && (
            <p className="text-center text-xs text-slate-400">
              Responde todas las preguntas para habilitar el envío.
            </p>
          )}
        </section>
      )}

      {quiz && result && (
        <section className="mt-6 space-y-5">
          <article className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tu resultado</p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight text-[#6d4aff]">
              {result.score}%
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {result.answers.filter((answer) => answer.isCorrect).length} de{" "}
              {result.answers.length} aciertos
            </p>
          </article>

          {quiz.questions.map((question, questionIndex) => {
            const feedback = result.answers.find(
              (answer) => answer.questionId === question.id
            );
            return (
              <QuizQuestionReview
                correctOptionId={feedback?.correctOptionId ?? null}
                explanation={feedback?.explanation ?? null}
                imageUrl={question.imageUrl}
                index={questionIndex + 1}
                isCorrect={Boolean(feedback?.isCorrect)}
                key={question.id}
                options={question.options}
                selectedOptionId={feedback?.selectedOptionId ?? null}
                statement={question.statement}
              />
            );
          })}

          <button
            className="min-h-12 w-full rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
            onClick={handleNewQuiz}
            type="button"
          >
            Nuevo quiz
          </button>
        </section>
      )}

      {isDetailOpen && (
        <QuizAttemptDetailDialog
          detail={detail}
          error={detailError}
          isLoading={isDetailLoading}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}