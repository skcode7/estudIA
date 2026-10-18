import { describe, expect, it } from "vitest";

import {
  generateQuestionsMessages,
  generateQuestionsSystemPrompt
} from "./deepseek.prompts";

describe("generateQuestionsSystemPrompt", () => {
  it("shares the common rules across modes", () => {
    const based = generateQuestionsSystemPrompt("BASED_ON_MATERIAL");
    const similar = generateQuestionsSystemPrompt("SIMILAR_QUESTIONS");

    for (const prompt of [based, similar]) {
      expect(prompt).toContain("Responde ÚNICAMENTE con un objeto JSON válido");
      expect(prompt).toContain("exactamente 4 opciones y exactamente 1 correcta");
      expect(prompt).toContain("No añadas explicaciones fuera del JSON");
    }
  });

  it("keeps the source-material rule for BASED_ON_MATERIAL", () => {
    const prompt = generateQuestionsSystemPrompt("BASED_ON_MATERIAL");

    expect(prompt).toContain("Basa las preguntas solo en el material proporcionado, nunca en conocimiento externo");
    expect(prompt).not.toContain("GUÍA DE EJERCICIOS");
  });

  it("swaps the source-material rule for the exercise-guide rule in SIMILAR_QUESTIONS", () => {
    const prompt = generateQuestionsSystemPrompt("SIMILAR_QUESTIONS");

    expect(prompt).toContain("GUÍA DE EJERCICIOS");
    expect(prompt).toContain("456 + 735 = 1191");
    expect(prompt).toContain("conocimiento general de la materia");
    expect(prompt).not.toContain("nunca en conocimiento externo");
  });
});

describe("generateQuestionsMessages", () => {
  const baseInput = {
    questionMode: "SIMILAR_QUESTIONS" as const,
    title: "Guía de sumas",
    content: "Contenido de la guía",
    analysis: {
      summary: "Resumen",
      concepts: ["suma"],
      objectives: ["practicar"]
    },
    count: 3
  };

  it("includes subject and topic names in the user context", () => {
    const messages = generateQuestionsMessages({
      ...baseInput,
      subjectName: "Matemáticas",
      topicName: "Álgebra"
    });

    const userMessage = messages.find((message) => message.role === "user");
    expect(userMessage).toBeDefined();
    expect(JSON.stringify(userMessage?.content)).toContain("Materia: Matemáticas");
    expect(JSON.stringify(userMessage?.content)).toContain("Tema: Álgebra");
  });

  it("omits subject/topic lines when names are absent", () => {
    const messages = generateQuestionsMessages({ ...baseInput });

    const userMessage = messages.find((message) => message.role === "user");
    expect(JSON.stringify(userMessage?.content)).not.toContain("Materia:");
    expect(JSON.stringify(userMessage?.content)).not.toContain("Tema:");
  });

  it("uses the system prompt for the requested mode", () => {
    const messages = generateQuestionsMessages({ ...baseInput });

    const systemMessage = messages.find((message) => message.role === "system");
    expect(JSON.stringify(systemMessage?.content)).toContain("GUÍA DE EJERCICIOS");
  });
});
