"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import {
  assetUrl,
  deleteEvaluationQuestion,
  listEvaluationQuestions,
  updateEvaluationQuestion,
  type ApiEvaluation,
  type ApiEvaluationQuestion,
  type ApiTopic
} from "../../lib/api";
import { Dialog } from "./dialog";
import { FieldError, WarningNote } from "../ui/feedback";
import { Icon } from "../ui/icon";

type OptionDraft = { text: string; isCorrect: boolean };

export function EvaluationQuestionsDialog({
  evaluation,
  subjectName,
  topics,
  onClose,
  onQuestionsChanged
}: {
  evaluation: ApiEvaluation;
  subjectName: string;
  topics: ApiTopic[];
  onClose: () => void;
  onQuestionsChanged?: (questionCount: number) => void;
}) {
  const [questions, setQuestions] = useState<ApiEvaluationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftStatement, setDraftStatement] = useState("");
  const [draftExplanation, setDraftExplanation] = useState("");
  const [draftTopicId, setDraftTopicId] = useState("");
  const [draftOptions, setDraftOptions] = useState<OptionDraft[]>([]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const [confirmingQuestionId, setConfirmingQuestionId] = useState<string | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listEvaluationQuestions(evaluation.id)
      .then((fetched) => {
        if (!cancelled) setQuestions(fetched);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No se pudieron cargar las preguntas."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [evaluation.id]);

  function startEdit(question: ApiEvaluationQuestion): void {
    setEditingQuestionId(question.id);
    setConfirmingQuestionId(null);
    setQuestionError("");
    setDraftStatement(question.statement);
    setDraftExplanation(question.explanation ?? "");
    setDraftTopicId(question.topicId);
    setDraftOptions(
      question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect }))
    );
  }

  function setCorrectOption(index: number): void {
    setDraftOptions((current) =>
      current.map((option, optionIndex) => ({ ...option, isCorrect: optionIndex === index }))
    );
  }

  async function handleSaveQuestion(question: ApiEvaluationQuestion): Promise<void> {
    setIsSavingQuestion(true);
    setQuestionError("");
    try {
      const updated = await updateEvaluationQuestion(evaluation.id, question.id, {
        topicId: draftTopicId,
        statement: draftStatement,
        explanation: draftExplanation.trim() || null,
        difficulty: question.difficulty,
        evaluationImageId: question.evaluationImageId,
        options: draftOptions
      });
      setQuestions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingQuestionId(null);
    } catch (error) {
      setQuestionError(
        error instanceof Error ? error.message : "No se pudo guardar la pregunta."
      );
    } finally {
      setIsSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(questionId: string): Promise<void> {
    setIsDeletingQuestion(true);
    setQuestionError("");
    try {
      await deleteEvaluationQuestion(evaluation.id, questionId);
      const next = questions.filter((item) => item.id !== questionId);
      setQuestions(next);
      setConfirmingQuestionId(null);
      setEditingQuestionId(null);
      onQuestionsChanged?.(next.length);
    } catch (error) {
      setQuestionError(
        error instanceof Error ? error.message : "No se pudo eliminar la pregunta."
      );
    } finally {
      setIsDeletingQuestion(false);
    }
  }

  function topicNameOf(topicId: string): string {
    return topics.find((topic) => topic.id === topicId)?.name ?? "Tema desconocido";
  }

  return (
    <Dialog onClose={onClose} title={`Preguntas de ${evaluation.title} · ${subjectName}`} wide>
      <WarningNote>
        Estas preguntas se extrajeron con IA de tus fotos y ya están disponibles para los quizzes de
        la materia. Revisa el enunciado, la respuesta correcta y el tema antes de usarlas: si la IA
        no reconoció el tema, pudo dejarlas todas en el primero.
      </WarningNote>

      {isLoading ? (
        <p className="pt-4 text-sm text-slate-500">Cargando…</p>
      ) : loadError ? (
        <p className="pt-4 text-sm font-medium text-rose-600">{loadError}</p>
      ) : questions.length === 0 ? (
        <p className="pt-4 text-sm text-slate-500">
          Esta evaluación todavía no tiene preguntas. Procésala con IA para extraerlas.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {questions.map((question) => {
            const isEditing = editingQuestionId === question.id;
            return (
              <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={question.id}>
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">
                      Enunciado
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#6d4aff]"
                        onChange={(event) => setDraftStatement(event.target.value)}
                        value={draftStatement}
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Tema
                      <select
                        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d4aff]"
                        onChange={(event) => setDraftTopicId(event.target.value)}
                        value={draftTopicId}
                      >
                        {topics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold">
                      Explicación
                      <textarea
                        className="mt-2 min-h-16 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#6d4aff]"
                        onChange={(event) => setDraftExplanation(event.target.value)}
                        value={draftExplanation}
                      />
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Opciones</p>
                      {draftOptions.map((option, index) => (
                        <label className="flex items-center gap-2 text-sm" key={index}>
                          <input
                            checked={option.isCorrect}
                            name={`correct-${question.id}`}
                            onChange={() => setCorrectOption(index)}
                            type="radio"
                          />
                          <input
                            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d4aff]"
                            onChange={(event) =>
                              setDraftOptions((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, text: event.target.value } : item
                                )
                              )
                            }
                            value={option.text}
                          />
                        </label>
                      ))}
                    </div>
                    {questionError && <FieldError>{questionError}</FieldError>}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:opacity-60"
                        disabled={isSavingQuestion}
                        onClick={() => void handleSaveQuestion(question)}
                        type="button"
                      >
                        {isSavingQuestion ? "Guardando…" : "Guardar pregunta"}
                      </button>
                      <button
                        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-white"
                        onClick={() => setEditingQuestionId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{question.statement}</p>
                      <span className="rounded-full bg-[#f1eeff] px-2.5 py-0.5 text-xs font-semibold text-[#6d4aff]">
                        {topicNameOf(question.topicId)}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {question.options.map((option) => (
                        <li key={option.id}>
                          <Icon className="mr-1" name={option.isCorrect ? "check" : "unselected"} />
                          {option.isCorrect && <span className="sr-only">Respuesta correcta: </span>}
                          {option.text}
                        </li>
                      ))}
                    </ul>
                    {question.explanation && (
                      <p className="mt-2 text-xs text-slate-500">{question.explanation}</p>
                    )}
                    {question.evaluationImageId && (
                      <Image
                        alt="Foto de la que sale la pregunta"
                        className="mt-3 max-h-48 w-auto rounded-xl border border-slate-200"
                        height={480}
                        src={assetUrl(
                          `/evaluations/${evaluation.id}/images/${question.evaluationImageId}`
                        )}
                        unoptimized
                        width={640}
                      />
                    )}
                    {confirmingQuestionId === question.id ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-rose-600">
                          Se borrará esta pregunta. Si ya estaba en un quiz, también se perderán esas
                          respuestas. Esta acción no se puede deshacer.
                        </p>
                        {questionError && <FieldError>{questionError}</FieldError>}
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            disabled={isDeletingQuestion}
                            onClick={() => void handleDeleteQuestion(question.id)}
                            type="button"
                          >
                            {isDeletingQuestion ? "Eliminando…" : "Confirmar"}
                          </button>
                          <button
                            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-white"
                            onClick={() => setConfirmingQuestionId(null)}
                            type="button"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="min-h-11 rounded-xl bg-[#f1eeff] px-4 text-sm font-semibold text-[#6d4aff] hover:bg-[#e7e1ff]"
                          onClick={() => startEdit(question)}
                          type="button"
                        >
                          <Icon className="mr-1" name="edit" />
                          Editar
                        </button>
                        <button
                          className="min-h-11 rounded-xl px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setQuestionError("");
                            setConfirmingQuestionId(question.id);
                          }}
                          type="button"
                        >
                          <Icon className="mr-1" name="delete" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
