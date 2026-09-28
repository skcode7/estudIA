"use client";

import { type ApiMaterial } from "../../lib/api";
import { Dialog } from "./dialog";
import { FieldError } from "../ui/feedback";

export function MaterialDeleteDialog({
  material,
  isDeleting,
  error,
  onCancel,
  onConfirm
}: {
  material: ApiMaterial;
  isDeleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog onClose={onCancel} title="Eliminar material">
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          ¿Estás seguro de que quieres eliminar <strong>&quot;{material.title}&quot;</strong>? Se
          borrarán el material y sus archivos. Las preguntas ya generadas siguen en el tema. Esta
          acción no se puede deshacer.
        </p>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-3">
          <button
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
