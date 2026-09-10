"use client";

import { useState } from "react";

import { type Subject } from "../../lib/subjects";
import type { SubjectFormValues } from "../../hooks/use-subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError } from "../ui/feedback";

export function SubjectDialog({
  mode,
  subject,
  isSubmitting,
  error,
  onCancel,
  onSubmit
}: {
  mode: "create" | "edit";
  subject?: Subject | null;
  isSubmitting: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [description, setDescription] = useState(subject?.description ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit({ name, description });
  }

  return (
    <Dialog onClose={onCancel} title={mode === "create" ? "Nueva materia" : "Editar materia"}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold" htmlFor="subject-name">
          Nombre de la materia
          <input
            autoFocus
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            id="subject-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Inglés"
            required
            value={name}
          />
        </label>
        <label className="block text-sm font-semibold" htmlFor="subject-description">
          Descripción (opcional)
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
            id="subject-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ej. Idioma moderno, nivel B2"
            value={description}
          />
        </label>
        {error && <FieldError>{error}</FieldError>}
        <DialogActions
          disabled={isSubmitting}
          onCancel={onCancel}
          submitLabel={
            isSubmitting
              ? mode === "create"
                ? "Creando…"
                : "Guardando…"
              : mode === "create"
                ? "Crear materia"
                : "Guardar cambios"
          }
        />
      </form>
    </Dialog>
  );
}