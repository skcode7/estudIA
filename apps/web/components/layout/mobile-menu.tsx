"use client";

import { useEffect, useState } from "react";

import { type NavItemId } from "../../lib/navigation";
import { AddMaterialButton, BrandLockup, NavLinks, UserCard } from "./nav-shared";

export function MobileMenu({
  activeView,
  onNavigate,
  openMaterialDialog,
  userName
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
  openMaterialDialog: () => void;
  userName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  // El panel tapa la pantalla, pero sin esto el fondo sigue desplazándose detrás.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const navigate = (view: NavItemId) => {
    onNavigate(view);
    setIsOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandLockup onNavigate={navigate} textClassName="text-xl" />
          <button
            aria-controls="menu-movil"
            aria-expanded={isOpen}
            aria-label="Abrir menú"
            className="grid size-11 place-items-center rounded-xl text-2xl text-slate-600 hover:bg-slate-100"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            ☰
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div
            aria-modal="true"
            className="relative flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white p-4 shadow-xl"
            id="menu-movil"
            role="dialog"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="px-2 text-sm font-semibold text-slate-500">Menú</p>
              <button
                aria-label="Cerrar menú"
                className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <nav aria-label="Navegación principal" className="space-y-2">
              <NavLinks activeView={activeView} onNavigate={navigate} />
            </nav>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <AddMaterialButton
                onClick={() => {
                  setIsOpen(false);
                  openMaterialDialog();
                }}
              />
            </div>
            <UserCard className="mt-6" userName={userName} />
          </div>
        </div>
      )}
    </>
  );
}
