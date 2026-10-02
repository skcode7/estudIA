import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateQuiz } from "./api";

const SUBJECT_ID = "00000000-0000-0000-0000-000000000000";

describe("generateQuiz: el body debe llevar la duración elegida", () => {
  let body: string | undefined;

  beforeEach(() => {
    body = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        body = typeof init?.body === "string" ? init.body : undefined;
        return new Response(JSON.stringify({ id: "quiz-1", questions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["SHORT", "MEDIUM", "LONG"] as const)("envía size %s en el body", async (size) => {
    await generateQuiz({ subjectId: SUBJECT_ID, size });
    expect(JSON.parse(body!)).toEqual({ subjectId: SUBJECT_ID, size });
  });

  it("envía size junto al topicId", async () => {
    await generateQuiz({ subjectId: SUBJECT_ID, topicId: "topic-1", size: "LONG" });
    expect(JSON.parse(body!)).toEqual({ subjectId: SUBJECT_ID, topicId: "topic-1", size: "LONG" });
  });

  it("omite size cuando la vista no lo elige, para que la API aplique su defecto", async () => {
    await generateQuiz({ subjectId: SUBJECT_ID });
    expect(JSON.parse(body!)).toEqual({ subjectId: SUBJECT_ID });
  });
});
