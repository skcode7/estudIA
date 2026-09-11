"use client";

import { useState } from "react";

import { type ApiMaterial, type ApiMaterialEditInput } from "../../lib/api";
import { Dialog, DialogActions } from "./dialog";
import { FieldError } from "../ui/feedback";

export function MaterialEditDialog({
  material,
  subjectName,
  onClose,
  onSaved
}: {
  material: ApiMaterial;
  subjectName: string;
  onClose: () => void;
  onSaved: (id: string, input: ApiMaterialEditInput) => Promise<ApiMaterial>;
}) {
  const [title, setTitle] = useState(material.title);
  const [content, setContent] = useState(material.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  return (
    <Dialog onClose={onClose} title="Editar material">
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-xs text-slate-500">
          Editando el material de la materia <span className="font-semibold">{subjectName}</span>.
        </p>

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

        {saveError && <FieldError>{saveError}</FieldError>}

        <DialogActions
          disabled={isSaving}
          onCancel={onClose}
          submitLabel={isSaving ? "Guardando…" : "Guardar cambios"}
        />
      </form>
    </Dialog>
  );
}