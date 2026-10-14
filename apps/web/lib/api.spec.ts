import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEvaluation, generateQuiz } from "./api";

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

describe("createEvaluation: las fotos viajan en el mismo campo", () => {
  let sentBody: FormData | undefined;
  let sentPath: string | undefined;

  beforeEach(() => {
    sentBody = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        sentPath = String(input);
        sentBody = init?.body instanceof FormData ? init.body : undefined;
        return new Response(JSON.stringify({ id: "evaluation-1", files: [] }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envía todas las fotos en el campo \"files\", en orden", async () => {
    const files = [
      new File(["a"], "pagina1.jpg", { type: "image/jpeg" }),
      new File(["b"], "pagina2.jpg", { type: "image/jpeg" })
    ];

    await createEvaluation({ subjectId: SUBJECT_ID, title: "Examen", dateTaken: "2026-05-14", files });

    expect(sentPath).toContain("/evaluations/upload");
    expect(sentBody?.getAll("files")).toEqual(files);
    expect(sentBody?.get("subjectId")).toBe(SUBJECT_ID);
    expect(sentBody?.get("title")).toBe("Examen");
    expect(sentBody?.get("dateTaken")).toBe("2026-05-14");
  });

  it("omite la fecha cuando no se indica", async () => {
    await createEvaluation({
      subjectId: SUBJECT_ID,
      title: "Examen",
      files: [new File(["a"], "pagina1.jpg", { type: "image/jpeg" })]
    });

    expect(sentBody?.has("dateTaken")).toBe(false);
  });
});
