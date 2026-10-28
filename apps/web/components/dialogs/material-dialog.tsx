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
  type ApiTopic,
  type MaterialQuestionMode
} from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError, WarningNote } from "../ui/feedback";
import { Icon } from "../ui/icon";

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
  preselectedTopicId,
  onClose,
  onCreated
}: {
  subjects: Subject[];
  preselectedSubjectId: string | null;
  preselectedTopicId?: string | null;
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
  const [pages, setPages] = useState<File[]>([]);
  const selectedFile = pages[0] ?? null;
  const [hasEmbeddedFigures, setHasEmbeddedFigures] = useState(false);
  const [questionMode, setQuestionMode] = useState<MaterialQuestionMode>("BASED_ON_MATERIAL");

  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractError, setExtractError] = useState("");
  const [extractSource, setExtractSource] = useState<ExtractSource | null>(null);
  const pendingTopicSuggestionRef = useRef<string | null>(null);
  const extractionSeqRef = useRef(0);
  const lastAttemptRef = useRef<
    { source: { kind: "file"; file: File } | { kind: "text"; text: string }; append: boolean } | null
  >(null);

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
        const preselected =
          preselectedTopicId && fetched.some((topic) => topic.id === preselectedTopicId)
            ? preselectedTopicId
            : undefined;
        setTopicId(match?.id ?? preselected ?? fetched[0]?.id ?? "");
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
  }, [subjectId, preselectedTopicId]);

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

  function applyDraft(draft: ApiMaterialDraft, source: ExtractSource, append: boolean): void {
    if (append) {
      // Foto adicional: solo se suma el texto extraído, sin tocar materia/tema/título.
      setHasEmbeddedFigures((current) => current || draft.hasEmbeddedFigures);
      if (source === "file" && draft.extractedContent) {
        const extracted = draft.extractedContent;
        setContent((current) => (current ? `${current}\n\n${extracted}` : extracted));
      }
      return;
    }

    setHasEmbeddedFigures(draft.hasEmbeddedFigures);
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
    source: { kind: "file"; file: File } | { kind: "text"; text: string },
    append = false
  ): Promise<void> {
    const seq = ++extractionSeqRef.current;
    lastAttemptRef.current = { source, append };
    setExtractSource(source.kind);
    setExtractStatus("extracting");
    setExtractError("");
    setSubmitError("");
    if (!append) {
      setHasEmbeddedFigures(false);
    }
    try {
      const draft = await analyzeMaterialDraft(
        source.kind === "file" ? { file: source.file } : { text: source.text }
      );
      if (seq !== extractionSeqRef.current) return;
      applyDraft(draft, source.kind, append);
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
    // Limpiar para permitir volver a capturar aunque el navegador reutilice el nombre.
    event.target.value = "";
    if (!file) return;
    const isAdditional = pages.length > 0;
    if (!isAdditional && !title.trim()) {
      setTitle(file.name);
    }
    setPages((current) => [...current, file]);
    void runExtraction({ kind: "file", file }, isAdditional);
  }

  function handleExtractFromText(): void {
    if (!content.trim() || isExtracting) return;
    void runExtraction({ kind: "text", text: content });
  }

  function handleRetryExtraction(): void {
    const last = lastAttemptRef.current;
    if (last) {
      void runExtraction(last.source, last.append);
      return;
    }
    if (extractSource === "file" && selectedFile) {
      void runExtraction({ kind: "file", file: selectedFile });
    } else if (content.trim()) {
      void runExtraction({ kind: "text", text: content });
    }
  }

  function handleResetPages(): void {
    extractionSeqRef.current++;
    lastAttemptRef.current = null;
    setPages([]);
    setContent("");
    setHasEmbeddedFigures(false);
    setExtractStatus("idle");
    setExtractError("");
    setExtractSource(null);
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
            content: content.trim() || undefined,
            hasEmbeddedFigures,
            questionMode
          })
        : await createMaterial({ topicId, title: finalTitle, content: content.trim(), questionMode });
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
    <Dialog onClose={onClose} title="Agregar material" wide>
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
              <Icon className="text-2xl text-[#6d4aff]" name="camera" />
              <span className="text-sm font-semibold text-[#6d4aff]">
                {pages.length > 1
                  ? `${pages.length} fotos agregadas`
                  : selectedFile
                    ? selectedFile.name
                    : "Toma una foto o sube un archivo"}
              </span>
              <span className="text-xs text-slate-500">
                {pages.length > 0
                  ? "Toma otra foto para agregar la siguiente página"
                  : "JPG, PNG, GIF o WebP · toma una foto con la cámara"}
              </span>
              <input
                accept={FILE_ACCEPT}
                className="sr-only"
                disabled={isExtracting}
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

            {pages.length > 0 && (
              <ul className="space-y-2">
                {pages.map((file, index) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    key={`${file.name}-${index}`}
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">Página {index + 1}:</span> {file.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {pages.length > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <WarningNote>
                  Las fotos adicionales aportan su texto. Solo la primera se guarda como imagen del
                  material.
                </WarningNote>
                <button
                  className="min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  onClick={handleResetPages}
                  type="button"
                >
                  Empezar de nuevo
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
                {showNewTopic ? (
                  "Cancelar nuevo tema"
                ) : (
                  <>
                    <Icon className="mr-1" name="add" /> Nuevo tema
                  </>
                )}
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

          <div className="space-y-2">
            <span className="block text-sm font-semibold">Cómo generar las preguntas</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className={`flex-1 min-h-12 rounded-xl border px-3 text-left text-sm transition ${
                  questionMode === "BASED_ON_MATERIAL"
                    ? "border-[#6d4aff] bg-[#f1eeff] font-semibold text-[#6d4aff]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                disabled={isExtracting}
                onClick={() => setQuestionMode("BASED_ON_MATERIAL")}
                type="button"
              >
                Basadas en el material
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Preguntas sobre el contenido cargado.
                </span>
              </button>
              <button
                className={`flex-1 min-h-12 rounded-xl border px-3 text-left text-sm transition ${
                  questionMode === "SIMILAR_QUESTIONS"
                    ? "border-[#6d4aff] bg-[#f1eeff] font-semibold text-[#6d4aff]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                disabled={isExtracting}
                onClick={() => setQuestionMode("SIMILAR_QUESTIONS")}
                type="button"
              >
                Preguntas similares
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Guía de ejercicios: misma estructura, datos nuevos.
                </span>
              </button>
            </div>
          </div>

          {!selectedFile && content.trim() && (
            <button
              className="min-h-11 rounded-xl bg-[#f1eeff] px-4 text-sm font-semibold text-[#6d4aff] hover:bg-[#e7e1ff] disabled:opacity-60"
              disabled={isExtracting}
              onClick={handleExtractFromText}
              type="button"
            >
              <Icon className="mr-1" name="sparkle" />
              Extraer con IA
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
