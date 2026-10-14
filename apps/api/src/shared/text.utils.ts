/**
 * Compara respuestas escritas por el estudiante con las respuestas aceptadas.
 *
 * "París", "paris" y " PARIS " tienen que contar como la misma respuesta: en una
 * pregunta para completar el estudiante escribe a mano y no se le puede exigir
 * que respete tildes, mayúsculas ni espacios de más. También se igualan los
 * signos de puntuación para que "1191." sea "1191".
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[.,;:!?¡¿"'`´()[\]{}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

/** Una respuesta de relleno es correcta si coincide con alguna de las aceptadas. */
export function matchesAnyAnswer(answer: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  if (!normalized) {
    return false;
  }
  return accepted.some((candidate) => normalizeAnswer(candidate) === normalized);
}