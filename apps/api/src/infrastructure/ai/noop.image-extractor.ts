import {
  ExtractedImageRegion,
  MaterialImageExtractor
} from "../../modules/ai/application/ports/image-extractor";

/**
 * Implementación de respaldo cuando no hay un modelo especialista configurado
 * (falta OPENROUTER_API_KEY). No extrae figuras: el material se procesa
 * igualmente con preguntas de solo texto.
 */
export class NoopMaterialImageExtractor implements MaterialImageExtractor {
  isAvailable(): boolean {
    return false;
  }

  extractRegions(): Promise<ExtractedImageRegion[]> {
    return Promise.resolve([]);
  }
}
