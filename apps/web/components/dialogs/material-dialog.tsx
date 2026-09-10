"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createMaterial,
  createTopic,
  listTopics,
  uploadMaterial,
  type ApiTopic
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError } from "../ui/feedback";

type MaterialMode = "text" | "file";

const FILE_ACCEPT = "image/*,.pdf,.txt,.doc,.docx";

export function MaterialDialog({
  subjects,
  preselectedSubjectId,
  onClose,
  onCreated
}: {
  subjects: Subject[];
  preselectedSubjectId: string | null;
  onClose: () => void;
  onCreated: (subjectId: string, subjectName: string) => Promise<void>;
}) {
  const availableSubject = preselectedSubjectId ?? subjects[0]?.id ?? "";

const [subjectId, setSubjectId] = useState(availableSubject);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [areTopicsLoading, setAreTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");
  const [topicId, setTopicId] = useState("");

  const [mode, setMode] = useState<MaterialMode>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [topicCreateError, setTopicCreateError] = useState("");

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    listTopics(subjectId)
      .then((fetched) => {
        if (cancelled) return;
        setTopics(fetched);
        setTopicId(fetched[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTopicsError(error instanceof Error ? error.message : "No se pudieron cargar los temas.");
      })
      .finally(() => {
        if (!cancelled) setAreTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  );

  const handleSubjectChange = useCallback((value: string) => {
    setSubjectId(value);
    setTopicId("");
    setTopics([]);
    setTopicsError("");
    setAreTopicsLoading(true);
    setSubmitError("");
  }, []);

  async function handleCreateTopic(): Promise<void> {
    const name = newTopicName.trim();
    if (!name || !subjectId) return;
    setIsCreatingTopic(true);
    setTopicCreateError("");
    try {
      const created = await createTopic({ subjectId, name });
      setTopics((current) => [...current, created]);
      setTopicId(created.id);
      setNewTopicName("");
      setShowNewTopic(false);
    } catch (error) {
      setTopicCreateError(
        error instanceof Error ? error.message : "No se pudo crear el tema."
      );
    } finally {
      setIsCreatingTopic(false);
    }
  }

  function handleSelectFile(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !title.trim()) {
      setTitle(file.name);
    }
    setSubmitError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");

    if (!subjectId || !topicId) {
      setSubmitError("Selecciona una materia y un tema.");
      return;
    }
    const finalTitle = title.trim() || (mode === "file" ? selectedFile?.name ?? "" : "");
    if (!finalTitle) {
      setSubmitError("El título es obligatorio.");
      return;
    }
    if (mode === "text" && !content.trim()) {
      setSubmitError("Escribe el contenido que quieres estudiar.");
      return;
    }
    if (mode === "file" && !selectedFile) {
      setSubmitError("Selecciona una foto o un archivo.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "text") {
        await createMaterial({ topicId, title: finalTitle, content: content.trim() });
      } else {
        await uploadMaterial({ topicId, title: finalTitle, file: selectedFile! });
      }
      await onCreated(subjectId, selectedSubject?.name ?? "la materia");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo agregar el material.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onClose={onClose} title="Agregar material">
      {subjects.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Primero crea una materia para poder agregar material de estudio.
          </p>
          <div className="flex justify-end">
            <button
              className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
              onClick={onClose}
              type="button"
            >
              Aceptar
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold" htmlFor="material-subject">
            Materia
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
              id="material-subject"
              onChange={(event) => handleSubjectChange(event.target.value)}
              value={subjectId}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <label className="block text-sm font-semibold" htmlFor="material-topic">
              Tema
            </label>
            {areTopicsLoading ? (
              <p className="mt-2 text-sm text-slate-500">Cargando temas…</p>
            ) : topicsError ? (
              <p className="mt-2 text-sm text-rose-600">{topicsError}</p>
            ) : topics.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Esta materia aún no tiene temas. Crea el primero abajo.
              </p>
            ) : (
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="material-topic"
                onChange={(event) => setTopicId(event.target.value)}
                value={topicId}
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            )}

            {!areTopicsLoading && !topicsError && topics.length > 0 && (
              <button
                className="mt-2 text-sm font-semibold text-[#6d4aff] hover:underline"
                onClick={() => setShowNewTopic((current) => !current)}
                type="button"
              >
                {showNewTopic ? "Cancelar nuevo tema" : "+ Nuevo tema"}
              </button>
            )}

            {(showNewTopic || topics.length === 0) && !areTopicsLoading && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                    onChange={(event) => setNewTopicName(event.target.value)}
                    placeholder="Ej. Unidad 1"
                    value={newTopicName}
                  />
                  <button
                    className="min-h-12 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:opacity-60"
                    disabled={isCreatingTopic || !newTopicName.trim()}
                    onClick={() => void handleCreateTopic()}
                    type="button"
                  >
                    {isCreatingTopic ? "Creando…" : "Crear"}
                  </button>
                </div>
                {topicCreateError && (
                  <p className="text-sm font-medium text-rose-700" role="alert">
                    {topicCreateError}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["text", "file"] as const).map((option) => (
              <button
                className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${
                  mode === option
                    ? "bg-[#f1eeff] text-[#6d4aff]"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
                key={option}
                onClick={() => setMode(option)}
                type="button"
              >
                {option === "text" ? "✎ Texto" : "📷 Foto / archivo"}
              </button>
            ))}
          </div>

          {mode === "file" && (
            <label
              className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-dashed border-violet-300 bg-[#f8f7fc] px-4 text-sm font-semibold text-[#6d4aff]"
              htmlFor="material-file"
            >
              <span className="truncate pr-2">{selectedFile?.name ?? "Toma una foto o sube un archivo"}</span>
              <span aria-hidden="true">↑</span>
              <input
                accept={FILE_ACCEPT}
                capture="environment"
                className="sr-only"
                id="material-file"
                onChange={handleSelectFile}
                type="file"
              />
            </label>
          )}

          <label className="block text-sm font-semibold" htmlFor="material-title">
            Título
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
              id="material-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Apuntes de la unidad 1"
              value={title}
            />
          </label>

          {mode === "text" && (
            <label className="block text-sm font-semibold" htmlFor="material-content">
              Texto o apuntes
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="material-content"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Pega aquí el contenido que quieres estudiar…"
                value={content}
              />
            </label>
          )}

          {submitError && <FieldError>{submitError}</FieldError>}

          <DialogActions
            disabled={isSubmitting}
            onCancel={onClose}
            submitLabel={isSubmitting ? "Guardando…" : "Agregar material"}
          />
        </form>
      )}
    </Dialog>
  );
}