import { z } from "zod";

const optionalIdField = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const materialAnalysisSchema = z.object({
  suggestedTitle: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  suggestedSubjectId: optionalIdField,
  suggestedTopicId: optionalIdField,
  summary: z.string().trim().min(1),
  concepts: z.array(z.string().trim().min(1)).default([]),
  objectives: z.array(z.string().trim().min(1)).default([]),
  extractedContent: z.string().nullable().optional(),
  hasEmbeddedFigures: z.boolean().default(false)
});

export const generatedQuestionOptionSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean()
});

export const generatedQuestionSchema = z.object({
  statement: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  imageIndex: z.number().int().min(0).max(50).optional(),
  options: z.array(generatedQuestionOptionSchema).min(4).max(6)
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1)
});

export const evaluationDraftSchema = z.object({
  suggestedTitle: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  suggestedSubjectId: optionalIdField,
  suggestedTopicId: optionalIdField
});

const extractedQuestionBase = {
  statement: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  imageIndex: z.number().int().min(0).max(50).optional()
};

/**
 * Cada tipo trae solo sus propios campos: así una respuesta de relleno no puede
 * inventarse opciones, ni una de opción múltiple una respuesta suelta.
 */
export const extractedEvaluationQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    ...extractedQuestionBase,
    type: z.literal("MULTIPLE_CHOICE"),
    options: z.array(generatedQuestionOptionSchema).min(2).max(6)
  }),
  z.object({
    ...extractedQuestionBase,
    type: z.literal("TRUE_FALSE"),
    answer: z.boolean()
  }),
  z.object({
    ...extractedQuestionBase,
    type: z.literal("FILL_BLANK"),
    answers: z.array(z.string().trim().min(1)).max(6)
  })
]);

export const extractedEvaluationQuestionsSchema = z.object({
  questions: z.array(extractedEvaluationQuestionSchema).min(1)
});

export type MaterialAnalysisPayload = z.infer<typeof materialAnalysisSchema>;
export type GeneratedQuestionsPayload = z.infer<typeof generatedQuestionsSchema>;
export type EvaluationDraftPayload = z.infer<typeof evaluationDraftSchema>;
export type ExtractedEvaluationQuestionsPayload = z.infer<
  typeof extractedEvaluationQuestionsSchema
>;
