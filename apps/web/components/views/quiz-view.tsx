"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  generateQuiz,
  listTopics,
  submitQuizAnswers,
  type ApiQuiz,
  type ApiQuizAttemptResult,
  type ApiTopic
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";

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
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoadError("");
    setIsGenerating(true);
    try {
      const created = await generateQuiz({
        subjectId: activeSubjectId,
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
  }, [activeSubjectId, topicId]);

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
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
            const correctOption = question.options.find(
              (option) => option.id === feedback?.correctOptionId
            );
            return (
              <article
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                key={question.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold">
                    {questionIndex + 1}. {question.statement}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      feedback?.isCorrect
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {feedback?.isCorrect ? "Correcta" : "Incorrecta"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {question.options.map((option) => {
                    const isCorrect = option.id === feedback?.correctOptionId;
                    const isSelected = option.id === feedback?.selectedOptionId;
                    const badge = isCorrect
                      ? " bg-emerald-50 text-emerald-700"
                      : isSelected
                      ? " bg-rose-50 text-rose-600"
                      : " text-slate-500";
                    return (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${badge} ${
                          isCorrect || isSelected ? "border-slate-200" : "border-transparent"
                        }`}
                        key={option.id}
                      >
                        {option.text}
                        {isCorrect && <span className="ml-2">✓ Respuesta correcta</span>}
                        {isSelected && !isCorrect && <span className="ml-2">Tu respuesta</span>}
                      </div>
                    );
                  })}
                </div>
                {feedback?.explanation && (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">Explicación: </span>
                    {feedback.explanation}
                  </p>
                )}
              </article>
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
    </>
  );
}