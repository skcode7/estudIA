"use client";

import { useEffect, useState } from "react";

import { type ApiLastPractice, getLastPractice } from "../lib/api";

/**
 * Última práctica del estudiante. Devuelve null mientras carga o si la
 * consulta falla: en ese caso no se muestra un dato que no se pudo verificar.
 */
export function useLastPractice(enabled: boolean): ApiLastPractice | null {
  const [lastPractice, setLastPractice] = useState<ApiLastPractice | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getLastPractice()
      .then((result) => {
        if (!cancelled) setLastPractice(result);
      })
      .catch(() => {
        if (!cancelled) setLastPractice(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return lastPractice;
}
