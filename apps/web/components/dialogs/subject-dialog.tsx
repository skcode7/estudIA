"use client";

import { useState } from "react";

import {
  FALLBACK_SUBJECT_COLOR,
  FALLBACK_SUBJECT_ICON,
  SUBJECT_COLORS,
  SUBJECT_COLOR_PALETTES,
  SUBJECT_ICONS,
  type SubjectColor
} from "../../lib/subjects";
import { type IconName } from "../../lib/icons";
import type { Subject } from "../../lib/subjects";
import type { SubjectFormValues } from "../../hooks/use-subjects";
import { Dialog, DialogActions } from "./dialog";
import { FieldError } from "../ui/feedback";
import { Icon } from "../ui/icon";

function coerceColor(value: string | undefined): SubjectColor {
  return (SUBJECT_COLORS as string[]).includes(value ?? "")
    ? (value as SubjectColor)
    : FALLBACK_SUBJECT_COLOR;
}

function coerceIcon(value: string | undefined): IconName {
  return (SUBJECT_ICONS as string[]).includes(value ?? "")
    ? (value as IconName)
    : FALLBACK_SUBJECT_ICON;
}

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
  const [color, setColor] = useState<SubjectColor>(coerceColor(subject?.color));
  const [icon, setIcon] = useState<IconName>(coerceIcon(subject?.icon));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit({ name, description, color, icon });
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

        <fieldset>
          <legend className="text-sm font-semibold">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((option) => {
              const palette = SUBJECT_COLOR_PALETTES[option];
              const isSelected = option === color;
              return (
                <button
                  aria-label={`Color ${option}`}
                  className={`grid size-9 place-items-center rounded-full outline-none ring-offset-2 transition ${
                    isSelected ? "ring-2 ring-[#6d4aff]" : "hover:opacity-80"
                  } ${palette.progressColor}`}
                  key={option}
                  onClick={() => setColor(option)}
                  type="button"
                >
                  <Icon className="text-lg text-white" name="check" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Ícono</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECT_ICONS.map((option) => {
              const palette = SUBJECT_COLOR_PALETTES[color];
              const isSelected = option === icon;
              return (
                <button
                  aria-label={`Ícono ${option}`}
                  className={`grid size-9 place-items-center rounded-xl text-lg transition ${
                    isSelected
                      ? `${palette.iconBackground} ring-2 ring-[#6d4aff]`
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  key={option}
                  onClick={() => setIcon(option)}
                  type="button"
                >
                  <Icon name={option} />
                </button>
              );
            })}
          </div>
        </fieldset>

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
