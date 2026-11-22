const DAY_MS = 24 * 60 * 60 * 1000;
const STEADY_FROM_DAYS = 5;
const LAPSED_AFTER_DAYS = 15;

export type PracticeTone = "fresh" | "steady" | "lapsed" | "none";

export interface PracticeStatus {
  tone: PracticeTone;
  /** Días completos de 24 h desde el último intento. Null si nunca se practicó. */
  days: number | null;
}

/**
 * Clasifica el tiempo desde el último quiz completado en bloques de 24 h:
 * menos de 5 días es "fresh", de 5 a 15 "steady" y más de 15 "lapsed".
 */
export function practiceStatus(completedAt: string | null, now: Date): PracticeStatus {
  if (completedAt === null) {
    return { tone: "none", days: null };
  }
  const elapsed = Math.max(0, now.getTime() - new Date(completedAt).getTime());
  const days = Math.floor(elapsed / DAY_MS);
  if (days < STEADY_FROM_DAYS) {
    return { tone: "fresh", days };
  }
  if (days <= LAPSED_AFTER_DAYS) {
    return { tone: "steady", days };
  }
  return { tone: "lapsed", days };
}

export function practiceLabel(status: PracticeStatus): string {
  if (status.days === null) {
    return "Aún no practicas";
  }
  if (status.days === 0) {
    return "Practicaste hace menos de 1 día";
  }
  return `${status.days} ${status.days === 1 ? "día" : "días"} sin practicar`;
}
