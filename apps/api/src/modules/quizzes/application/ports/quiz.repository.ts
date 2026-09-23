export interface QuizOptionPresentation {
  id: string;
  text: string;
}

export interface QuizQuestionPresentation {
  id: string;
  statement: string;
  /** Imagen del enunciado (null si la pregunta no tiene imagen). */
  imageId: string | null;
  /** Material del que se extrajo la imagen (null si la pregunta no tiene imagen). */
  sourceMaterialId: string | null;
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
  selectedOptionId: string;
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

export abstract class QuizRepository {
  abstract findQuestionIdsByTopics(topicIds: string[]): Promise<string[]>;
  abstract createQuiz(input: CreateQuizInput): Promise<QuizRecord>;
  abstract findQuizForGrading(id: string): Promise<QuizGradingRecord | null>;
  abstract saveAttempt(input: SaveAttemptInput): Promise<QuizAttemptRecord>;
}