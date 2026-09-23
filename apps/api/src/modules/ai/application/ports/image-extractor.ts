export interface ImageRegionBox {
  /** Coordenada X de la esquina superior izquierda, normalizada (0-1). */
  x: number;
  /** Coordenada Y de la esquina superior izquierda, normalizada (0-1). */
  y: number;
  /** Ancho de la región, normalizado (0-1) respecto al ancho de la imagen. */
  width: number;
  /** Alto de la región, normalizado (0-1) respecto al alto de la imagen. */
  height: number;
}

export interface ExtractedImageRegion {
  /** Descripción breve de la figura (p. ej. "bandera de Francia"), en el idioma del material. */
  label: string;
  box: ImageRegionBox;
}

export interface ExtractImageRegionsInput {
  image: {
    mimeType: string;
    body: Buffer;
  };
  /** Cantidad máxima de figuras a devolver. */
  maxRegions: number;
  /** Aproximación de figuras detectadas en el análisis previo (0 si se desconoce). */
  hintCount: number;
}

/**
 * Puerto del modelo "especialista" capaz de localizar figuras/imágenes propias
 * (banderas, mapas, diagramas…) embebidas en una foto de apuntes.
 */
export abstract class MaterialImageExtractor {
  /** Indica si hay un proveedor configurado (p. ej. OPENROUTER_API_KEY presente). */
  abstract isAvailable(): boolean;
  abstract extractRegions(input: ExtractImageRegionsInput): Promise<ExtractedImageRegion[]>;
}
