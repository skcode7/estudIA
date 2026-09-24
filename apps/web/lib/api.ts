export interface ApiSubject {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  name: string;
  description?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string;
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
  questionCount: number;
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

  return (await response.json()) as T;
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
}): Promise<ApiMaterial> {
  const form = new FormData();
  form.set("topicId", input.topicId);
  form.set("file", input.file);
  if (input.title) form.set("title", input.title);
  if (input.content) form.set("content", input.content);
  if (input.hasEmbeddedFigures) form.set("hasEmbeddedFigures", "true");

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

export function listMaterials(topicId: string): Promise<ApiMaterial[]> {
  return request<ApiMaterial[]>(`/materials?topicId=${encodeURIComponent(topicId)}`);
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

export interface GenerateQuizInput {
  subjectId: string;
  topicId?: string;
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
  return request<ApiQuiz>("/quizzes/generate", {
    method: "POST",
    body: JSON.stringify({
      subjectId: input.subjectId,
      ...(input.topicId ? { topicId: input.topicId } : {})
    })
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