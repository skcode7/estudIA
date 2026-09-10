"use client";

import { type Subject } from "../../lib/subjects";
import { Dialog } from "./dialog";
import { FieldError } from "../ui/feedback";

export function DeleteSubjectDialog({
  subject,
  isDeleting,
  error,
  onCancel,
  onConfirm
}: {
  subject: Subject;
  isDeleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog onClose={onCancel} title="Eliminar materia">
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          ¿Estás seguro de que quieres eliminar <strong>&quot;{subject.name}&quot;</strong>? Esta
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