import { describe, expect, it, vi } from "vitest";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRecord, EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationQuestionRecord, EvaluationQuestionRepository } from "../ports/evaluation-question.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";
import { UpdateEvaluationQuestionUseCase } from "./update-evaluation-question.use-case";

function evaluationRepositoryMock(): EvaluationRepository {
  return {
    create: vi.fn(),
    findByTopicIds: vi.fn(),
    findById: vi.fn(),
    updateProcessingStatus: vi.fn(),
    delete: vi.fn()
  };
}

function evaluationQuestionRepositoryMock(): EvaluationQuestionRepository {
  return {
    countByEvaluations: vi.fn(),
    replaceForEvaluation: vi.fn(),
    listByEvaluation: vi.fn(),
    findByIdForEvaluation: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function evaluationImageRepositoryMock(): EvaluationImageRepository {
  return {
    listByEvaluation: vi.fn(),
    createMany: vi.fn(),
    findById: vi.fn()
  };
}

function topicRepositoryMock(): TopicRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function baseEvaluation(): EvaluationRecord {
  return {
    id: "evaluation-1",
    topicId: "topic-1",
    title: "Examen",
    dateTaken: null,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function baseImage(): EvaluationImageRecord {
  return {
    id: "image-1",
    evaluationId: "evaluation-1",
    storageKey: "evaluations/evaluation-1/images/a.jpg",
    label: "Página 1",
    order: 0,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function baseQuestion(overrides: Partial<EvaluationQuestionRecord> = {}): EvaluationQuestionRecord {
  return {
    id: "question-1",
    topicId: "topic-1",
    sourceEvaluationId: "evaluation-1",
    type: "MULTIPLE_CHOICE",
    statement: "¿Cuánto es 456 + 735?",
    explanation: null,
    difficulty: "medium",
    evaluationImageId: "image-1",
    options: [
      { id: "option-1", text: "1191", isCorrect: true },
      { id: "option-2", text: "1179", isCorrect: false }
    ],
    ...overrides
  };
}

function setup() {
  const evaluations = evaluationRepositoryMock();
  const questions = evaluationQuestionRepositoryMock();
  const images = evaluationImageRepositoryMock();
  const topics = topicRepositoryMock();

  vi.mocked(evaluations.findById).mockResolvedValue(baseEvaluation());
  vi.mocked(images.findById).mockResolvedValue(baseImage());
  vi.mocked(topics.findById).mockImplementation(async (id: string) =>
    id === "topic-1"
      ? { id: "topic-1", subjectId: "subject-1", name: "Números", description: null, createdAt: new Date(), updatedAt: new Date() }
      : { id, subjectId: "subject-2", name: "Otro", description: null, createdAt: new Date(), updatedAt: new Date() }
  );
  vi.mocked(questions.findByIdForEvaluation).mockResolvedValue(baseQuestion());
  vi.mocked(questions.update).mockResolvedValue(baseQuestion());

  const useCase = new UpdateEvaluationQuestionUseCase(evaluations, questions, images, topics);
  return { evaluations, questions, images, topics, useCase };
}

describe("UpdateEvaluationQuestionUseCase", () => {
  it("updates the question and reclassifies it to another topic of the same subject", async () => {
    const { useCase, questions, topics } = setup();
    vi.mocked(topics.findById).mockResolvedValue({
      id: "topic-2",
      subjectId: "subject-1",
      name: "Fracciones",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await useCase.execute("evaluation-1", "question-1", {
      topicId: "topic-2",
      statement: "  ¿Cuánto es 456 + 735?  ",
      explanation: "   ",
      difficulty: "medium",
      evaluationImageId: "image-1",
      options: [
        { text: " 1191 ", isCorrect: true },
        { text: "1179", isCorrect: false }
      ]
    });

    expect(questions.update).toHaveBeenCalledWith("evaluation-1", "question-1", {
      topicId: "topic-2",
      type: "MULTIPLE_CHOICE",
      statement: "¿Cuánto es 456 + 735?",
      explanation: null,
      difficulty: "medium",
      evaluationImageId: "image-1",
      options: [
        { text: "1191", isCorrect: true },
        { text: "1179", isCorrect: false }
      ]
    });
    });
  });

  it("keeps the current topic when none is sent", async () => {
    const { useCase, questions, topics } = setup();

    await useCase.execute("evaluation-1", "question-1", {
      statement: "¿Cuánto es 456 + 735?",
      explanation: null,
      difficulty: "medium",
      evaluationImageId: null,
      options: [
        { text: "1191", isCorrect: true },
        { text: "1179", isCorrect: false }
      ]
    });

    expect(topics.findById).not.toHaveBeenCalled();
    expect(vi.mocked(questions.update).mock.calls[0]?.[2]).not.toHaveProperty("topicId");
  });

  it("rejects a topic from another subject", async () => {
    const { useCase, questions } = setup();

    await expect(
      useCase.execute("evaluation-1", "question-1", {
        topicId: "topic-9",
        statement: "¿Cuánto es 456 + 735?",
        explanation: null,
        difficulty: "medium",
        evaluationImageId: null,
        options: [
          { text: "1191", isCorrect: true },
          { text: "1179", isCorrect: false }
        ]
      })
    ).rejects.toThrow("no pertenece a la materia");
    expect(questions.update).not.toHaveBeenCalled();
  });

  it("rejects a question without exactly one correct option for multiple choice", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute("evaluation-1", "question-1", {
        statement: "¿Cuánto es 456 + 735?",
        explanation: null,
        difficulty: "medium",
        evaluationImageId: null,
        options: [
          { text: "1191", isCorrect: true },
          { text: "1179", isCorrect: true }
        ]
      })
    ).rejects.toThrow("exactamente una opción correcta");
  });

  it("rejects an image from another evaluation", async () => {
    const { useCase, images } = setup();
    vi.mocked(images.findById).mockResolvedValue({ ...baseImage(), evaluationId: "evaluation-9" });

    await expect(
      useCase.execute("evaluation-1", "question-1", {
        statement: "¿Cuánto es 456 + 735?",
        explanation: null,
        difficulty: "medium",
        evaluationImageId: "image-1",
        options: [
          { text: "1191", isCorrect: true },
          { text: "1179", isCorrect: false }
        ]
      })
    ).rejects.toThrow("no pertenece a la evaluación");
  });

  it("throws NotFoundException when the evaluation does not exist", async () => {
    const { useCase, evaluations } = setup();
    vi.mocked(evaluations.findById).mockResolvedValue(null);

    await expect(
      useCase.execute("missing", "question-1", {
        statement: "¿Cuánto es 456 + 735?",
        explanation: null,
        difficulty: "medium",
        evaluationImageId: null,
        options: [
          { text: "1191", isCorrect: true },
          { text: "1179", isCorrect: false }
        ]
      })
    ).rejects.toThrow('Evaluación con id "missing" no encontrada.');
  });