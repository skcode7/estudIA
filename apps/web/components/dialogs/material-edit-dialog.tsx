"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import {
  assetUrl,
  deleteMaterialQuestion,
  listMaterialImages,
  listMaterialQuestions,
  updateMaterialQuestion,
  type ApiMaterial,
  type ApiMaterialEditInput,
  type ApiMaterialImage,
  type ApiMaterialQuestion
} from "../../lib/api";
import { Dialog, DialogActions } from "./dialog";
import { FieldError, WarningNote } from "../ui/feedback";

type Tab = "questions" | "images";

type OptionDraft = { text: string; isCorrect: boolean };

export function MaterialEditDialog({
  material,
  subjectName,
  onClose,
  onSaved,
  onQuestionsChanged
}: {
  material: ApiMaterial;
  subjectName: string;
  onClose: () => void;
  onSaved: (id: string, input: ApiMaterialEditInput) => Promise<ApiMaterial>;
  onQuestionsChanged?: (questionCount: number) => void;
}) {
  const [title, setTitle] = useState(material.title);
  const [content, setContent] = useState(material.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [tab, setTab] = useState<Tab>("questions");
  const [questions, setQuestions] = useState<ApiMaterialQuestion[]>([]);
  const [images, setImages] = useState<ApiMaterialImage[]>([]);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [extrasError, setExtrasError] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftStatement, setDraftStatement] = useState("");
  const [draftExplanation, setDraftExplanation] = useState("");
  const [draftOptions, setDraftOptions] = useState<OptionDraft[]>([]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const [confirmingQuestionId, setConfirmingQuestionId] = useState<string | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  // Un material procesado con preguntas: editar su texto deja el pool viejo sin avisar a nadie.
  const hasQuestions = material.processingStatus === "COMPLETED" && material.questionCount > 0;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMaterialQuestions(material.id), listMaterialImages(material.id)])
      .then(([fetchedQuestions, fetchedImages]) => {
        if (cancelled) return;
        setQuestions(fetchedQuestions);
        setImages(fetchedImages);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setExtrasError(
            error instanceof Error ? error.message : "No se pudieron cargar preguntas e imágenes."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExtras(false);
      });
    return () => {
      cancelled = true;
    };
  }, [material.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) {
      setSaveError("El título es obligatorio.");
      return;
    }

    const input: ApiMaterialEditInput = {};
    if (finalTitle !== material.title) input.title = finalTitle;
    if (content.trim() !== (material.content ?? "")) input.content = content.trim();

    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      await onSaved(material.id, input);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el material.");
      setIsSaving(false);
    }
  }

  function startEdit(question: ApiMaterialQuestion): void {
    setEditingQuestionId(question.id);
    setConfirmingQuestionId(null);
    setQuestionError("");
    setDraftStatement(question.statement);
    setDraftExplanation(question.explanation ?? "");
    setDraftOptions(question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })));
  }

  function setCorrectOption(index: number): void {
    setDraftOptions((current) =>
      current.map((option, optionIndex) => ({ ...option, isCorrect: optionIndex === index }))
    );
  }

  async function handleSaveQuestion(question: ApiMaterialQuestion): Promise<void> {
    setIsSavingQuestion(true);
    setQuestionError("");
    try {
      const updated = await updateMaterialQuestion(material.id, question.id, {
        statement: draftStatement,
        explanation: draftExplanation.trim() || null,
        difficulty: question.difficulty,
        imageId: question.imageId,
        options: draftOptions
      });
      setQuestions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingQuestionId(null);
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : "No se pudo guardar la pregunta.");
    } finally {
      setIsSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(questionId: string): Promise<void> {
    setIsDeletingQuestion(true);
    setQuestionError("");
    try {
      await deleteMaterialQuestion(material.id, questionId);
      const next = questions.filter((item) => item.id !== questionId);
      setQuestions(next);
      setConfirmingQuestionId(null);
      setEditingQuestionId(null);
      onQuestionsChanged?.(next.length);
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : "No se pudo eliminar la pregunta.");
    } finally {
      setIsDeletingQuestion(false);
    }
  }

  return (
    <Dialog onClose={onClose} title={`Editando material de ${subjectName}`} wide>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block text-sm font-semibold" htmlFor="material-edit-title">
          Título
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            id="material-edit-title"
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            value={title}
          />
        </label>

        <label className="block text-sm font-semibold" htmlFor="material-edit-content">
          Contenido
          <textarea
            className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            id="material-edit-content"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Contenido del material…"
            value={content}
          />
        </label>

        {hasQuestions && (
          <WarningNote>
            Editar el contenido no actualiza las preguntas generadas. Para cambiar lo que se estudia,
            vuelve a procesar el material o corrige las preguntas a mano en la pestaña Preguntas. Si
            lo vuelves a procesar, la IA propondrá de nuevo el título.
          </WarningNote>
        )}

        {saveError && <FieldError>{saveError}</FieldError>}

        <DialogActions
          disabled={isSaving}
          onCancel={onClose}
          submitLabel={isSaving ? "Guardando…" : "Guardar cambios"}
        />
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="-mb-px flex gap-6 border-b border-slate-100">
          <button
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
              tab === "questions"
                ? "border-[#6d4aff] font-semibold text-[#6d4aff]"
                : "border-transparent font-medium text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab("questions")}
            type="button"
          >
            Preguntas
          </button>
          <button
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
              tab === "images"
                ? "border-[#6d4aff] font-semibold text-[#6d4aff]"
                : "border-transparent font-medium text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab("images")}
            type="button"
          >
            Imágenes
          </button>
        </div>

        {isLoadingExtras ? (
          <p className="pt-4 text-sm text-slate-500">Cargando…</p>
        ) : extrasError ? (
          <p className="pt-4 text-sm font-medium text-rose-600">{extrasError}</p>
        ) : tab === "questions" ? (
          <div className="space-y-3 pt-4">
            {questions.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay preguntas. Procesa el material con IA.</p>
            ) : (
              questions.map((question) => {
                const isEditing = editingQuestionId === question.id;
                const image = question.imageId
                  ? images.find((item) => item.id === question.imageId)
                  : undefined;
                return (
                  <article
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    key={question.id}
                  >
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
                        <p className="text-sm font-semibold">{question.statement}</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {question.options.map((option) => (
                            <li key={option.id}>
                              {option.isCorrect ? "✓ " : "○ "}
                              {option.text}
                            </li>
                          ))}
                        </ul>
                        {question.explanation && (
                          <p className="mt-2 text-xs text-slate-500">{question.explanation}</p>
                        )}
                        {question.imageId && (
                          <Image
                            alt={image?.label ?? "Figura de la pregunta"}
                            className="mt-3 max-h-32 w-auto rounded-xl border border-slate-200"
                            height={480}
                            src={assetUrl(`/materials/${material.id}/images/${question.imageId}`)}
                            unoptimized
                            width={640}
                          />
                        )}
                        {confirmingQuestionId === question.id ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-rose-600">
                              Se borrará esta pregunta. Si ya estaba en un quiz, también se perderán
                              esas respuestas. Esta acción no se puede deshacer.
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
                              ✎ Editar
                            </button>
                            <button
                              className="min-h-11 rounded-xl px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                setQuestionError("");
                                setConfirmingQuestionId(question.id);
                              }}
                              type="button"
                            >
                              ✕ Eliminar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            {images.length === 0 ? (
              <p className="text-sm text-slate-500">Este material no tiene figuras extraídas.</p>
            ) : (
              images.map((image) => (
                <figure className="rounded-2xl border border-slate-100 bg-slate-50 p-3" key={image.id}>
                  <Image
                    alt={image.label}
                    className="h-auto w-full rounded-xl"
                    height={480}
                    src={assetUrl(`/materials/${material.id}/images/${image.id}`)}
                    unoptimized
                    width={640}
                  />
                  <figcaption className="mt-2 text-xs font-medium text-slate-600">
                    {image.label}
                  </figcaption>
                </figure>
              ))
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
