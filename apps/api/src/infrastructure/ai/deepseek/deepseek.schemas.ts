import { z } from "zod";

export class DeepSeekOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekOutputError";
  }
}

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
  extractedContent: z.string().nullable().optional()
});

export const generatedQuestionOptionSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean()
});

export const generatedQuestionSchema = z.object({
  statement: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  options: z.array(generatedQuestionOptionSchema).min(4).max(6)
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1)
});

export type MaterialAnalysisPayload = z.infer<typeof materialAnalysisSchema>;
export type GeneratedQuestionsPayload = z.infer<typeof generatedQuestionsSchema>;

export function parseModelJson<T>(schema: z.ZodType<T>, raw: string): T {
  const json = extractJson(raw);
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new DeepSeekOutputError(
      `Salida del modelo inválida: ${result.error.issues
        .map((issue) => issue.path.join(".") || "(raíz)")
        .join(", ")}`
    );
  }
  return result.data;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new DeepSeekOutputError("El modelo no devolvió un JSON válido.");
  }
}