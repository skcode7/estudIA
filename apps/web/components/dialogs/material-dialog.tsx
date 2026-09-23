"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  analyzeMaterialDraft,
  createMaterial,
  createTopic,
  listTopics,
  uploadMaterial,
  type ApiMaterial,
  type ApiMaterialDraft,
  type ApiTopic
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError } from "../ui/feedback";

const FILE_ACCEPT = "image/*,.pdf,.txt,.doc,.docx";

export interface MaterialCreated {
  subjectId: string;
  subjectName: string;
  material: ApiMaterial;
}

type ExtractSource = "file" | "text";
type ExtractStatus = "idle" | "extracting" | "done" | "error";

export function MaterialDialog({
  subjects,
  preselectedSubjectId,
  onClose,
  onCreated
}: {
  subjects: Subject[];
  preselectedSubjectId: string | null;
  onClose: () => void;
  onCreated: (created: MaterialCreated) => Promise<void>;
}) {
  const availableSubject = preselectedSubjectId ?? subjects[0]?.id ?? "";

  const [subjectId, setSubjectId] = useState(availableSubject);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [areTopicsLoading, setAreTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");
  const [topicId, setTopicId] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractError, setExtractError] = useState("");
  const [extractSource, setExtractSource] = useState<ExtractSource | null>(null);
  const pendingTopicSuggestionRef = useRef<string | null>(null);
  const extractionSeqRef = useRef(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [topicCreateError, setTopicCreateError] = useState("");

  const isExtracting = extractStatus === "extracting";

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    listTopics(subjectId)
      .then((fetched) => {
        if (cancelled) return;
        setTopics(fetched);
        const pending = pendingTopicSuggestionRef.current;
        pendingTopicSuggestionRef.current = null;
        const match = pending ? fetched.find((topic) => topic.id === pending) : undefined;
        setTopicId(match?.id ?? fetched[0]?.id ?? "");
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

  function handleSubjectChange(value: string): void {
    pendingTopicSuggestionRef.current = null;
    setSubjectId(value);
    setTopicId("");
    setTopics([]);
    setTopicsError("");
    setAreTopicsLoading(true);
    setSubmitError("");
  }

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

  function applyDraft(draft: ApiMaterialDraft, source: ExtractSource): void {
    if (draft.suggestedTitle) {
      setTitle(draft.suggestedTitle);
    }
    if (source === "file" && draft.extractedContent) {
      setContent(draft.extractedContent);
    }

    const suggestedSubjectId =
      draft.suggestedSubjectId && subjects.some((subject) => subject.id === draft.suggestedSubjectId)
        ? draft.suggestedSubjectId
        : null;

    if (suggestedSubjectId && suggestedSubjectId !== subjectId) {
      pendingTopicSuggestionRef.current = draft.suggestedTopicId;
      setSubjectId(suggestedSubjectId);
      setTopicId("");
      setTopics([]);
      setTopicsError("");
      setAreTopicsLoading(true);
      return;
    }

    if (draft.suggestedTopicId) {
      const match = topics.find((topic) => topic.id === draft.suggestedTopicId);
      if (match) {
        setTopicId(match.id);
      } else if (areTopicsLoading) {
        pendingTopicSuggestionRef.current = draft.suggestedTopicId;
      }
    }
  }

  async function runExtraction(
    source: { kind: "file"; file: File } | { kind: "text"; text: string }
  ): Promise<void> {
    const seq = ++extractionSeqRef.current;
    setExtractSource(source.kind);
    setExtractStatus("extracting");
    setExtractError("");
    setSubmitError("");
    try {
      const draft = await analyzeMaterialDraft(
        source.kind === "file" ? { file: source.file } : { text: source.text }
      );
      if (seq !== extractionSeqRef.current) return;
      applyDraft(draft, source.kind);
      setExtractStatus("done");
    } catch (error) {
      if (seq !== extractionSeqRef.current) return;
      setExtractError(
        error instanceof Error ? error.message : "No se pudo extraer la información."
      );
      setExtractStatus("error");
    }
  }

  function handleSelectFile(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file) return;
    if (!title.trim()) {
      setTitle(file.name);
    }
    void runExtraction({ kind: "file", file });
  }

  function handleExtractFromText(): void {
    if (!content.trim() || isExtracting) return;
    void runExtraction({ kind: "text", text: content });
  }

  function handleRetryExtraction(): void {
    if (extractSource === "file" && selectedFile) {
      void runExtraction({ kind: "file", file: selectedFile });
    } else if (content.trim()) {
      void runExtraction({ kind: "text", text: content });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");

    if (!subjectId || !topicId) {
      setSubmitError("Selecciona una materia y un tema.");
      return;
    }
    const finalTitle = title.trim() || selectedFile?.name || "";
    if (!finalTitle) {
      setSubmitError("El título es obligatorio.");
      return;
    }
    if (!selectedFile && !content.trim()) {
      setSubmitError("Escribe el contenido que quieres estudiar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = selectedFile
        ? await uploadMaterial({
            topicId,
            title: finalTitle,
            file: selectedFile,
            content: content.trim() || undefined
          })
        : await createMaterial({ topicId, title: finalTitle, content: content.trim() });
      await onCreated({
        subjectId,
        subjectName: selectedSubject?.name ?? "la materia",
        material: created
      });
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
          <div className="space-y-2">
            <label
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-violet-300 bg-[#f8f7fc] px-4 py-5 text-center"
              htmlFor="material-file"
            >
              <span aria-hidden="true" className="text-2xl">📷</span>
              <span className="text-sm font-semibold text-[#6d4aff]">
                {selectedFile ? selectedFile.name : "Toma una foto o sube un archivo"}
              </span>
              <span className="text-xs text-slate-500">
                {selectedFile ? "Toca para cambiar el archivo" : "JPG, PNG, GIF o WebP · toma una foto con la cámara"}
              </span>
              <input
                accept={FILE_ACCEPT}
                className="sr-only"
                id="material-file"
                onChange={handleSelectFile}
                type="file"
              />
            </label>

            {isExtracting && (
              <p className="text-sm text-slate-500">Extrayendo información con IA…</p>
            )}
            {!isExtracting && extractStatus === "done" && (
              <p className="text-sm font-medium text-emerald-700">
                Información extraída con IA. Revisa y ajusta los campos.
              </p>
            )}
            {!isExtracting && extractStatus === "error" && (
              <div className="space-y-2">
                <FieldError>
                  {`${extractError || "No se pudo extraer la información."} Puedes completar los campos manualmente.`}
                </FieldError>
                <button
                  className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
                  onClick={handleRetryExtraction}
                  type="button"
                >
                  Reintentar extracción
                </button>
              </div>
            )}
          </div>

          <label className="block text-sm font-semibold" htmlFor="material-subject">
            Materia
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff] disabled:bg-slate-50"
              disabled={isExtracting}
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
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff] disabled:bg-slate-50"
                disabled={isExtracting}
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

          <label className="block text-sm font-semibold" htmlFor="material-title">
            Título
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff] disabled:bg-slate-50"
              disabled={isExtracting}
              id="material-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Apuntes de la unidad 1"
              value={title}
            />
          </label>

          <label className="block text-sm font-semibold" htmlFor="material-content">
            Texto o apuntes
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff] disabled:bg-slate-50"
              disabled={isExtracting}
              id="material-content"
              onChange={(event) => setContent(event.target.value)}
              placeholder="Pega aquí el contenido que quieres estudiar…"
              value={content}
            />
          </label>

          {!selectedFile && content.trim() && (
            <button
              className="min-h-11 rounded-xl bg-[#f1eeff] px-4 text-sm font-semibold text-[#6d4aff] hover:bg-[#e7e1ff] disabled:opacity-60"
              disabled={isExtracting}
              onClick={handleExtractFromText}
              type="button"
            >
              ✨ Extraer con IA
            </button>
          )}

          {submitError && <FieldError>{submitError}</FieldError>}

          <DialogActions
            disabled={isSubmitting || isExtracting}
            onCancel={onClose}
            submitLabel={isSubmitting ? "Guardando…" : "Agregar material"}
          />
        </form>
      )}
    </Dialog>
  );
}
