import { z } from "zod";

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputError";
  }
}

export function parseModelJson<T>(schema: z.ZodType<T>, raw: string): T {
  const json = extractJson(raw);
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ModelOutputError(
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
    throw new ModelOutputError("El modelo no devolvió un JSON válido.");
  }
}
