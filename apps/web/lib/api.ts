export interface ApiSubject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  materialsCount: number;
  progress: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface ApiTopic {
  id: string;
  subjectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicInput {
  subjectId: string;
  name: string;
  description?: string;
}

export type MaterialType = "TEXT" | "FILE" | "LINK";
export type MaterialProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type MaterialQuestionMode = "BASED_ON_MATERIAL" | "SIMILAR_QUESTIONS";

export interface ApiMaterial {
  id: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string | null;
  storageKey: string | null;
  hasEmbeddedFigures: boolean;
  processingStatus: MaterialProcessingStatus;
  processingError: string | null;
  questionMode: MaterialQuestionMode;
  questionCount: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMaterialEditInput {
  title?: string;
  content?: string;
}

export interface ApiMaterialDraft {
  suggestedSubjectId: string | null;
  suggestedTopicId: string | null;
  suggestedTitle: string | null;
  extractedContent: string | null;
  hasEmbeddedFigures: boolean;
}

export interface CreateMaterialInput {
  topicId: string;
  title: string;
  content: string;
  questionMode?: MaterialQuestionMode;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    return body.message ?? "Error inesperado del servidor.";
  } catch {
    return `Error inesperado (HTTP ${response.status}).`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function listSubjects(): Promise<ApiSubject[]> {
  return request<ApiSubject[]>("/subjects");
}

export function createSubject(input: CreateSubjectInput): Promise<ApiSubject> {
  return request<ApiSubject>("/subjects", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getSubject(id: string): Promise<ApiSubject> {
  return request<ApiSubject>(`/subjects/${id}`);
}

export function updateSubject(id: string, input: UpdateSubjectInput): Promise<ApiSubject> {
  return request<ApiSubject>(`/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteSubject(id: string): Promise<void> {
  return request<void>(`/subjects/${id}`, {
    method: "DELETE"
  });
}

export function listTopics(subjectId?: string): Promise<ApiTopic[]> {
  const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
  return request<ApiTopic[]>(`/topics${query}`);
}

export function createTopic(input: CreateTopicInput): Promise<ApiTopic> {
  return request<ApiTopic>("/topics", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createMaterial(input: CreateMaterialInput): Promise<ApiMaterial> {
  return request<ApiMaterial>("/materials", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function uploadMaterial(input: {
  topicId: string;
  file: File;
  title?: string;
  content?: string;
  hasEmbeddedFigures?: boolean;
  questionMode?: MaterialQuestionMode;
}): Promise<ApiMaterial> {
  const form = new FormData();
  form.set("topicId", input.topicId);
  form.set("file", input.file);
  if (input.title) form.set("title", input.title);
  if (input.content) form.set("content", input.content);
  if (input.hasEmbeddedFigures) form.set("hasEmbeddedFigures", "true");
  if (input.questionMode) form.set("questionMode", input.questionMode);

  return request<ApiMaterial>("/materials/upload", {
    method: "POST",
    body: form
  });
}

export function analyzeMaterialDraft(input: { file?: File; text?: string }): Promise<ApiMaterialDraft> {
  if (input.file) {
    const form = new FormData();
    form.set("file", input.file);
    return request<ApiMaterialDraft>("/materials/analyze", {
      method: "POST",
      body: form
    });
  }
  return request<ApiMaterialDraft>("/materials/analyze", {
    method: "POST",
    body: JSON.stringify({ text: input.text })
  });
}

export interface ApiMaterialsPage {
  items: ApiMaterial[];
  total: number;
}

export function listMaterials(
  topicId: string,
  options?: { limit?: number; offset?: number }
): Promise<ApiMaterialsPage> {
  const params = new URLSearchParams({ topicId });
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  return request<ApiMaterialsPage>(`/materials?${params.toString()}`);
}

export function processMaterial(id: string): Promise<ApiMaterial> {
  return request<ApiMaterial>(`/materials/${encodeURIComponent(id)}/process`, {
    method: "POST"
  });
}

export function updateMaterial(id: string, input: ApiMaterialEditInput): Promise<ApiMaterial> {
  return request<ApiMaterial>(`/materials/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteMaterial(id: string): Promise<void> {
  return request<void>(`/materials/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export interface ApiMaterialQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ApiMaterialQuestion {
  id: string;
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: ApiMaterialQuestionOption[];
}

export interface ApiMaterialQuestionEditInput {
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: Array<{ text: string; isCorrect: boolean }>;
}

export interface ApiMaterialImage {
  id: string;
  label: string;
  order: number;
}

export function listMaterialQuestions(materialId: string): Promise<ApiMaterialQuestion[]> {
  return request<ApiMaterialQuestion[]>(
    `/materials/${encodeURIComponent(materialId)}/questions`
  );
}

export function updateMaterialQuestion(
  materialId: string,
  questionId: string,
  input: ApiMaterialQuestionEditInput
): Promise<ApiMaterialQuestion> {
  return request<ApiMaterialQuestion>(
    `/materials/${encodeURIComponent(materialId)}/questions/${encodeURIComponent(questionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function deleteMaterialQuestion(materialId: string, questionId: string): Promise<void> {
  return request<void>(
    `/materials/${encodeURIComponent(materialId)}/questions/${encodeURIComponent(questionId)}`,
    {
      method: "DELETE"
    }
  );
}

export function listMaterialImages(materialId: string): Promise<ApiMaterialImage[]> {
  return request<ApiMaterialImage[]>(`/materials/${encodeURIComponent(materialId)}/images`);
}

export type EvaluationProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ApiEvaluation {
  id: string;
  subjectId: string;
  title: string;
  dateTaken: string | null;
  processingStatus: EvaluationProcessingStatus;
  processingError: string | null;
  imageCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export function createEvaluation(input: {
  subjectId: string;
  title: string;
  dateTaken?: string;
  files: File[];
}): Promise<ApiEvaluation> {
  const form = new FormData();
  form.set("subjectId", input.subjectId);
  form.set("title", input.title);
  if (input.dateTaken) form.set("dateTaken", input.dateTaken);
  // Varias fotos en el mismo campo: el backend las lee en orden de subida.
  for (const file of input.files) {
    form.append("files", file);
  }

  return request<ApiEvaluation>("/evaluations/upload", {
    method: "POST",
    body: form
  });
}

export function listEvaluations(subjectId: string): Promise<ApiEvaluation[]> {
  return request<ApiEvaluation[]>(`/evaluations?subjectId=${encodeURIComponent(subjectId)}`);
}

export function processEvaluation(id: string): Promise<ApiEvaluation> {
  return request<ApiEvaluation>(`/evaluations/${encodeURIComponent(id)}/process`, {
    method: "POST"
  });
}

export function deleteEvaluation(id: string): Promise<void> {
  return request<void>(`/evaluations/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export interface ApiEvaluationQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ApiEvaluationQuestion {
  id: string;
  topicId: string;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: ApiEvaluationQuestionOption[];
}

export interface ApiEvaluationQuestionEditInput {
  topicId?: string;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: Array<{ text: string; isCorrect: boolean }>;
}

export function listEvaluationQuestions(evaluationId: string): Promise<ApiEvaluationQuestion[]> {
  return request<ApiEvaluationQuestion[]>(
    `/evaluations/${encodeURIComponent(evaluationId)}/questions`
  );
}

export function updateEvaluationQuestion(
  evaluationId: string,
  questionId: string,
  input: ApiEvaluationQuestionEditInput
): Promise<ApiEvaluationQuestion> {
  return request<ApiEvaluationQuestion>(
    `/evaluations/${encodeURIComponent(evaluationId)}/questions/${encodeURIComponent(questionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function deleteEvaluationQuestion(
  evaluationId: string,
  questionId: string
): Promise<void> {
  return request<void>(
    `/evaluations/${encodeURIComponent(evaluationId)}/questions/${encodeURIComponent(questionId)}`,
    {
      method: "DELETE"
    }
  );
}

export interface ApiQuizOption {
  id: string;
  text: string;
}

export interface ApiQuizQuestion {
  id: string;
  statement: string;
  imageUrl: string | null;
  options: ApiQuizOption[];
}

/** Convierte una ruta relativa de asset de la API (p. ej. /materials/x/images/y) en URL absoluta. */
export function assetUrl(path: string): string {
  return `${API_URL}${path}`;
}

export interface ApiQuiz {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  questions: ApiQuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Duración del quiz. La API la traduce a un porcentaje del pool de preguntas
 * del alcance (30% / 50% / 70%). No es la dificultad de la pregunta.
 */
export type QuizSize = "SHORT" | "MEDIUM" | "LONG";

export interface GenerateQuizInput {
  subjectId: string;
  topicId?: string;
  size?: QuizSize;
}

export interface ApiQuizAnswerFeedback {
  questionId: string;
  statement: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface ApiQuizAttemptResult {
  attemptId: string;
  quizId: string;
  score: number;
  startedAt: string;
  completedAt: string;
  answers: ApiQuizAnswerFeedback[];
}

export interface SubmitQuizAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export function generateQuiz(input: GenerateQuizInput): Promise<ApiQuiz> {
  // Se serializa el input entero, campo a campo: reconstruir la lista a mano
  // aquí ya dejó fuera `size` una vez y la duración elegida se ignoraba en
  // silencio, con la API aplicando siempre su valor por defecto. `undefined`
  // no se serializa, así que los opcionales ausentes no viajan.
  return request<ApiQuiz>("/quizzes/generate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function submitQuizAnswers(
  quizId: string,
  startedAt: string,
  answers: SubmitQuizAnswerInput[]
): Promise<ApiQuizAttemptResult> {
  return request<ApiQuizAttemptResult>(`/quizzes/${encodeURIComponent(quizId)}/attempts`, {
    method: "POST",
    body: JSON.stringify({ startedAt, answers })
  });
}

/**
 * Item del historial de quizzes. `score` es null si el quiz nunca se respondió
 * (no es un 0%): en ese caso `attemptId` y `completedAt` también son null.
 * Con varios intentos, el que se informa es el más reciente.
 */
export interface ApiQuizSummary {
  id: string;
  title: string;
  topicId: string | null;
  topicName: string | null;
  questionCount: number;
  attemptId: string | null;
  score: number | null;
  completedAt: string | null;
  createdAt: string;
}

export function listQuizzes(subjectId: string): Promise<ApiQuizSummary[]> {
  return request<ApiQuizSummary[]>(`/quizzes?subjectId=${encodeURIComponent(subjectId)}`);
}

export interface ApiQuizOptionReview {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ApiQuizAttemptAnswer {
  questionId: string;
  statement: string;
  imageUrl: string | null;
  options: ApiQuizOptionReview[];
  selectedOptionId: string | null;
  isCorrect: boolean;
  explanation: string | null;
}

export interface ApiQuizAttemptDetail {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  completedAt: string;
  answers: ApiQuizAttemptAnswer[];
}

export function getQuizAttempt(
  quizId: string,
  attemptId: string
): Promise<ApiQuizAttemptDetail> {
  return request<ApiQuizAttemptDetail>(
    `/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}`
  );
}

export interface ApiUser {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function listUsers(): Promise<ApiUser[]> {
  return request<ApiUser[]>("/users");
}

export function createUser(input: { name: string }): Promise<ApiUser> {
  return request<ApiUser>("/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
}