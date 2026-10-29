"use client";

import { useId, useState } from "react";

import { FieldError } from "../ui/feedback";
import { useModalBehavior } from "../../hooks/use-modal-behavior";

export function UserOnboardingDialog({
  isSaving,
  error,
  apiError,
  onRetry,
  onSubmit
}: {
  isSaving: boolean;
  error: string;
  apiError?: string;
  onRetry?: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const { modalRef, onKeyDown } = useModalBehavior({
    onClose: () => {},
    closeOnEscape: false
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit(name);
  }

  if (apiError) {
    return (
      <div
        ref={modalRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed inset-0 z-50 grid place-items-center bg-[#f8f7fc] p-6"
        role="dialog"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight" id={titleId}>
            Sin conexión
          </h2>
          <p className="mt-2 text-sm text-slate-500" id={descriptionId}>
            No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.
          </p>
          {apiError && <FieldError>{apiError}</FieldError>}
          <button
            className="mt-5 min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRetry?.()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#f8f7fc] p-6"
      role="dialog"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2
          className="text-xl font-bold tracking-tight"
          id={titleId}
        >
          ¡Hola!
        </h2>
        <p
          className="mt-2 text-sm text-slate-500"
          id={descriptionId}
        >
          Cuéntanos tu nombre para personalizar tu experiencia de estudio.
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold" htmlFor="user-name">
            ¿Cómo te llamas?
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
              id="user-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Alex"
              required
              value={name}
            />
          </label>
          {error && <FieldError>{error}</FieldError>}
          <button
            className="min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Guardando…" : "Comenzar"}
          </button>
        </form>
      </div>
    </div>
  );
}
