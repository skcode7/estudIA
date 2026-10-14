import { BadRequestException } from "@nestjs/common";

import { EvaluationQuestionType } from "../ports/evaluation-question.repository";

export interface QuestionOptionDraft {
  text: string;
  isCorrect: boolean;
}

const MAX_OPTIONS = 6;

/**
 * Cada tipo admite una forma distinta de "respondible". Se valida aquí y no en
 * el controller para que el mismo caso de uso sirva al alta (viene del modelo)
 * y a la edición manual de la revisión.
 *
 * `FILL_BLANK` guarda sus respuestas aceptadas como opciones marcadas como
 * correctas: todas valen, y por eso se exige al menos una.
 */
export function assertValidQuestionOptions(
  type: EvaluationQuestionType,
  options: QuestionOptionDraft[]
): void {
  const texts = options.map((option) => option.text.trim());
  if (texts.some((text) => !text)) {
    throw new BadRequestException("Todas las opciones deben tener texto.");
  }

  const correctCount = options.filter((option) => option.isCorrect).length;

  if (type === "FILL_BLANK") {
    if (texts.length === 0 || texts.length > MAX_OPTIONS) {
      throw new BadRequestException(
        `La pregunta debe tener entre 1 y ${MAX_OPTIONS} respuestas aceptadas.`
      );
    }
    if (correctCount !== texts.length) {
      throw new BadRequestException(
        "En una pregunta para completar, todas las respuestas son correctas."
      );
    }
    return;
  }

  if (texts.length < 2 || texts.length > MAX_OPTIONS) {
    throw new BadRequestException(`La pregunta debe tener entre 2 y ${MAX_OPTIONS} opciones.`);
  }
  if (type === "TRUE_FALSE" && texts.length !== 2) {
    throw new BadRequestException("Una pregunta de verdadero/falso tiene exactamente dos opciones.");
  }
  if (correctCount !== 1) {
    throw new BadRequestException("La pregunta debe tener exactamente una opción correcta.");
  }
}
