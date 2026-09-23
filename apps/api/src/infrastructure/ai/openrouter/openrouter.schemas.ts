import { z } from "zod";

/**
 * Coordenadas tolerantes: el modelo puede devolver valores normalizados (0-1)
 * o porcentuales (0-100); la normalización final la hace el mapper.
 */
const coordinateField = z.number().min(0).max(100);

const regionSchema = z.object({
  label: z.string().trim().min(1).max(160),
  box: z.object({
    x: coordinateField,
    y: coordinateField,
    width: z.number().min(0).max(100),
    height: z.number().min(0).max(100)
  })
});

export const extractedRegionsSchema = z.object({
  regions: z.array(regionSchema).max(20)
});

export type ExtractedRegionsPayload = z.infer<typeof extractedRegionsSchema>;
