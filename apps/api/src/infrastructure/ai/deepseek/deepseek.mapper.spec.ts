import { describe, expect, it } from "vitest";

import { parseModelJson } from "../model-output";
import { toGeneratedQuestions, toMaterialAnalysis } from "./deepseek.mapper";
import { generatedQuestionsSchema, materialAnalysisSchema } from "./deepseek.schemas";

const ANALYSIS_FIXTURE = {
  suggestedTitle: "Cloro y desinfección",
  summary: "El cloro se usa para desinfectar el agua.",
  concepts: ["cloro", "desinfección"],
  objectives: ["Entender el uso del cloro"],
  extractedContent: "El cloro es un desinfectante común."
};

const QUESTIONS_FIXTURE = {
  questions: [
    {
      statement: "¿Para qué se usa el cloro?",
      explanation: "Para desinfectar el agua.",
      difficulty: "easy",
      options: [
        { text: "Desinfectar el agua", isCorrect: true },
        { text: "Endulzar el agua", isCorrect: false },
        { text: "Filtrar el aire", isCorrect: false },
        { text: "Calentar el agua", isCorrect: false }
      ]
    },
    {
      statement: "¿Cuál no es un uso del cloro?",
      difficulty: "medium",
      options: [
        { text: "Desinfección", isCorrect: false },
        { text: "Blanqueo", isCorrect: false },
        { text: "Generar energía", isCorrect: true },
        { text: "Tratamiento de agua", isCorrect: false }
      ]
    }
  ]
};

describe("deepseek.mapper", () => {
  describe("toMaterialAnalysis", () => {
    it("maps a valid analysis payload", () => {
      const result = toMaterialAnalysis(materialAnalysisSchema.parse(ANALYSIS_FIXTURE));

      expect(result).toEqual({
        suggestedTitle: "Cloro y desinfección",
        suggestedSubjectId: null,
        suggestedTopicId: null,
        summary: "El cloro se usa para desinfectar el agua.",
        concepts: ["cloro", "desinfección"],
        objectives: ["Entender el uso del cloro"],
        extractedContent: "El cloro es un desinfectante común.",
        embeddedFigureCount: 0
      });
    });

    it("maps the count of embedded figures", () => {
      const result = toMaterialAnalysis(
        materialAnalysisSchema.parse({ ...ANALYSIS_FIXTURE, embeddedFigureCount: 2 })
      );

      expect(result.embeddedFigureCount).toBe(2);
    });

    it("maps suggested subject and topic ids", () => {
      const result = toMaterialAnalysis(
        materialAnalysisSchema.parse({
          ...ANALYSIS_FIXTURE,
          suggestedSubjectId: "subject-1",
          suggestedTopicId: "topic-1"
        })
      );

      expect(result.suggestedSubjectId).toBe("subject-1");
      expect(result.suggestedTopicId).toBe("topic-1");
    });

    it("normalizes empty suggested ids to null", () => {
      const result = toMaterialAnalysis(
        materialAnalysisSchema.parse({
          ...ANALYSIS_FIXTURE,
          suggestedSubjectId: "",
          suggestedTopicId: ""
        })
      );

      expect(result.suggestedSubjectId).toBeNull();
      expect(result.suggestedTopicId).toBeNull();
    });

    it("defaults missing arrays to empty lists and suggestedTitle to undefined", () => {
      const result = toMaterialAnalysis(materialAnalysisSchema.parse({ summary: "Solo resumen." }));

      expect(result.suggestedTitle).toBeUndefined();
      expect(result.concepts).toEqual([]);
      expect(result.objectives).toEqual([]);
      expect(result.extractedContent).toBeNull();
    });
  });

  describe("toGeneratedQuestions", () => {
    it("maps valid questions and applies default difficulty", () => {
      const result = toGeneratedQuestions(generatedQuestionsSchema.parse(QUESTIONS_FIXTURE));
      const [first, second] = result;

      expect(result).toHaveLength(2);
      expect(first?.difficulty).toBe("easy");
      expect(second?.difficulty).toBe("medium");
      expect(second?.explanation).toBeUndefined();
      expect(first?.options).toHaveLength(4);
      expect(first?.options.filter((o) => o.isCorrect)).toHaveLength(1);
    });

    it("drops questions that do not have exactly one correct option", () => {
      const payload = generatedQuestionsSchema.parse({
        questions: [
          { statement: "sin correcta", options: [
            { text: "a", isCorrect: false }, { text: "b", isCorrect: false },
            { text: "c", isCorrect: false }, { text: "d", isCorrect: false }
          ] },
          { statement: "con correcta", options: [
            { text: "a", isCorrect: true }, { text: "b", isCorrect: false },
            { text: "c", isCorrect: false }, { text: "d", isCorrect: false }
          ] }
        ]
      });

      const result = toGeneratedQuestions(payload);
      const [question] = result;

      expect(result).toHaveLength(1);
      expect(question?.statement).toBe("con correcta");
    });

    it("maps the image index of image-based questions", () => {
      const payload = generatedQuestionsSchema.parse({
        questions: [
          {
            statement: "¿A qué corresponde esta imagen?",
            difficulty: "easy",
            imageIndex: 1,
            options: [
              { text: "Mapa de España", isCorrect: true },
              { text: "Bandera de Francia", isCorrect: false },
              { text: "Mapa de Portugal", isCorrect: false },
              { text: "Escudo de España", isCorrect: false }
            ]
          }
        ]
      });

      const [question] = toGeneratedQuestions(payload);

      expect(question?.imageIndex).toBe(1);
    });

    it("keeps imageIndex undefined for text-only questions", () => {
      const result = toGeneratedQuestions(generatedQuestionsSchema.parse(QUESTIONS_FIXTURE));

      expect(result[0]?.imageIndex).toBeUndefined();
    });
  });

  describe("parseModelJson", () => {
    it("parses JSON wrapped in markdown fences", () => {
      const raw = "```json\n" + JSON.stringify(ANALYSIS_FIXTURE) + "\n```";

      const result = parseModelJson(materialAnalysisSchema, raw);

      expect(result.summary).toBe("El cloro se usa para desinfectar el agua.");
    });

    it("throws when the raw output is not valid JSON", () => {
      expect(() => parseModelJson(materialAnalysisSchema, "no es json")).toThrow(
        "no devolvió un JSON válido"
      );
    });

    it("throws when the JSON does not match the schema", () => {
      expect(() =>
        parseModelJson(materialAnalysisSchema, JSON.stringify({ unexpected: true }))
      ).toThrow("Salida del modelo inválida");
    });
  });
});