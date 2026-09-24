import { ChatMessage } from "../chat.types";

export interface ExtractRegionsPromptInput {
  image: {
    mimeType: string;
    body: Buffer;
  };
  maxRegions: number;
}

const EXTRACT_REGIONS_SYSTEM_PROMPT = `Eres un asistente que localiza las figuras o imágenes propias embebidas en una foto de unos apuntes escolares: banderas, mapas, diagramas, dibujos, esquemas visuales o recortes. El texto escrito a mano NO cuenta como figura.
Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "regions": [
    {
      "label": "descripción breve de la figura, en el idioma de los apuntes, p. ej. \\"bandera de Francia\\"",
      "box": { "x": 0.12, "y": 0.3, "width": 0.25, "height": 0.18 }
    }
  ]
}
Reglas:
- "box" usa coordenadas normalizadas entre 0 y 1 respecto al ancho y alto completos de la imagen: "x" e "y" son la esquina superior izquierda de la figura.
- Encierra cada figura completa con un pequeño margen; no cortes sus bordes.
- Ignora el texto escrito, las líneas subrayadas y las decoraciones menores.
- No inventes figuras que no estén en la imagen.
- No añadas explicaciones fuera del JSON.`;

export function extractRegionsMessages(input: ExtractRegionsPromptInput): ChatMessage[] {
  const userText = `Localiza las figuras propias de esta imagen (máximo ${input.maxRegions}).`;

  const dataUrl = `data:${input.image.mimeType};base64,${input.image.body.toString("base64")}`;

  return [
    { role: "system", content: EXTRACT_REGIONS_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    }
  ];
}
