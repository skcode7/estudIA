"use client";

import { useMemo, useState } from "react";

import { createEvaluation, type ApiEvaluation } from "../../lib/api";
import { type Subject } from "../../lib/subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError, WarningNote } from "../ui/feedback";

const IMAGE_ACCEPT = "image/*";
const MAX_FILES = 10;

export interface EvaluationCreated {
  subjectName: string;
  evaluation: ApiEvaluation;
}

export function EvaluationDialog({
  subjects,
  preselectedSubjectId,
  onClose,
  onCreated
}: {
  subjects: Subject[];
  preselectedSubjectId: string | null;
  onClose: () => void;
  onCreated: (created: EvaluationCreated) => Promise<void>;
}) {
  const [subjectId, setSubjectId] = useState(preselectedSubjectId ?? subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dateTaken, setDateTaken] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId),
    [subjects, subjectId]
  );

  function handleFilesChange(next: FileList | null): void {
    if (!next) return;
    // El input se reutiliza: si el usuario quita todo, hay que vaciar el estado.
    setFiles(Array.from(next).slice(0, MAX_FILES));
  }

  function removeFile(index: number): void {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) {
      setSubmitError("El título es obligatorio.");
      return;
    }
    if (files.length === 0) {
      setSubmitError("Sube al menos una foto de la evaluación.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const evaluation = await createEvaluation({
        subjectId,
        title: finalTitle,
        ...(dateTaken ? { dateTaken } : {}),
        files
      });
      await onCreated({ subjectName: selectedSubject?.name ?? "", evaluation });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo subir la evaluación."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onClose={onClose} title="Subir una evaluación">
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block text-sm font-semibold">
          Materia
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            disabled={subjects.length === 0}
            onChange={(event) => setSubjectId(event.target.value)}
            value={subjectId}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Título
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Examen de la unidad 1"
            value={title}
          />
        </label>

        <label className="block text-sm font-semibold">
          Fecha <span className="font-normal text-slate-500">(opcional)</span>
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            onChange={(event) => setDateTaken(event.target.value)}
            type="date"
            value={dateTaken}
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Fotos</p>
          <input
            accept={IMAGE_ACCEPT}
            aria-label="Fotos de la evaluación"
            className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[#f1eeff] file:px-4 file:text-sm file:font-semibold file:text-[#6d4aff] hover:file:bg-[#e7e1ff]"
            multiple
            onChange={(event) => handleFilesChange(event.target.files)}
            type="file"
          />
          <p className="text-xs text-slate-500">
            Sube las páginas en orden de lectura (hasta {MAX_FILES}). Se procesan con IA al añadir la
            evaluación.
          </p>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                  key={`${file.name}-${index}`}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">Página {index + 1}:</span> {file.name}
                  </span>
                  <button
                    aria-label={`Quitar ${file.name}`}
                    className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    onClick={() => removeFile(index)}
                    type="button"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {files.length === MAX_FILES && (
            <WarningNote>{`Solo se guardan las primeras ${MAX_FILES} fotos de esta evaluación.`}</WarningNote>
          )}
        </div>

        {submitError && <FieldError>{submitError}</FieldError>}

        <DialogActions
          disabled={isSubmitting}
          onCancel={onClose}
          submitLabel={isSubmitting ? "Subiendo…" : "Subir y procesar"}
        />
      </form>
    </Dialog>
  );
}
