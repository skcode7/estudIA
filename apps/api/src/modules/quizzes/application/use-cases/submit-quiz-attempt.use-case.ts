import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { QuizAttemptRecord, QuizGradingQuestion, QuizRepository } from "../ports/quiz.repository";

export interface SubmitQuizAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export interface SubmitQuizAttemptInput {
  quizId: string;
  startedAt: Date;
  answers: SubmitQuizAnswerInput[];
}

export interface QuizAnswerFeedback {
  questionId: string;
  statement: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface SubmitQuizAttemptResult {
  attempt: QuizAttemptRecord;
  answers: QuizAnswerFeedback[];
}

@Injectable()
export class SubmitQuizAttemptUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(input: SubmitQuizAttemptInput): Promise<SubmitQuizAttemptResult> {
    const quiz = await this.quizRepository.findQuizForGrading(input.quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz con id "${input.quizId}" no encontrado.`);
    }

    if (input.answers.length === 0) {
      throw new BadRequestException("Debes responder al menos una pregunta.");
    }
    if (input.answers.length !== quiz.questions.length) {
      throw new BadRequestException("Debes responder todas las preguntas del quiz.");
    }

    const questionsById = new Map(quiz.questions.map((question) => [question.id, question]));
    const answered = new Set<string>();
    const gradedAnswers: { questionId: string; selectedOptionId: string; isCorrect: boolean }[] = [];

    for (const answer of input.answers) {
      const question = questionsById.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(`La pregunta "${answer.questionId}" no pertenece al quiz.`);
      }
      if (answered.has(answer.questionId)) {
        throw new BadRequestException(`La pregunta "${answer.questionId}" está repetida.`);
      }
      const option = question.options.find((candidate) => candidate.id === answer.selectedOptionId);
      if (!option) {
        throw new BadRequestException(
          `La opción "${answer.selectedOptionId}" no pertenece a la pregunta "${answer.questionId}".`
        );
      }
      answered.add(answer.questionId);
      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect: option.isCorrect
      });
    }

    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;
    const score = Math.round((correctCount / gradedAnswers.length) * 100);
    const completedAt = new Date();

    const attempt = await this.quizRepository.saveAttempt({
      quizId: quiz.id,
      startedAt: input.startedAt,
      completedAt,
      score,
      answers: gradedAnswers
    });

    const feedback = quiz.questions.map((question) => buildFeedback(question, gradedAnswers));
    return { attempt, answers: feedback };
  }
}

function buildFeedback(
  question: QuizGradingQuestion,
  answers: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
): QuizAnswerFeedback {
  const answer = answers.find((candidate) => candidate.questionId === question.id);
  const correctOption = question.options.find((option) => option.isCorrect);
  return {
    questionId: question.id,
    statement: question.statement,
    selectedOptionId: answer?.selectedOptionId ?? "",
    correctOptionId: correctOption?.id ?? "",
    isCorrect: answer?.isCorrect ?? false,
    explanation: question.explanation
  };
}