export type { ChatMessage, UserContentBlock } from "../chat.types";
import type { ChatMessage } from "../chat.types";

export interface AnalyzePromptInput {
  title?: string;
  content: string;
  image?: {
    mimeType: string;
    body: Buffer;
  } | null;
  catalog?: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
}

export interface GenerateQuestionsPromptInput {
  title?: string;
  content: string;
  analysis: {
    summary: string;
    concepts: string[];
    objectives: string[];
  };
  count: number;
  images?: {
    index: number;
    label: string;
  }[];
}

export interface ExplainPromptInput {
  question: string;
  options: string[];
  correctOption: string;
  selectedOption?: string;
}

export interface HintPromptInput {
  question: string;
  options: string[];
}

const ANALYZE_SYSTEM_PROMPT = `Eres un asistente que ayuda a estudiantes a entender sus propios apuntes escolares.
Analiza el material proporcionado y responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "suggestedTitle": "título corto y descriptivo, opcional",
  "suggestedSubjectId": "id de la materia de la lista proporcionada, o null si no hay match claro",
  "suggestedTopicId": "id del tema de la lista proporcionada, o null si no hay match claro",
  "summary": "resumen breve de 1 a 3 oraciones",
  "concepts": ["concepto clave 1", "concepto clave 2"],
  "objectives": ["objetivo de aprendizaje 1"],
  "extractedContent": "texto completo de los apuntes",
  "hasEmbeddedFigures": false
}
Reglas:
- Usa el idioma del contenido.
- "suggestedTitle": ideal para el título del material; vacío si el material ya tiene uno claro.
- "suggestedSubjectId" y "suggestedTopicId": elige EXCLUSIVAMENTE ids de la lista de materias y temas incluida en el mensaje del usuario; si la lista no está, está vacía o ningún elemento encaja claramente con el contenido, responde null. Nunca inventes ids.
- "extractedContent": si el material es una imagen, transcribe íntegramente su texto; si es texto, copia el contenido tal cual.
- "hasEmbeddedFigures": true si DENTRO de los apuntes hay alguna figura o imagen propia (banderas, mapas, dibujos, diagramas, esquemas visuales); false si solo hay texto escrito. No hace falta contarlas.
- No añadas explicaciones fuera del JSON.`;

const GENERATE_QUESTIONS_SYSTEM_PROMPT = `Eres un asistente que genera preguntas de opción múltiple a partir de apuntes escolares.
Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "questions": [
    {
      "statement": "enunciado de la pregunta",
      "explanation": "explicación breve de la respuesta correcta",
      "difficulty": "easy | medium | hard",
      "imageIndex": 0,
      "options": [
        { "text": "opción 1", "isCorrect": true },
        { "text": "opción 2", "isCorrect": false },
        { "text": "opción 3", "isCorrect": false },
        { "text": "opción 4", "isCorrect": false }
      ]
    }
  ]
}
Reglas:
- Genera exactamente la cantidad de preguntas pedida.
- Cada pregunta: exactamente 4 opciones y exactamente 1 correcta.
- Basa las preguntas solo en el material proporcionado, nunca en conocimiento externo.
- Usa el idioma del material.
- No repitas preguntas entre sí.
- "imageIndex" es opcional: inclúyelo solo en preguntas del tipo "¿A qué corresponde esta imagen?" cuando el mensaje incluya una lista de imágenes, usando el número exacto ("index") de esa lista. Nunca inventes números de imagen.
- Si el mensaje incluye imágenes, genera como máximo 2 preguntas sobre ellas; el resto sobre el texto.
- No añadas explicaciones fuera del JSON.`;

const EXPLAIN_SYSTEM_PROMPT = `Eres un tutor que explica la respuesta correcta de una pregunta de opción múltiple.
Responde de forma clara y breve, basándote solo en la pregunta y sus opciones.
No uses conocimiento externo. Responde en el idioma de la pregunta.`;

const HINT_SYSTEM_PROMPT = `Eres un tutor que da una pista breve (sin dar la respuesta completa) para que el estudiante resuelva una pregunta de opción múltiple.
Basate solo en la pregunta y sus opciones. Responde en el idioma de la pregunta.`;

export function analyzeMessages(input: AnalyzePromptInput): ChatMessage[] {
  const userText = [
    input.title ? `Título del material: ${input.title}` : null,
    input.content ? `Contenido: ${input.content}` : null,
    input.catalog && input.catalog.length > 0 ? `Materias y temas disponibles:\n${catalogLines(input.catalog)}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: ANALYZE_SYSTEM_PROMPT }
  ];

  if (input.image) {
    const dataUrl = `data:${input.image.mimeType};base64,${input.image.body.toString("base64")}`;
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userText || "Analiza la imagen de los apuntes." },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    });
  } else {
    messages.push({ role: "user", content: userText });
  }

  return messages;
}

function catalogLines(catalog: NonNullable<AnalyzePromptInput["catalog"]>): string {
  return catalog
    .map((subject) => {
      const topics = subject.topics
        .map((topic) => `  - Tema: "${topic.name}" [id: ${topic.id}]`)
        .join("\n");
      return `- Materia: "${subject.name}" [id: ${subject.id}]${topics ? `\n${topics}` : ""}`;
    })
    .join("\n");
}

export function generateQuestionsMessages(input: GenerateQuestionsPromptInput): ChatMessage[] {
  const context = [
    input.title ? `Título: ${input.title}` : null,
    `Resumen: ${input.analysis.summary}`,
    input.analysis.concepts.length > 0 ? `Conceptos: ${input.analysis.concepts.join(", ")}` : null,
    input.analysis.objectives.length > 0 ? `Objetivos: ${input.analysis.objectives.join(", ")}` : null,
    `Contenido completo: ${input.content}`,
    input.images && input.images.length > 0
      ? `Imágenes disponibles para preguntas visuales:\n${input.images
          .map((image) => `  - Imagen [index: ${image.index}]: "${image.label}"`)
          .join("\n")}`
      : null
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: GENERATE_QUESTIONS_SYSTEM_PROMPT },
    { role: "user", content: `Genera ${input.count} preguntas de opción múltiple.\n\n${context}` }
  ];
}

export function explainMessages(input: ExplainPromptInput): ChatMessage[] {
  const context = [
    `Pregunta: ${input.question}`,
    `Opciones: ${input.options.join(" | ")}`,
    `Respuesta correcta: ${input.correctOption}`,
    input.selectedOption ? `Opción seleccionada por el estudiante: ${input.selectedOption}` : null
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: EXPLAIN_SYSTEM_PROMPT },
    { role: "user", content: `${context}\n\nExplica por qué es correcta y por qué las demás no lo son.` }
  ];
}

export function hintMessages(input: HintPromptInput): ChatMessage[] {
  const context = [`Pregunta: ${input.question}`, `Opciones: ${input.options.join(" | ")}`].join("\n");

  return [
    { role: "system", content: HINT_SYSTEM_PROMPT },
    { role: "user", content: `${context}\n\nDa una pista que ayude sin revelar la respuesta.` }
  ];
}