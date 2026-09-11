import { describe, expect, it } from "vitest";

import { toGeneratedQuestions, toMaterialAnalysis } from "./deepseek.mapper";
import { generatedQuestionsSchema, materialAnalysisSchema, parseModelJson } from "./deepseek.schemas";

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
        summary: "El cloro se usa para desinfectar el agua.",
        concepts: ["cloro", "desinfección"],
        objectives: ["Entender el uso del cloro"],
        extractedContent: "El cloro es un desinfectante común."
      });
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