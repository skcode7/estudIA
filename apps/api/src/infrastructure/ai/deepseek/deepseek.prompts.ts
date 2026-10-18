export type { ChatMessage, UserContentBlock } from "../chat.types";
import type { ChatMessage } from "../chat.types";
import type { QuestionGenerationMode } from "../../../modules/ai/application/ports/ai-provider";

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
  questionMode: QuestionGenerationMode;
  title?: string;
  content: string;
  analysis: {
    summary: string;
    concepts: string[];
    objectives: string[];
  };
  count: number;
  subjectName?: string;
  topicName?: string;
  images?: {
    index: number;
    label: string;
  }[];
}

export interface AnalyzeEvaluationDraftPromptInput {
  images: {
    mimeType: string;
    body: Buffer;
  }[];
  catalog?: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
}

export interface ExtractEvaluationQuestionsPromptInput {
  subjectName: string;
  title?: string;
  images: {
    mimeType: string;
    body: Buffer;
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
  "suggestedTitle": "título corto y descriptivo inferido del contenido",
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
- "suggestedTitle": infiere SIEMPRE un título corto y descriptivo a partir del contenido del material; si el material incluye una imagen, usa el encabezado o el tema que se ve en ella. No lo dejes vacío y no copies el nombre del archivo.
- "suggestedSubjectId" y "suggestedTopicId": elige EXCLUSIVAMENTE ids de la lista de materias y temas incluida en el mensaje del usuario; si la lista no está, está vacía o ningún elemento encaja claramente con el contenido, responde null. Nunca inventes ids.
- "extractedContent": si el material es una imagen, transcribe íntegramente su texto; si es texto, copia el contenido tal cual.
- "hasEmbeddedFigures": true si DENTRO de los apuntes hay alguna figura o imagen propia (banderas, mapas, dibujos, diagramas, esquemas visuales); false si solo hay texto escrito. No hace falta contarlas.
- No añadas explicaciones fuera del JSON.`;

const GENERATE_QUESTIONS_INTRO = `Eres un asistente que genera preguntas de opción múltiple a partir de apuntes escolares.
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
Reglas:`;

const GENERATE_QUESTIONS_COMMON_RULES = `- Genera exactamente la cantidad de preguntas pedida.
- Cada pregunta: exactamente 4 opciones y exactamente 1 correcta.
- Usa el idioma del material.
- No repitas preguntas entre sí.
- "imageIndex" es opcional: inclúyelo solo en preguntas del tipo "¿A qué corresponde esta imagen?" cuando el mensaje incluya una lista de imágenes, usando el número exacto ("index") de esa lista. Nunca inventes números de imagen.
- Si el mensaje incluye imágenes, genera como máximo 2 preguntas sobre ellas; el resto sobre el texto.
- No añadas explicaciones fuera del JSON.`;

const GENERATE_QUESTIONS_BASED_MODE_RULES = `- Basa las preguntas solo en el material proporcionado, nunca en conocimiento externo.`;

const GENERATE_QUESTIONS_SIMILAR_MODE_RULES = `- El material es una GUÍA DE EJERCICIOS, no el contenido a preguntar: úsalo SOLO como referencia de la estructura, la mecánica y la dificultad de las preguntas.
- Genera preguntas NUEVAS con la misma estructura y mecánica que las del material, pero con enunciados y datos distintos.
- Nunca preguntes por los valores concretos del material: si la guía muestra "456 + 735 = 1191", no preguntes por ese resultado; genera otra suma de tres cifras con la misma mecánica.
- Usa conocimiento general de la materia para crear datos nuevos que sean verificables y tengan una única respuesta correcta.`;

/**
 * Construye el system prompt de generación de preguntas según el modo.
 * El bloque común (formato JSON, cantidad, 4 opciones/1 correcta, idioma,
 * imagen e index) es compartido; el bloque por modo cambia la regla de origen
 * de las preguntas (sobre el material o como guía de ejercicios).
 */
export function generateQuestionsSystemPrompt(mode: QuestionGenerationMode): string {
  const modeRules =
    mode === "SIMILAR_QUESTIONS"
      ? GENERATE_QUESTIONS_SIMILAR_MODE_RULES
      : GENERATE_QUESTIONS_BASED_MODE_RULES;
  return `${GENERATE_QUESTIONS_INTRO}\n${GENERATE_QUESTIONS_COMMON_RULES}\n${modeRules}`;
}

const ANALYZE_EVALUATION_DRAFT_SYSTEM_PROMPT = `Eres un asistente que identifica de qué trata una evaluación escolar a partir de sus fotos.
Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "suggestedTitle": "título corto y descriptivo de la evaluación",
  "suggestedSubjectId": "id de la materia de la lista proporcionada, o null si no hay match claro",
  "suggestedTopicId": "id del tema de la lista proporcionada, o null si no hay match claro"
}
Reglas:
- Usa el idioma de la evaluación.
- "suggestedTitle": usa el encabezado, el nombre de la unidad o el examen que aparezca en las fotos. No copies nombres de archivo ni inventes uno genérico.
- "suggestedSubjectId" y "suggestedTopicId": elige EXCLUSIVAMENTE ids de las materias y temas de la lista incluida en el mensaje del usuario; si la lista está vacía o nada encaja con claridad, responde null. Nunca inventes ids.
- No transcribas la evaluación ni extraigas preguntas aquí: solo clasifícala.
- No añadas explicaciones fuera del JSON.`;

const EXTRACT_EVALUATION_QUESTIONS_SYSTEM_PROMPT = `Eres un asistente que extrae las preguntas de una evaluación escolar a partir de las fotos que te mandan.
Responde ÚNICAMENTE con un objeto JSON válido. Usa EXACTAMENTE el formato del tipo que corresponda a cada pregunta:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "statement": "enunciado de la pregunta, transcrito tal como aparece",
      "explanation": "explicación breve de por qué esa es la respuesta correcta",
      "difficulty": "easy | medium | hard",
      "imageIndex": 0,
      "options": [
        { "text": "opción 1", "isCorrect": true },
        { "text": "opción 2", "isCorrect": false }
      ]
    },
    {
      "type": "TRUE_FALSE",
      "statement": "afirmación que se debe marcar como verdadera o falsa",
      "explanation": "explicación breve de por qué es verdadera o falsa",
      "difficulty": "easy | medium | hard",
      "imageIndex": 0,
      "answer": true
    },
    {
      "type": "FILL_BLANK",
      "statement": "enunciado con el hueco marcado como ____ y el resto tal como aparece",
      "explanation": "explicación breve de la respuesta esperada",
      "difficulty": "easy | medium | hard",
      "imageIndex": 0,
      "answers": ["respuesta esperada"]
    }
  ]
}
Reglas de tipo:
- "MULTIPLE_CHOICE": cuando la evaluación ofrece alternativas (A/B/C/D, o "señale la correcta" con opciones impresas). Entre 2 y 6 opciones y exactamente 1 con "isCorrect": true.
- "TRUE_FALSE": cuando la evaluación pide marcar si una afirmación es verdadera o falsa. Escribe la afirmación completa en "statement" y en "answer" solo true o false. No pongas "options".
- "FILL_BLANK": cuando hay que completar un espacio en blanco ("completar", "escribe el número que falta"). El hueco va siempre como ____ en "statement" y "answers" lleva la respuesta o respuestas aceptadas (1 a 6). Si la evaluación admite variantes ("parís" o "Paris"), inclúyelas todas. No pongas "options".

