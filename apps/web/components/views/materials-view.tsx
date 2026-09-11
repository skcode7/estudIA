"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listMaterials,
  listTopics,
  processMaterial,
  updateMaterial,
  type ApiMaterial,
  type ApiTopic,
  type ApiMaterialEditInput
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { MaterialEditDialog } from "../dialogs/material-edit-dialog";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../ui/state-panels";
import { MaterialStatusBadge } from "../ui/material-status-badge";

function materialIcon(type: ApiMaterial["type"]): string {
  return type === "TEXT" ? "✎" : type === "FILE" ? "📷" : "🔗";
}

export function MaterialsView({
  subjects,
  onSubjectMaterialsChange
}: {
  subjects: Subject[];
  onSubjectMaterialsChange: (subjectId: string) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [areTopicsLoading, setAreTopicsLoading] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [areMaterialsLoading, setAreMaterialsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<ApiMaterial | null>(null);

  const activeSubjectId = subjectId || subjects[0]?.id || "";

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    listTopics(activeSubjectId)
      .then((fetched) => {
        if (cancelled) return;
        setTopics(fetched);
        setTopicId((current) =>
          current && fetched.some((topic) => topic.id === current)
            ? current
            : (fetched[0]?.id ?? "")
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

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    listMaterials(topicId)
      .then((fetched) => {
        if (!cancelled) setMaterials(fetched);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No se pudieron cargar los materiales."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAreMaterialsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const selectedSubjectName = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId)?.name ?? "",
    [subjects, activeSubjectId]
  );

  const handleSubjectChange = useCallback((value: string) => {
    setSubjectId(value);
    setTopicId("");
    setTopics([]);
    setMaterials([]);
    setAreTopicsLoading(true);
    setAreMaterialsLoading(false);
    setLoadError("");
  }, []);

  const handleTopicChange = useCallback((value: string) => {
    setTopicId(value);
    setMaterials([]);
    setAreMaterialsLoading(true);
    setLoadError("");
  }, []);

  const handleProcess = useCallback(
    async (material: ApiMaterial) => {
      setProcessingId(material.id);
      try {
        const updated = await processMaterial(material.id);
        setMaterials((current) => current.map((m) => (m.id === updated.id ? updated : m)));
        onSubjectMaterialsChange(activeSubjectId);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "No se pudo procesar el material.");
        try {
          const refreshed = await listMaterials(material.topicId);
          setMaterials(refreshed);
        } catch {
          // El listado anterior se mantiene.
        }
      } finally {
        setProcessingId(null);
      }
    },
    [activeSubjectId, onSubjectMaterialsChange]
  );

  const handleSaveEdit = useCallback(
    async (id: string, input: ApiMaterialEditInput) => {
      const updated = await updateMaterial(id, input);
      setMaterials((current) => current.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMaterial(null);
      onSubjectMaterialsChange(activeSubjectId);
      return updated;
    },
    [activeSubjectId, onSubjectMaterialsChange]
  );

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Materiales</h1>
          <p className="mt-1 text-sm text-slate-500">
            Procesa tus apuntes con IA y revisa el estado de cada material.
          </p>
        </div>
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

        <label className="block text-sm font-semibold">
          Tema
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            disabled={!activeSubjectId || areTopicsLoading || topics.length === 0}
            onChange={(event) => handleTopicChange(event.target.value)}
            value={topicId}
          >
            {areTopicsLoading ? (
              <option>Cargando temas…</option>
            ) : topics.length === 0 ? (
              <option>Sin temas</option>
            ) : (
              topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {loadError && <ErrorPanel message={loadError} />}

      {areMaterialsLoading ? (
        <LoadingPanel label="Cargando materiales…" />
      ) : !activeSubjectId ? (
        <EmptyPanel icon="▤" message="Crea una materia para empezar." title="Sin materias" />
      ) : !topicId ? (
        <EmptyPanel
          icon="▤"
          message="Esta materia aún no tiene temas. Crea uno desde el diálogo de material."
          title="Sin tema seleccionado"
        />
      ) : materials.length === 0 ? (
        <EmptyPanel
          icon="📄"
          message="Usa el botón «Agregar material» para subir tus apuntes."
          title="Sin materiales"
        />
      ) : (
        <div className="mt-6 space-y-3">
          {materials.map((material) => {
            const isProcessing = processingId === material.id;
            const showProcess =
              material.processingStatus === "PENDING" || material.processingStatus === "FAILED";
            return (
              <article
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                key={material.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="text-xl">
                      {materialIcon(material.type)}
                    </span>
                    <h3 className="truncate text-sm font-bold">{material.title}</h3>
                    <MaterialStatusBadge status={material.processingStatus} />
                  </div>
                  {material.content && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500" title={material.content}>
                      {material.content}
                    </p>
                  )}
                  {material.processingStatus === "FAILED" && material.processingError && (
                    <p className="mt-1 text-xs font-medium text-rose-600" role="alert">
                      {material.processingError}
                    </p>
                  )}
                  {material.processingStatus === "COMPLETED" && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      {material.questionCount}{" "}
                      {material.questionCount === 1 ? "pregunta generada" : "preguntas generadas"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {showProcess && (
                    <button
                      className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isProcessing}
                      onClick={() => void handleProcess(material)}
                      type="button"
                    >
                      {isProcessing ? "Procesando…" : "✨ IA mode"}
                    </button>
                  )}
                  <button
                    className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                    onClick={() => setEditingMaterial(material)}
                    title="Editar"
                    type="button"
                  >
                    ✎
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingMaterial && (
        <MaterialEditDialog
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSaved={handleSaveEdit}
          subjectName={selectedSubjectName}
        />
      )}
    </>
  );
}