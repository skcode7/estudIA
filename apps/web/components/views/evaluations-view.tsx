"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteEvaluation,
  listEvaluations,
  listTopics,
  processEvaluation,
  type ApiEvaluation,
  type ApiTopic
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { EvaluationDialog } from "../dialogs/evaluation-dialog";
import { EvaluationQuestionsDialog } from "../dialogs/evaluation-questions-dialog";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
import { MaterialStatusBadge } from "../ui/material-status-badge";
import { Notice } from "../ui/feedback";

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function EvaluationsView({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [questionsOf, setQuestionsOf] = useState<ApiEvaluation | null>(null);
  const [deletingEvaluation, setDeletingEvaluation] = useState<ApiEvaluation | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const activeSubjectId = subjectId || subjects[0]?.id || "";

  // Igual que en Materiales: la carga vive en el efecto y avisa al listado con
  // su propio estado, sin setState síncrono dentro del cuerpo del efecto.
  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    Promise.all([listEvaluations(activeSubjectId), listTopics(activeSubjectId)])
      .then(([fetchedEvaluations, fetchedTopics]) => {
        if (cancelled) return;
        setEvaluations(fetchedEvaluations);
        setTopics(fetchedTopics);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No se pudieron cargar las evaluaciones."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId)?.name ?? "",
    [subjects, activeSubjectId]
  );

  function handleSubjectChange(value: string): void {
    setSubjectId(value);
    setEvaluations([]);
    setTopics([]);
    setNotice("");
    setLoadError("");
    setIsLoading(true);
  }

  const reload = useCallback(
    async (currentSubjectId: string): Promise<void> => {
      if (!currentSubjectId) return;
      try {
        const [fetchedEvaluations, fetchedTopics] = await Promise.all([
          listEvaluations(currentSubjectId),
          listTopics(currentSubjectId)
        ]);
        setEvaluations(fetchedEvaluations);
        setTopics(fetchedTopics);
        setLoadError("");
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "No se pudieron cargar las evaluaciones."
        );
      }
    },
    []
  );

  const handleProcess = useCallback(
    async (evaluation: ApiEvaluation) => {
      setProcessingId(evaluation.id);
      try {
        const updated = await processEvaluation(evaluation.id);
        setEvaluations((current) =>
          current.map((item) => (item.id === updated.id ? { ...updated, imageCount: item.imageCount } : item))
        );
        setNotice(
          updated.processingStatus === "COMPLETED"
            ? `Se extrajeron ${updated.questionCount} preguntas de "${updated.title}". Revísalas antes de usarlas en un quiz.`
            : `No se pudieron extraer las preguntas de "${updated.title}".`
        );
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "No se pudo procesar la evaluación."
        );
        void reload(activeSubjectId);
      } finally {
        setProcessingId(null);
      }
    },
    [activeSubjectId, reload]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingEvaluation) return;
    setConfirmingDelete(true);
    setDeleteError("");
    try {
      await deleteEvaluation(deletingEvaluation.id);
      setEvaluations((current) => current.filter((item) => item.id !== deletingEvaluation.id));
      setDeletingEvaluation(null);
      setNotice(
        deletingEvaluation.questionCount > 0
          ? `Se borró "${deletingEvaluation.title}". Sus ${deletingEvaluation.questionCount} preguntas siguen en el pool de la materia.`
          : `Se borró "${deletingEvaluation.title}".`
      );
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "No se pudo eliminar la evaluación."
      );
    } finally {
      setConfirmingDelete(false);
    }
  }, [deletingEvaluation]);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Evaluaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sube tus exámenes con IA para extraer preguntas y añadirlas a tus quizzes.
          </p>
        </div>
        <button
          className="min-h-12 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!activeSubjectId}
          onClick={() => setIsUploadOpen(true)}
          type="button"
        >
          + Agregar evaluación
        </button>
      </header>

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
      </div>

      {loadError && <ErrorPanel message={loadError} />}
      {notice && <Notice>{notice}</Notice>}

      {isLoading ? (
        <LoadingPanel label="Cargando evaluaciones…" />
      ) : !activeSubjectId ? (
        <EmptyPanel icon="▤" message="Crea una materia para empezar." title="Sin materias" />
      ) : evaluations.length === 0 ? (
        <EmptyPanel
          ctaLabel="+ Agregar evaluación"
          icon="📝"
          message="Sube las fotos de un examen o prueba de esta materia y extrae sus preguntas."
          onCta={() => setIsUploadOpen(true)}
          title="Sin evaluaciones"
        />
      ) : (
        <div className="mt-6 space-y-3">
          {evaluations.map((evaluation) => {
            const isProcessing = processingId === evaluation.id;
            const showProcess =
              evaluation.processingStatus === "PENDING" ||
              evaluation.processingStatus === "FAILED";
            const formattedDate = formatDate(evaluation.dateTaken);
            return (
              <article
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                key={evaluation.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="text-xl">
                      📝
                    </span>
                    <h3 className="truncate text-sm font-bold">{evaluation.title}</h3>
                    <MaterialStatusBadge status={evaluation.processingStatus} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      formattedDate,
                      `${evaluation.imageCount} ${evaluation.imageCount === 1 ? "foto" : "fotos"}`
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {evaluation.processingStatus === "FAILED" && evaluation.processingError && (
                    <p className="mt-1 text-xs font-medium text-rose-600" role="alert">
                      {evaluation.processingError}
                    </p>
                  )}
                  {evaluation.processingStatus === "COMPLETED" && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      {evaluation.questionCount}{" "}
                      {evaluation.questionCount === 1 ? "pregunta en el pool" : "preguntas en el pool"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {showProcess && (
                    <button
                      className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isProcessing}
                      onClick={() => void handleProcess(evaluation)}
                      type="button"
                    >
                      {isProcessing ? "Procesando…" : "Procesar"}
                    </button>
                  )}
                  <button
                    className="min-h-11 rounded-xl bg-[#f1eeff] px-4 text-sm font-semibold text-[#6d4aff] hover:bg-[#e7e1ff]"
                    onClick={() => setQuestionsOf(evaluation)}
                    type="button"
                  >
                    Ver preguntas
                  </button>
                  <button
                    className="min-h-11 rounded-xl px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setDeleteError("");
                      setDeletingEvaluation(evaluation);
                    }}
                    type="button"
                  >
                    ✕ Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isUploadOpen && (
        <EvaluationDialog
          onClose={() => setIsUploadOpen(false)}
          onCreated={async ({ evaluation, subjectName }) => {
            setIsUploadOpen(false);
            setNotice(`Evaluación añadida a ${subjectName}. Extrayendo preguntas…`);
            void reload(activeSubjectId);
            await handleProcess(evaluation);
          }}
          preselectedSubjectId={activeSubjectId}
          subjects={subjects}
        />
      )}

      {questionsOf && (
        <EvaluationQuestionsDialog
          evaluation={questionsOf}
          onClose={() => setQuestionsOf(null)}
          onQuestionsChanged={(questionCount) => {
            setEvaluations((current) =>
              current.map((item) =>
                item.id === questionsOf.id ? { ...item, questionCount } : item
              )
            );
          }}
          subjectName={selectedSubjectName}
          topics={topics}
        />
      )}

      {deletingEvaluation && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">Eliminar evaluación</h2>
            <p className="mt-3 text-sm text-slate-600">
              {`Se borrarán las fotos de "${deletingEvaluation.title}".`}
              {deletingEvaluation.questionCount > 0
                ? ` Sus ${deletingEvaluation.questionCount} preguntas seguirán en el pool de la materia, pero quedarán sin foto de referencia.`
                : ""}
            </p>
            {deleteError && (
              <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                disabled={confirmingDelete}
                onClick={() => {
                  setDeletingEvaluation(null);
                  setDeleteError("");
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={confirmingDelete}
                onClick={() => void handleConfirmDelete()}
                type="button"
              >
                {confirmingDelete ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