Reglas generales:
- Extrae TODAS las preguntas que se lean con claridad, sea cual sea su tipo. No omitas ninguna por no ser de opción múltiple.
- Transcribe enunciados y respuestas en el idioma de la evaluación. No inventes ni "corrijas" lo que dice el papel.
- Usa la clave de respuestas si la evaluación la incluye; si no la hay, dedúcela del enunciado y explica el porqué en "explanation".
- Si una pregunta no tiene respuesta verificable (por ejemplo, "explica por qué" o "describe el proceso"), omítela: solo entran preguntas que se pueden calificar.
- "difficulty": "easy" si es una recuperación directa o un ejercicio sencillo, "hard" si exige varios pasos o razonamiento.
- "imageIndex" es opcional: usa el número exacto ("index") de la foto donde aparece la pregunta, según la lista del mensaje. Nunca inventes números de imagen.
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
    input.subjectName ? `Materia: ${input.subjectName}` : null,
    input.topicName ? `Tema: ${input.topicName}` : null,
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
    { role: "system", content: generateQuestionsSystemPrompt(input.questionMode) },
    { role: "user", content: `Genera ${input.count} preguntas de opción múltiple.\n\n${context}` }
  ];
}

function imagesAsBlocks(
  images: { mimeType: string; body: Buffer }[]
): { type: "image_url"; image_url: { url: string } }[] {
  return images.map((image) => ({
    type: "image_url" as const,
    image_url: { url: `data:${image.mimeType};base64,${image.body.toString("base64")}` }
  }));
}

function imageListLines(count: number): string {
  return Array.from({ length: count }, (_, index) => `  - Foto [index: ${index}]`).join("\n");
}

export function analyzeEvaluationDraftMessages(
  input: AnalyzeEvaluationDraftPromptInput
): ChatMessage[] {
  const userText = [
    input.catalog && input.catalog.length > 0
      ? `Materias y temas disponibles:\n${catalogLines(input.catalog)}`
      : null,
    `Fotos de la evaluación, en orden:\n${imageListLines(input.images.length)}`,
    "¿De qué materia y tema es esta evaluación? Devuelve solo la clasificación y el título."
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: ANALYZE_EVALUATION_DRAFT_SYSTEM_PROMPT },
    { role: "user", content: [{ type: "text", text: userText }, ...imagesAsBlocks(input.images)] }
  ];
}

export function extractEvaluationQuestionsMessages(
  input: ExtractEvaluationQuestionsPromptInput
): ChatMessage[] {
  const userText = [
    `Materia: ${input.subjectName}`,
    input.title ? `Título de la evaluación: ${input.title}` : null,
    `Fotos de la evaluación, en orden:\n${imageListLines(input.images.length)}`,
    "Extrae todas las preguntas de la evaluación, de cualquier tipo."
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: EXTRACT_EVALUATION_QUESTIONS_SYSTEM_PROMPT },
    { role: "user", content: [{ type: "text", text: userText }, ...imagesAsBlocks(input.images)] }
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