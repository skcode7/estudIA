"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type Subject } from "../../lib/subjects";
import { Icon } from "./icon";
import { SubjectCard } from "./subject-card";

/**
 * Grilla horizontal de tarjetas de materia con paginado lateral.
 *
 * Las tarjetas viven en un carril horizontal (`overflow-x`) y la paginación
 * avanza de un bloque de tarjetas al siguiente, nunca de una fila a otra.
 * El ancho de cada tarjeta es una fracción exacta del carril (1 en móvil,
 * 1/2 en `sm`, 1/3 en `lg`, 1/4 en `xl`), así que cada página ocupa
 * exactamente el ancho visible y los puntos de `scroll-snap` quedan
 * alineados con los saltos de página.
 */
export function SubjectCarousel({ subjects }: { subjects: Subject[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>("[data-carousel-card]");
    if (!firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    if (cardWidth <= 0) return;

    const visible = Math.max(1, Math.round(track.clientWidth / cardWidth));
    const pages = Math.max(1, Math.ceil(subjects.length / visible));

    setPerPage(visible);
    setTotalPages(pages);
    setPage((current) => Math.min(current, pages - 1));
  }, [subjects.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    measure();

    const handleScroll = () => {
      const width = track.clientWidth;
      if (width === 0) return;
      setPage(Math.round(track.scrollLeft / width));
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [measure]);

  const goToPage = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track) return;

      const clamped = Math.min(Math.max(target, 0), totalPages - 1);
      track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
      setPage(clamped);
    },
    [totalPages]
  );

  const missingSlots = totalPages * perPage - subjects.length;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={trackRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {subjects.map((subject, index) => (
          <div
            className="h-full w-full shrink-0 pr-4 sm:w-1/2 lg:w-1/3"
            data-carousel-card
            key={subject.id}
            style={{
              scrollSnapAlign: index % perPage === 0 ? "start" : "none"
            }}
          >
            <SubjectCard subject={subject} />
          </div>
        ))}

        {Array.from({ length: missingSlots }, (_, index) => (
          <div
            aria-hidden="true"
            className="h-full w-full shrink-0 pr-4 sm:w-1/2 lg:w-1/3"
            key={`spacer-${index}`}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Paginación de materias" className="flex items-center justify-between gap-3">
          <button
            className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page === 0}
            onClick={() => goToPage(page - 1)}
            type="button"
          >
            <Icon name="previous" />
            <span className="sr-only">Página anterior</span>
          </button>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages - 1}
            onClick={() => goToPage(page + 1)}
            type="button"
          >
            <Icon name="next" />
            <span className="sr-only">Página siguiente</span>
          </button>
        </nav>
      )}
    </div>
  );
}
