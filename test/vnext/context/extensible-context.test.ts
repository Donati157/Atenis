// test/vnext/context/extensible-context.test.ts
//
// Prova arquitetural: EducationalContext extensível pra domínios além
// de school (AP, language, interdisciplinary).

import { describe, it, expect } from "vitest"
import { educationalContextSchema } from "../../../lib/vnext/context"

describe("EducationalContext extensibilidade (Fase 2A.2 final)", () => {
  it("school (retro-compat) — subject + grade + schoolStage", () => {
    const ctx = {
      subject: "matematica",
      grade: "EM01",
      schoolStage: "high",
    }
    expect(educationalContextSchema.safeParse(ctx).success).toBe(true)
  })

  it("AP — subject + grade + framework=ap-ced", () => {
    const ctx = {
      subject: "ap-microeconomics",
      grade: "EM03",
      schoolStage: "high",
      framework: "ap-ced",
    }
    expect(educationalContextSchema.safeParse(ctx).success).toBe(true)
  })

  it("language — sem grade/schoolStage, com proficiencyLevel", () => {
    const ctx = {
      subject: "japanese-language",
      framework: "cefr",
      proficiencyLevel: "A1",
    }
    expect(educationalContextSchema.safeParse(ctx).success).toBe(true)
  })

  it("interdisciplinary — só subject, sem outros campos", () => {
    const ctx = { subject: "computational-ethics" }
    expect(educationalContextSchema.safeParse(ctx).success).toBe(true)
  })

  it("continua rejeitando subject vazio", () => {
    const ctx = { subject: "" }
    expect(educationalContextSchema.safeParse(ctx).success).toBe(false)
  })
})

describe("Question — grade agora opcional", () => {
  it("aceita Question sem grade nem schoolStage (language/AP domain)", async () => {
    const { questionSchema } = await import("../../../lib/vnext/questions/types")
    const q = {
      id: "q-jap-1",
      version: 1,
      status: "verified",
      question: "Como se diz 'olá' em japonês?",
      subject: "japanese-language",
      topic: "greetings",
      skill: "listening-basic",
      difficulty: "easy",
      cognitiveDepth: "remember",
      questionType: "diagnostic",
      usableInPhases: ["diagnose"],
      prerequisites: [],
      expectedAnswer: {
        kind: "short-answer",
        acceptedAnswers: ["konnichiwa", "こんにちは"],
        caseSensitive: false,
      },
      commonErrors: [],
      sourceId: null,
      framework: "jlpt",
      proficiencyLevel: "N5",
      createdAt: "2026-08-11T00:00:00.000Z",
    }
    const parsed = questionSchema.safeParse(q)
    if (!parsed.success) console.error(parsed.error.issues)
    expect(parsed.success).toBe(true)
  })
})
