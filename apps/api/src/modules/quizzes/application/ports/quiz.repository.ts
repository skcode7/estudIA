export interface QuizOptionPresentation {
  id: string;
  text: string;
}

export type QuizQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";

export interface QuizQuestionPresentation {
  id: string;
  type: QuizQuestionType;
  statement: string;
  /** Imagen del enunciado (null si la pregunta no tiene imagen). */
  imageId: string | null;
  /** Material del que se extrajo la imagen (null si la pregunta no tiene imagen). */
  sourceMaterialId: string | null;
  /** Foto de la evaluación de la que sale la pregunta (null si viene de un material). */
  evaluationImageId: string | null;
  sourceEvaluationId: string | null;
  options: QuizOptionPresentation[];
}

export interface QuizRecord {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: QuizQuestionPresentation[];
}

export interface CreateQuizInput {
  title: string;
  subjectId: string;
  topicId?: string | null;
  questionIds: string[];
}

export interface QuizGradingOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizGradingQuestion {
  id: string;
  topicId: string;
  type: QuizQuestionType;
  statement: string;
  explanation: string | null;
  options: QuizGradingOption[];
}

export interface QuizGradingRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  questions: QuizGradingQuestion[];
}

export interface SaveAttemptAnswer {
  questionId: string;
  selectedOptionId?: string | null;
  /** Texto escrito por el estudiante en las preguntas para completar. */
  answerText?: string | null;
  isCorrect: boolean;
}

export interface SaveAttemptInput {
  quizId: string;
  startedAt: Date;
  completedAt: Date;
  score: number;
  answers: SaveAttemptAnswer[];
}

export interface QuizAttemptRecord {
  id: string;
  quizId: string;
  startedAt: Date;
  completedAt: Date;
  score: number;
}

export interface QuizAttemptSummary {
  id: string;
  score: number;
  completedAt: Date;
}

export interface QuizListItemRecord {
  id: string;
  title: string;
  topicId: string | null;
  topicName: string | null;
  questionCount: number;
  /**
   * Último intento completado (mayor `completedAt`). Null si el quiz nunca se
   * respondió: un quiz sin intento no tiene porcentaje, y mostrarlo como 0%
   * sería mentir. Cuando hay varios intentos se lista el más reciente, no el
   * mejor ni el promedio.
   */
  lastAttempt: QuizAttemptSummary | null;
  createdAt: Date;
}

export interface QuizAttemptDetailAnswer {
  questionId: string;
  statement: string;
  imageId: string | null;
  sourceMaterialId: string | null;
  evaluationImageId: string | null;
  sourceEvaluationId: string | null;
  options: QuizGradingOption[];
  selectedOptionId: string | null;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizAttemptDetailRecord {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  completedAt: Date;
  answers: QuizAttemptDetailAnswer[];
}

export abstract class QuizRepository {
  abstract findQuestionIdsByTopics(topicIds: string[]): Promise<string[]>;
  abstract createQuiz(input: CreateQuizInput): Promise<QuizRecord>;
  abstract findQuizForGrading(id: string): Promise<QuizGradingRecord | null>;
  abstract saveAttempt(input: SaveAttemptInput): Promise<QuizAttemptRecord>;
  /** Quizzes de una materia, más recientes primero, con su último intento completado. */
  abstract listBySubject(subjectId: string): Promise<QuizListItemRecord[]>;
  /**
   * Detalle de un intento ya enviado, para el repaso posterior. Devuelve `null`
   * si el intento no existe, no pertenece al quiz indicado, o está incompleto.
   */
  abstract findAttemptDetail(
    quizId: string,
    attemptId: string
  ): Promise<QuizAttemptDetailRecord | null>;
}
