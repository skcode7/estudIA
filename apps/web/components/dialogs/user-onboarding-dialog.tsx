"use client";

import { useState } from "react";

import { FieldError } from "../ui/feedback";

export function UserOnboardingDialog({
  isSaving,
  error,
  onSubmit
}: {
  isSaving: boolean;
  error: string;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit(name);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#f8f7fc] p-6"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">¡Hola! 👋</h2>
        <p className="mt-2 text-sm text-slate-500">
          Cuéntanos tu nombre para personalizar tu experiencia de estudio.
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold" htmlFor="user-name">
            ¿Cómo te llamas?
            <input
              autoFocus
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